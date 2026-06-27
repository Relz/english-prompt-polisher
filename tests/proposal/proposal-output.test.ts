import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { suite, test } from 'node:test';

import {
	writeProposal,
	type ProposalOutputResult,
	type ProposalOutputSinkResult,
} from '../../src/proposal/proposal-output.ts';
import type { ProposalRecord } from '../../src/proposal/proposal-types.ts';

type TestCleanup = {
	after: (fn: () => Promise<void> | void) => void;
};

type FetchMock = (input: Parameters<typeof fetch>[0], init?: RequestInit) => Promise<Response>;

type WrittenProposalOutputSinkResult = Extract<ProposalOutputSinkResult, { status: 'written' }>;
type FailedProposalOutputSinkResult = Extract<ProposalOutputSinkResult, { status: 'failed' }>;

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

function resultFor(result: ProposalOutputResult, sink: string): ProposalOutputSinkResult {
	const sinkResult: ProposalOutputSinkResult | undefined = result.find((item) => item.sink === sink);
	assert.ok(sinkResult);
	return sinkResult;
}

function outputSinks(result: ProposalOutputResult): {
	file: ProposalOutputSinkResult;
	notion: ProposalOutputSinkResult;
} {
	return { file: resultFor(result, 'file'), notion: resultFor(result, 'notion') };
}

function assertWritten(result: ProposalOutputSinkResult): asserts result is WrittenProposalOutputSinkResult {
	if (result.status !== 'written') {
		assert.fail(`Expected ${result.sink} output to be written`);
	}
}

function assertFailed(result: ProposalOutputSinkResult): asserts result is FailedProposalOutputSinkResult {
	if (result.status !== 'failed') {
		assert.fail(`Expected ${result.sink} output to fail`);
	}
}

function assertSkipped(result: ProposalOutputSinkResult): void {
	assert.equal(result.status, 'skipped');
}

async function createOutputPath(t: TestCleanup, ...segments: string[]): Promise<string> {
	const directory: string = await mkdtemp(join(tmpdir(), 'english-prompt-polisher-'));
	t.after(async () => {
		await rm(directory, { recursive: true, force: true });
	});

	return join(directory, ...segments);
}

function mockFetch(t: TestCleanup, implementation: FetchMock): void {
	const previousFetch: typeof globalThis.fetch = globalThis.fetch;
	globalThis.fetch = implementation;
	t.after(() => {
		globalThis.fetch = previousFetch;
	});
}

function mockNotionFetch(
	t: TestCleanup,
	pageResponse: () => Promise<Response> = () => Promise.resolve(Response.json({ object: 'page', id: 'page_123' })),
): (RequestInit | undefined)[] {
	const requests: (RequestInit | undefined)[] = [];
	mockFetch(t, (_input: Parameters<typeof fetch>[0], init?: RequestInit): Promise<Response> => {
		requests.push(init);
		if (init?.method === 'POST') {
			return pageResponse();
		}
		return Promise.resolve(Response.json({ properties: { Name: { type: 'title' } } }));
	});

	return requests;
}

void suite('writeProposal', { concurrency: false }, () => {
	void test('writes to the resolved file target and skips Notion when disabled', async (t) => {
		// Arrange

		const outputFile: string = await createOutputPath(t, 'proposals.md');
		let requestCount: number = 0;

		mockFetch(t, (): Promise<Response> => {
			requestCount += 1;
			return Promise.resolve(Response.json({}));
		});

		// Act

		const result: ProposalOutputResult = await writeProposal(record, { outputFile, includeOriginal: false });

		// Assert

		const { file, notion } = outputSinks(result);

		assertWritten(file);
		assertSkipped(notion);
		assert.equal(requestCount, 0);
		const contents: string = await readFile(outputFile, 'utf8');
		assert.equal(contents.includes(record.originalPrompt), false);
		assert.equal(contents.includes(record.proposedPrompt), true);
	});

	void test('throws when Notion is enabled and config cannot be resolved', async (t) => {
		// Arrange

		const outputFile: string = await createOutputPath(t, 'proposals.md');
		let requestCount: number = 0;

		mockFetch(t, (): Promise<Response> => {
			requestCount += 1;
			return Promise.resolve(Response.json({}));
		});

		// Act

		const writeProposalPromise: Promise<ProposalOutputResult> = writeProposal(record, {
			outputFile,
			notion: { enabled: true, databaseId: 'database' },
		});

		// Assert

		await assert.rejects(writeProposalPromise, Error);
		assert.equal(requestCount, 0);
		await assert.rejects(readFile(outputFile, 'utf8'), { code: 'ENOENT' });
	});

	void test('includes the original prompt by default', async (t) => {
		// Arrange

		const outputFile: string = await createOutputPath(t, 'proposals.md');

		// Act

		const result: ProposalOutputResult = await writeProposal(record, { outputFile });

		// Assert

		const { file, notion } = outputSinks(result);
		assertWritten(file);
		assertSkipped(notion);
		const contents: string = await readFile(outputFile, 'utf8');
		assert.equal(contents.includes(record.originalPrompt), true);
	});

	void test('writes to file and Notion when Notion is configured', async (t) => {
		// Arrange

		const outputFile: string = await createOutputPath(t, 'proposals.md');
		const requests: (RequestInit | undefined)[] = mockNotionFetch(t);

		// Act

		const result: ProposalOutputResult = await writeProposal(record, {
			outputFile,
			notion: { enabled: true, token: 'secret', databaseId: 'database' },
		});

		// Assert

		const { file, notion } = outputSinks(result);

		assertWritten(file);
		assertWritten(notion);
		assert.equal(
			requests.some((request): boolean => request?.method === 'POST'),
			true,
		);
	});

	void test('reports Notion failure without losing the file write result', async (t) => {
		// Arrange

		const outputFile: string = await createOutputPath(t, 'proposals.md');

		mockNotionFetch(t, () =>
			Promise.resolve(new Response('Notion exploded', { status: 500, statusText: 'Server Error' })),
		);

		// Act

		const result: ProposalOutputResult = await writeProposal(record, {
			outputFile,
			notion: { enabled: true, token: 'secret', databaseId: 'database' },
		});

		// Assert

		const { file, notion } = outputSinks(result);

		assertWritten(file);
		assertFailed(notion);
		assert.ok(notion.error instanceof Error);
	});

	void test('reports file write failure instead of rejecting', async (t) => {
		// Arrange

		const outputFile: string = await createOutputPath(t, 'missing', 'proposals.md');

		// Act

		const result: ProposalOutputResult = await writeProposal(record, { outputFile });

		// Assert

		const { file, notion } = outputSinks(result);

		assertFailed(file);
		assert.ok(file.error instanceof Error);
		assertSkipped(notion);
	});

	void test('reports file failure while still writing configured Notion output', async (t) => {
		// Arrange

		const outputFile: string = await createOutputPath(t, 'missing', 'proposals.md');
		const requests: (RequestInit | undefined)[] = mockNotionFetch(t);

		// Act

		const result: ProposalOutputResult = await writeProposal(record, {
			outputFile,
			notion: { enabled: true, token: 'secret', databaseId: 'database' },
		});

		// Assert

		const { file, notion } = outputSinks(result);

		assertFailed(file);
		assert.ok(file.error instanceof Error);
		assertWritten(notion);
		assert.equal(
			requests.some((request): boolean => request?.method === 'POST'),
			true,
		);
	});
});
