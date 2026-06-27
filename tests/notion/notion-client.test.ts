import assert from 'node:assert/strict';
import { afterEach, suite, test } from 'node:test';

import { createNotionPage, readNotionDatabase } from '../../src/notion/notion-client.ts';
import type { NotionPagePayload } from '../../src/notion/notion-types.ts';

type FetchCall = {
	input: Parameters<typeof fetch>[0];
	init: RequestInit | undefined;
};

const originalFetch: typeof fetch = globalThis.fetch;

function expectSingleFetchCall(calls: FetchCall[]): FetchCall {
	assert.equal(calls.length, 1);
	return calls[0];
}

function expectFetchInit(init: RequestInit | undefined): RequestInit {
	if (init === undefined) {
		assert.fail('Expected fetch to receive request init');
	}

	return init;
}

async function expectRejectedError(promise: Promise<unknown>): Promise<Error> {
	let rejectedError: Error | undefined;

	await assert.rejects(promise, (error: unknown): boolean => {
		if (!(error instanceof Error)) {
			assert.fail('Expected rejection to be an Error');
		}

		rejectedError = error;
		return true;
	});

	if (rejectedError === undefined) {
		assert.fail('Expected rejection to be captured');
	}

	return rejectedError;
}

void suite('notion client', { concurrency: false }, () => {
	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	void test('readNotionDatabase sends the expected Notion database request', async () => {
		// Arrange

		const fetchCalls: FetchCall[] = [];
		const responseBody: Record<string, unknown> = { object: 'database', id: 'database-id' };
		globalThis.fetch = (input: Parameters<typeof fetch>[0], init?: RequestInit): Promise<Response> => {
			fetchCalls.push({ input, init });
			return Promise.resolve(Response.json(responseBody));
		};

		// Act

		const database: unknown = await readNotionDatabase('token', 'database-id');

		// Assert

		const call: FetchCall = expectSingleFetchCall(fetchCalls);
		const init: RequestInit = expectFetchInit(call.init);
		const headers: Headers = new Headers(init.headers);
		assert.equal(call.input, 'https://api.notion.com/v1/databases/database-id');
		assert.equal(init.body, undefined);
		assert.equal(headers.get('Authorization'), 'Bearer token');
		assert.equal(headers.get('Content-Type'), 'application/json');
		assert.equal(headers.get('Notion-Version'), '2022-06-28');
		assert.deepEqual(database, responseBody);
	});

	void test('createNotionPage sends the expected page creation request', async () => {
		// Arrange

		const fetchCalls: FetchCall[] = [];
		const payload: NotionPagePayload = {
			parent: { database_id: 'database-id' },
			properties: { Name: { title: [{ text: { content: 'Create a CLI.' } }] } },
			children: [],
		};
		globalThis.fetch = (input: Parameters<typeof fetch>[0], init?: RequestInit): Promise<Response> => {
			fetchCalls.push({ input, init });
			return Promise.resolve(Response.json({ object: 'page', id: 'page-id' }));
		};

		// Act

		const pageCreation: Promise<unknown> = createNotionPage('token', payload);
		const result: unknown = await pageCreation;

		// Assert

		const call: FetchCall = expectSingleFetchCall(fetchCalls);
		const init: RequestInit = expectFetchInit(call.init);
		const headers: Headers = new Headers(init.headers);
		assert.equal(call.input, 'https://api.notion.com/v1/pages');
		assert.equal(init.method, 'POST');
		if (typeof init.body !== 'string') {
			assert.fail('Expected page creation body to be a string');
		}
		assert.deepEqual(JSON.parse(init.body), payload);
		assert.equal(headers.get('Authorization'), 'Bearer token');
		assert.equal(headers.get('Content-Type'), 'application/json');
		assert.equal(headers.get('Notion-Version'), '2022-06-28');
		assert.equal(result, undefined);
	});

	void test('failed Notion responses include status and response body', async () => {
		// Arrange

		globalThis.fetch = (): Promise<Response> => {
			return Promise.resolve(new Response('bad request', { status: 400, statusText: 'Bad Request' }));
		};

		// Act

		const readNotionDatabasePromise: Promise<unknown> = readNotionDatabase('token', 'database-id');

		// Assert

		const error: Error = await expectRejectedError(readNotionDatabasePromise);
		assert.match(error.message, /400 Bad Request/);
		assert.match(error.message, /bad request/);
	});

	void test('failed Notion responses without a body omit the trailing body suffix', async () => {
		// Arrange

		globalThis.fetch = (): Promise<Response> => {
			return Promise.resolve(new Response('', { status: 500, statusText: 'Internal Server Error' }));
		};

		// Act

		const readNotionDatabasePromise: Promise<unknown> = readNotionDatabase('token', 'database-id');

		// Assert

		const error: Error = await expectRejectedError(readNotionDatabasePromise);
		assert.match(error.message, /500 Internal Server Error/);
		assert.doesNotMatch(error.message, /Internal Server Error:/);
	});

	void test('failed Notion responses still throw when the response body cannot be read', async () => {
		// Arrange

		const response: Response = new Response(
			new ReadableStream({
				start(controller): void {
					controller.error(new Error('body unavailable'));
				},
			}),
			{ status: 502, statusText: 'Bad Gateway' },
		);
		globalThis.fetch = (): Promise<Response> => {
			return Promise.resolve(response);
		};

		// Act

		const readNotionDatabasePromise: Promise<unknown> = readNotionDatabase('token', 'database-id');

		// Assert

		const error: Error = await expectRejectedError(readNotionDatabasePromise);
		assert.match(error.message, /502 Bad Gateway/);
		assert.doesNotMatch(error.message, /body unavailable/);
	});

	void test('successful Notion responses propagate JSON parse failures', async () => {
		// Arrange

		globalThis.fetch = (): Promise<Response> => {
			return Promise.resolve(new Response('not json'));
		};

		// Act

		const readNotionDatabasePromise: Promise<unknown> = readNotionDatabase('token', 'database-id');

		// Assert

		await assert.rejects(readNotionDatabasePromise, (error: unknown): boolean => {
			assert.equal(error instanceof SyntaxError, true);
			return true;
		});
	});

	void test('network errors propagate', async () => {
		// Arrange

		const networkError: Error = new Error('network down');
		globalThis.fetch = (): Promise<Response> => {
			return Promise.reject(networkError);
		};

		// Act & Assert

		await assert.rejects(
			(): Promise<unknown> => readNotionDatabase('token', 'database-id'),
			(error: unknown): boolean => {
				assert.ok(error instanceof Error);
				assert.equal(
					error === networkError || error.cause === networkError || error.message.includes('network down'),
					true,
				);
				return true;
			},
		);
	});
});
