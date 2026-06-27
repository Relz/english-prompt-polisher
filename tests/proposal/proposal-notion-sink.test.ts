import assert from 'node:assert/strict';
import { afterEach, suite, test } from 'node:test';

import type { NotionConfig } from '../../src/notion/notion-config.ts';
import { proposalNotionSink } from '../../src/proposal/proposal-notion-sink.ts';
import type { ProposalSink } from '../../src/proposal/proposal-sink.ts';
import type { ProposalRecord } from '../../src/proposal/proposal-types.ts';

const record: ProposalRecord = {
	needsProposal: true,
	detectedLanguage: 'Spanish',
	reason: 'Prompt is not English.',
	originalPrompt: 'Crea una CLI.',
	proposedPrompt: 'Create a CLI.',
	conversationId: 'conversation_123',
	messageId: 'message_456',
	createdAt: '2026-06-13T12:00:00.000Z',
};

const originalFetch: typeof fetch = globalThis.fetch;

void suite('proposalNotionSink', { concurrency: false }, () => {
	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	void test('returns a skipped Notion sink when config is absent', async () => {
		// Arrange

		let fetchCalls: number = 0;
		globalThis.fetch = (): Promise<Response> => {
			fetchCalls += 1;
			return Promise.resolve(Response.json({}));
		};

		// Act

		const sink: ProposalSink = proposalNotionSink(record, undefined);
		const status: 'written' | 'skipped' = await sink.write();

		// Assert

		assert.equal(sink.sink, 'notion');
		assert.equal(status, 'skipped');
		assert.equal(fetchCalls, 0);
	});

	void test('does not call Notion until the configured sink is written', () => {
		// Arrange

		let fetchCalls: number = 0;
		const config: NotionConfig = { token: 'secret', databaseId: 'database-id' };
		globalThis.fetch = (): Promise<Response> => {
			fetchCalls += 1;
			return Promise.resolve(Response.json({}));
		};

		// Act

		proposalNotionSink(record, config);

		// Assert

		assert.equal(fetchCalls, 0);
	});

	void test('writes the proposal to Notion and returns written', async () => {
		// Arrange

		const fetchCalls: { input: Parameters<typeof fetch>[0]; init: RequestInit | undefined }[] = [];
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

			return Promise.resolve(Response.json({ object: 'page', id: 'page-id' }));
		};
		const sink: ProposalSink = proposalNotionSink(record, config);

		// Act

		const status: 'written' | 'skipped' = await sink.write();

		// Assert

		assert.equal(sink.sink, 'notion');
		assert.equal(status, 'written');
		assert.equal(fetchCalls.length, 2);
		assert.equal(fetchCalls[1].input, 'https://api.notion.com/v1/pages');
		assert.equal(fetchCalls[1].init?.method, 'POST');
	});

	void test('propagates Notion write failures', async () => {
		// Arrange

		const config: NotionConfig = { token: 'secret', databaseId: 'database-id' };
		const writeError: Error = new Error('network down');
		globalThis.fetch = (): Promise<Response> => {
			return Promise.reject(writeError);
		};
		const sink: ProposalSink = proposalNotionSink(record, config);

		// Act

		const writePromise: Promise<'written' | 'skipped'> = sink.write();

		// Assert

		await assert.rejects(writePromise, Error);
	});
});
