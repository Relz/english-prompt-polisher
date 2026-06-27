import assert from 'node:assert/strict';
import { afterEach, suite, test } from 'node:test';

import type { NotionConfig } from '../../src/notion/notion-config.ts';
import { buildNotionProposalChildren } from '../../src/notion/notion-proposal-children.ts';
import { buildNotionProposalPagePayload, writeNotionProposal } from '../../src/notion/notion-proposal.ts';
import type { NotionDatabaseProperties, NotionPagePayload } from '../../src/notion/notion-types.ts';
import type { ProposalRecord } from '../../src/proposal/proposal-types.ts';

type FetchCall = {
	input: Parameters<typeof fetch>[0];
	init: RequestInit | undefined;
};

const record: ProposalRecord = {
	needsProposal: true,
	detectedLanguage: 'Russian',
	reason: 'Prompt is written in Russian.',
	originalPrompt: 'Создай CLI.',
	proposedPrompt: 'Create a CLI.',
	conversationId: 'conversation_123',
	messageId: 'message_456',
	createdAt: '2026-06-13T12:00:00.000Z',
};
const originalFetch: typeof fetch = globalThis.fetch;

function expectFetchInit(init: RequestInit | undefined): RequestInit {
	if (init === undefined) {
		assert.fail('Expected fetch to receive request init');
	}

	return init;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function expectRecord(value: unknown, message: string): Record<string, unknown> {
	if (!isRecord(value)) {
		assert.fail(message);
	}

	return value;
}

function expectPropertyNames(properties: Record<string, unknown>, names: string[]): void {
	assert.deepEqual(new Set(Object.keys(properties)), new Set(names));
}

void suite('notion proposal', () => {
	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	void test('maps configured database and title property without leaking the token', () => {
		// Arrange

		const config: NotionConfig = { token: 'secret', databaseId: 'database', titleProperty: 'Prompt' };
		const properties: NotionDatabaseProperties = { Name: { type: 'title' } };

		// Act

		const payload: NotionPagePayload = buildNotionProposalPagePayload(record, config, properties);

		// Assert

		assert.deepEqual(payload.parent, { database_id: 'database' });
		expectPropertyNames(payload.properties, ['Prompt']);
		assert.equal(JSON.stringify(payload).includes(config.token), false);
	});

	void test('uses discovered title property when config title property is absent', () => {
		// Arrange

		const config: NotionConfig = { token: 'secret', databaseId: 'database' };
		const properties: NotionDatabaseProperties = {
			Prompt: { type: 'title' },
			Name: { type: 'rich_text' },
		};

		// Act

		const payload: NotionPagePayload = buildNotionProposalPagePayload(record, config, properties);

		// Assert

		assert.deepEqual(payload.parent, { database_id: 'database' });
		expectPropertyNames(payload.properties, ['Prompt']);
	});

	void test('reads database properties and writes the composed proposal payload', async () => {
		// Arrange

		const fetchCalls: FetchCall[] = [];
		const config: NotionConfig = { token: 'secret', databaseId: 'database-id', titleProperty: 'Prompt' };
		globalThis.fetch = (input: Parameters<typeof fetch>[0], init?: RequestInit): Promise<Response> => {
			fetchCalls.push({ input, init });

			if (input === 'https://api.notion.com/v1/databases/database-id') {
				return Promise.resolve(
					Response.json({
						object: 'database',
						properties: {
							Prompt: { type: 'title' },
							'Detected Language': { type: 'rich_text' },
							'Conversation ID': { type: 'rich_text' },
							'Created At': { type: 'date' },
						},
					}),
				);
			}

			return Promise.resolve(Response.json({ object: 'page', id: 'page-id' }));
		};

		// Act

		await writeNotionProposal(record, config);

		// Assert

		assert.equal(fetchCalls.length, 2);
		assert.equal(fetchCalls[0].input, 'https://api.notion.com/v1/databases/database-id');
		assert.equal(fetchCalls[1].input, 'https://api.notion.com/v1/pages');

		const readHeaders: Headers = new Headers(fetchCalls[0].init?.headers);
		assert.equal(readHeaders.get('Authorization'), 'Bearer secret');

		const createInit: RequestInit = expectFetchInit(fetchCalls[1].init);
		const createHeaders: Headers = new Headers(createInit.headers);
		assert.equal(createInit.method, 'POST');
		assert.equal(createHeaders.get('Authorization'), 'Bearer secret');
		if (typeof createInit.body !== 'string') {
			assert.fail('Expected page creation body to be a string');
		}
		const body: Record<string, unknown> = expectRecord(
			JSON.parse(createInit.body),
			'Expected page creation body to parse to an object',
		);
		const bodyProperties: Record<string, unknown> = expectRecord(
			body.properties,
			'Expected page creation body properties to be an object',
		);
		assert.deepEqual(body.parent, { database_id: 'database-id' });
		expectPropertyNames(bodyProperties, ['Prompt', 'Detected Language', 'Conversation ID', 'Created At']);
		assert.deepEqual(body.children, buildNotionProposalChildren(record));
	});

	void test('does not create a page when database property lookup fails', async () => {
		// Arrange

		const fetchCalls: FetchCall[] = [];
		const config: NotionConfig = { token: 'secret', databaseId: 'database-id' };
		globalThis.fetch = (input: Parameters<typeof fetch>[0], init?: RequestInit): Promise<Response> => {
			fetchCalls.push({ input, init });
			return Promise.resolve(new Response('bad request', { status: 400, statusText: 'Bad Request' }));
		};

		// Act

		const writePromise: Promise<void> = writeNotionProposal(record, config);

		// Assert

		await assert.rejects(writePromise);
		assert.equal(fetchCalls.length, 1);
		assert.equal(fetchCalls[0].input, 'https://api.notion.com/v1/databases/database-id');
	});

	void test('propagates page creation failures after reading database properties', async () => {
		// Arrange

		const fetchCalls: FetchCall[] = [];
		const config: NotionConfig = { token: 'secret', databaseId: 'database-id' };
		globalThis.fetch = (input: Parameters<typeof fetch>[0], init?: RequestInit): Promise<Response> => {
			fetchCalls.push({ input, init });

			if (input === 'https://api.notion.com/v1/databases/database-id') {
				return Promise.resolve(
					Response.json({
						object: 'database',
						properties: { Name: { type: 'title' } },
					}),
				);
			}

			return Promise.resolve(
				new Response('invalid payload', { status: 422, statusText: 'Unprocessable Entity' }),
			);
		};

		// Act

		const writePromise: Promise<void> = writeNotionProposal(record, config);

		// Assert

		await assert.rejects(writePromise);
		assert.equal(fetchCalls.length, 2);
		assert.equal(fetchCalls[0].input, 'https://api.notion.com/v1/databases/database-id');
		assert.equal(fetchCalls[1].input, 'https://api.notion.com/v1/pages');
	});
});
