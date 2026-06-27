import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { suite, test } from 'node:test';

import type { ProposalSink } from '../../src/proposal/proposal-sink.ts';
import { createProposalSinks } from '../../src/proposal/proposal-sinks.ts';
import type { ProposalOutputTargets } from '../../src/proposal/proposal-targets.ts';
import type { ProposalRecord } from '../../src/proposal/proposal-types.ts';

type TestCleanup = {
	after: (fn: () => Promise<void> | void) => void;
};

type FetchCall = {
	input: Parameters<typeof fetch>[0];
	init: RequestInit | undefined;
};

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

function sinkFor(sinks: ProposalSink[], sinkName: string): ProposalSink {
	const sink: ProposalSink | undefined = sinks.find((item: ProposalSink): boolean => item.sink === sinkName);
	if (!sink) {
		assert.fail(`Expected ${sinkName} sink to be registered`);
	}
	return sink;
}

async function createOutputPath(t: TestCleanup, ...segments: string[]): Promise<string> {
	const directory: string = await mkdtemp(join(tmpdir(), 'english-prompt-polisher-'));
	t.after(async () => {
		await rm(directory, { recursive: true, force: true });
	});

	return join(directory, ...segments);
}

function mockFetch(t: TestCleanup, implementation: typeof fetch): void {
	const previousFetch: typeof globalThis.fetch = globalThis.fetch;
	globalThis.fetch = implementation;
	t.after(() => {
		globalThis.fetch = previousFetch;
	});
}

void suite('createProposalSinks', () => {
	void test('builds the registered output sinks', () => {
		// Arrange

		const targets: ProposalOutputTargets = {
			file: { outputFile: '/tmp/proposals.md', includeOriginal: true },
		};

		// Act

		const sinks: ProposalSink[] = createProposalSinks(record, targets);

		// Assert

		assert.equal(sinks.length, 2);
		assert.deepEqual(new Set(sinks.map((sink) => sink.sink)), new Set(['file', 'notion']));
	});

	void test('does not execute output sinks while creating them', async (t) => {
		// Arrange

		const outputFile: string = await createOutputPath(t, 'proposals.md');
		const fetchCalls: FetchCall[] = [];
		const targets: ProposalOutputTargets = {
			file: { outputFile, includeOriginal: true },
			notion: { token: 'secret', databaseId: 'database-id' },
		};

		mockFetch(t, (input: Parameters<typeof fetch>[0], init?: RequestInit): Promise<Response> => {
			fetchCalls.push({ input, init });
			return Promise.resolve(Response.json({}));
		});

		// Act

		createProposalSinks(record, targets);

		// Assert

		assert.deepEqual(fetchCalls, []);
		await assert.rejects(readFile(outputFile, 'utf8'), { code: 'ENOENT' });
	});

	void test('returns a skipped Notion sink when the Notion target is absent', async (t) => {
		// Arrange

		const fetchCalls: FetchCall[] = [];
		const targets: ProposalOutputTargets = {
			file: { outputFile: '/tmp/proposals.md', includeOriginal: true },
		};

		mockFetch(t, (input: Parameters<typeof fetch>[0], init?: RequestInit): Promise<Response> => {
			fetchCalls.push({ input, init });
			return Promise.resolve(Response.json({}));
		});

		// Act

		const sinks: ProposalSink[] = createProposalSinks(record, targets);
		const notionSink: ProposalSink = sinkFor(sinks, 'notion');
		const status: 'written' | 'skipped' = await notionSink.write();

		// Assert

		assert.equal(status, 'skipped');
		assert.deepEqual(fetchCalls, []);
	});

	void test('passes the file target to the file sink', async (t) => {
		// Arrange

		const outputFile: string = await createOutputPath(t, 'proposals.md');
		const targets: ProposalOutputTargets = {
			file: { outputFile, includeOriginal: false },
		};

		// Act

		const sinks: ProposalSink[] = createProposalSinks(record, targets);
		const fileSink: ProposalSink = sinkFor(sinks, 'file');
		const status: 'written' | 'skipped' = await fileSink.write();

		// Assert

		assert.equal(status, 'written');
		const contents: string = await readFile(outputFile, 'utf8');
		assert.equal(contents.includes(record.proposedPrompt), true);
		assert.equal(contents.includes(record.originalPrompt), false);
	});
});
