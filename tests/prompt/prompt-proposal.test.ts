import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { suite, test } from 'node:test';

import type { PolisherResult } from '../../src/checker/polisher-result.ts';
import {
	handlePromptProposal,
	type PromptProposalDependencies,
	type PromptProposalProposalOptions,
	type PromptProposalRewriteDependencies,
	type PromptProposalRewriteOptions,
	type PromptProposalResult,
} from '../../src/prompt/prompt-proposal.ts';
import type { ProposalOutputResult, ProposalOutputSinkResult } from '../../src/proposal/proposal-output.ts';
import type { ProposalRecord } from '../../src/proposal/proposal-types.ts';
import type { ChatMessageInput, ChatMessageOutput } from '../../src/shared/chat.ts';
import { INTERNAL_PROMPT_MARKER } from '../../src/shared/internal-prompt.ts';
import type { Options } from '../../src/shared/options.ts';
import { chatInput, chatOutput, textPart } from '../fixtures.ts';

type CheckPromptArgs = Parameters<NonNullable<PromptProposalDependencies['checkPrompt']>>;

type FetchCall = {
	input: Parameters<typeof fetch>[0];
	init: RequestInit | undefined;
};

type TestCleanup = {
	after: (fn: () => Promise<void> | void) => void;
};

const createdAt: string = '2026-06-13T12:00:00.000Z';

function polisherResult(overrides: Partial<PolisherResult> = {}): PolisherResult {
	return {
		needsProposal: true,
		detectedLanguage: 'Spanish',
		reason: 'Prompt is not English.',
		proposedPrompt: 'Correct this.',
		...overrides,
	};
}

function resultFor(result: ProposalOutputResult, sink: string): ProposalOutputSinkResult {
	const sinkResult: ProposalOutputSinkResult | undefined = result.find((item) => item.sink === sink);
	assert.ok(sinkResult);
	return sinkResult;
}

async function createOutputPath(t: TestCleanup, ...segments: string[]): Promise<string> {
	const directory: string = await mkdtemp(join(tmpdir(), 'english-prompt-polisher-'));
	t.after(async () => {
		await rm(directory, { recursive: true, force: true });
	});

	return join(directory, ...segments);
}

function mockNotionFetch(t: TestCleanup, onRequest?: (call: FetchCall) => void): FetchCall[] {
	const previousFetch: typeof globalThis.fetch = globalThis.fetch;
	const calls: FetchCall[] = [];
	globalThis.fetch = (input: Parameters<typeof fetch>[0], init?: RequestInit): Promise<Response> => {
		const call: FetchCall = { input, init };
		calls.push(call);
		onRequest?.(call);
		if (init?.method === 'POST') {
			return Promise.resolve(Response.json({ object: 'page', id: 'page_123' }));
		}

		return Promise.resolve(Response.json({ properties: { Name: { type: 'title' } } }));
	};
	t.after(() => {
		globalThis.fetch = previousFetch;
	});

	return calls;
}

void suite('handlePromptProposal', { concurrency: false }, () => {
	void test('skips without checking when output has no proposal candidate', async () => {
		// Arrange

		const input: ChatMessageInput = chatInput();
		const output: ChatMessageOutput = chatOutput([textPart('  \t  ')]);
		let checkPromptCalls: number = 0;
		let writeProposalCalls: number = 0;
		let logCalls: number = 0;
		let nowCalls: number = 0;
		const dependencies: PromptProposalDependencies = {
			checkPrompt: (): Promise<PolisherResult> => {
				checkPromptCalls += 1;
				return Promise.reject(new Error('Unexpected prompt check'));
			},
			writeProposal: (): Promise<ProposalOutputResult> => {
				writeProposalCalls += 1;
				return Promise.reject(new Error('Unexpected proposal write'));
			},
			log: (): Promise<void> => {
				logCalls += 1;
				return Promise.reject(new Error('Unexpected log write'));
			},
			now: (): Date => {
				nowCalls += 1;
				return new Date(createdAt);
			},
		};

		// Act

		const result: PromptProposalResult = await handlePromptProposal(input, output, {}, dependencies);

		// Assert

		assert.deepEqual(result, { status: 'skipped' });
		assert.equal(checkPromptCalls, 0);
		assert.equal(writeProposalCalls, 0);
		assert.equal(logCalls, 0);
		assert.equal(nowCalls, 0);
	});

	void test('skips without checking when output contains the internal prompt marker', async () => {
		// Arrange

		const input: ChatMessageInput = chatInput();
		const output: ChatMessageOutput = chatOutput([textPart(`Corrige esto\n\n${INTERNAL_PROMPT_MARKER}`)]);
		let checkPromptCalls: number = 0;
		let writeProposalCalls: number = 0;
		let logCalls: number = 0;
		let nowCalls: number = 0;
		const dependencies: PromptProposalDependencies = {
			checkPrompt: (): Promise<PolisherResult> => {
				checkPromptCalls += 1;
				return Promise.reject(new Error('Unexpected prompt check'));
			},
			writeProposal: (): Promise<ProposalOutputResult> => {
				writeProposalCalls += 1;
				return Promise.reject(new Error('Unexpected proposal write'));
			},
			log: (): Promise<void> => {
				logCalls += 1;
				return Promise.reject(new Error('Unexpected log write'));
			},
			now: (): Date => {
				nowCalls += 1;
				return new Date(createdAt);
			},
		};

		// Act

		const result: PromptProposalResult = await handlePromptProposal(input, output, {}, dependencies);

		// Assert

		assert.deepEqual(result, { status: 'skipped' });
		assert.equal(checkPromptCalls, 0);
		assert.equal(writeProposalCalls, 0);
		assert.equal(logCalls, 0);
		assert.equal(nowCalls, 0);
	});

	void test('checks the extracted prompt with the provided input and options', async () => {
		// Arrange

		const input: ChatMessageInput = chatInput();
		const output: ChatMessageOutput = chatOutput([textPart('Corrige esto')]);
		const options: PromptProposalProposalOptions = { maxChars: 100, includeOriginal: true };
		let checkPromptArgs: CheckPromptArgs | undefined;
		const dependencies: PromptProposalDependencies = {
			checkPrompt: (...args): Promise<PolisherResult> => {
				checkPromptArgs = args;
				return Promise.resolve(polisherResult());
			},
			writeProposal: (): Promise<ProposalOutputResult> => Promise.resolve([]),
			log: (): Promise<void> => Promise.resolve(),
			now: (): Date => new Date(createdAt),
		};

		// Act

		await handlePromptProposal(input, output, options, dependencies);

		// Assert

		assert.ok(checkPromptArgs);
		assert.equal(checkPromptArgs[0], input);
		assert.equal(checkPromptArgs[1], options);
		assert.equal(checkPromptArgs[2], 'Corrige esto');
	});

	void test('skips when the checker result should not create a record', async () => {
		// Arrange

		const input: ChatMessageInput = chatInput();
		const output: ChatMessageOutput = chatOutput([textPart('Corrige esto')]);
		let writeProposalCalls: number = 0;
		let logCalls: number = 0;
		let nowCalls: number = 0;
		const dependencies: PromptProposalDependencies = {
			checkPrompt: (): Promise<PolisherResult> => Promise.resolve(polisherResult({ needsProposal: false })),
			writeProposal: (): Promise<ProposalOutputResult> => {
				writeProposalCalls += 1;
				return Promise.resolve([]);
			},
			log: (): Promise<void> => {
				logCalls += 1;
				return Promise.resolve();
			},
			now: (): Date => {
				nowCalls += 1;
				return new Date(createdAt);
			},
		};

		// Act

		const result: PromptProposalResult = await handlePromptProposal(input, output, {}, dependencies);

		// Assert

		assert.deepEqual(result, { status: 'skipped' });
		assert.equal(writeProposalCalls, 0);
		assert.equal(logCalls, 0);
		assert.equal(nowCalls, 0);
	});

	void test('writes, returns, and logs a changed proposal', async () => {
		// Arrange

		const input: ChatMessageInput = chatInput();
		const output: ChatMessageOutput = chatOutput([textPart('Corrige esto')]);
		const options: PromptProposalProposalOptions = { outputFile: 'proposal.jsonl', includeOriginal: true };
		const checkResult: PolisherResult = polisherResult();
		const outputResult: ProposalOutputResult = [
			{ sink: 'file', status: 'written', message: 'Wrote English prompt proposal file' },
		];
		const expectedRecord: ProposalRecord = {
			...checkResult,
			originalPrompt: 'Corrige esto',
			conversationId: input.conversationId,
			messageId: input.messageId,
			createdAt,
		};
		const calls: string[] = [];
		let writtenRecord: ProposalRecord | undefined;
		let writtenOptions: Options | undefined;
		const dependencies: PromptProposalDependencies = {
			checkPrompt: (): Promise<PolisherResult> => {
				calls.push('checkPrompt');
				return Promise.resolve(checkResult);
			},
			writeProposal: (record, writeOptions): Promise<ProposalOutputResult> => {
				calls.push('writeProposal');
				writtenRecord = record;
				writtenOptions = writeOptions;
				return Promise.resolve(outputResult);
			},
			log: (): Promise<void> => {
				calls.push('log');
				return Promise.resolve();
			},
			now: (): Date => new Date(createdAt),
		};

		// Act

		const result: PromptProposalResult = await handlePromptProposal(input, output, options, dependencies);

		// Assert

		if (result.status !== 'created') {
			assert.fail('Expected a created proposal result');
		}
		assert.deepEqual(result.record, expectedRecord);
		assert.deepEqual(result.output, outputResult);
		assert.deepEqual(writtenRecord, expectedRecord);
		assert.deepEqual(writtenOptions, options);
		assert.deepEqual(calls, ['checkPrompt', 'writeProposal', 'log']);
	});

	void test('rewrites, writes, returns, and logs a changed proposal in rewrite mode', async () => {
		// Arrange

		const input: ChatMessageInput = chatInput();
		const output: ChatMessageOutput = chatOutput([textPart('Corrige esto')]);
		const options: PromptProposalRewriteOptions = {
			mode: 'rewrite',
			outputFile: 'proposal.jsonl',
			includeOriginal: true,
		};
		const checkResult: PolisherResult = polisherResult();
		const outputResult: ProposalOutputResult = [
			{ sink: 'file', status: 'written', message: 'Wrote English prompt proposal file' },
		];
		const expectedRecord: ProposalRecord = {
			...checkResult,
			originalPrompt: 'Corrige esto',
			conversationId: input.conversationId,
			messageId: input.messageId,
			createdAt,
		};
		const calls: string[] = [];
		let rewrittenRecord: ProposalRecord | undefined;
		let rewrittenInput: ChatMessageInput | undefined;
		let rewrittenOutput: ChatMessageOutput | undefined;
		let writtenRecord: ProposalRecord | undefined;
		let writtenOptions: Options | undefined;
		const dependencies: PromptProposalRewriteDependencies = {
			checkPrompt: (): Promise<PolisherResult> => {
				calls.push('checkPrompt');
				return Promise.resolve(checkResult);
			},
			rewritePrompt: (record, rewriteInput, rewriteOutput): Promise<void> => {
				calls.push('rewritePrompt');
				rewrittenRecord = record;
				rewrittenInput = rewriteInput;
				rewrittenOutput = rewriteOutput;
				return Promise.resolve();
			},
			writeProposal: (record, writeOptions): Promise<ProposalOutputResult> => {
				calls.push('writeProposal');
				writtenRecord = record;
				writtenOptions = writeOptions;
				return Promise.resolve(outputResult);
			},
			log: (): Promise<void> => {
				calls.push('log');
				return Promise.resolve();
			},
			now: (): Date => new Date(createdAt),
		};

		// Act

		const result: PromptProposalResult = await handlePromptProposal(input, output, options, dependencies);

		// Assert

		if (result.status !== 'created') {
			assert.fail('Expected a created proposal result');
		}
		assert.deepEqual(result.record, expectedRecord);
		assert.deepEqual(result.output, outputResult);
		assert.deepEqual(rewrittenRecord, expectedRecord);
		assert.equal(rewrittenInput, input);
		assert.equal(rewrittenOutput, output);
		assert.deepEqual(writtenRecord, expectedRecord);
		assert.deepEqual(writtenOptions, options);
		assert.deepEqual(calls, ['checkPrompt', 'rewritePrompt', 'writeProposal', 'log']);
	});

	void test('rewrites and writes configured file and Notion outputs in rewrite mode', async (t) => {
		// Arrange

		const input: ChatMessageInput = chatInput();
		const output: ChatMessageOutput = chatOutput([textPart('Corrige esto')]);
		const outputFile: string = await createOutputPath(t, 'proposals.md');
		const calls: string[] = [];
		const fetchCalls: FetchCall[] = mockNotionFetch(t, (call) => {
			if (call.init?.method === 'POST') {
				calls.push('writeNotion');
			}
		});
		let rewrittenRecord: ProposalRecord | undefined;
		const dependencies: PromptProposalRewriteDependencies = {
			checkPrompt: (): Promise<PolisherResult> => Promise.resolve(polisherResult()),
			rewritePrompt: (record): Promise<void> => {
				calls.push('rewritePrompt');
				rewrittenRecord = record;
				return Promise.resolve();
			},
			log: (): Promise<void> => Promise.resolve(),
			now: (): Date => new Date(createdAt),
		};

		// Act

		const result: PromptProposalResult = await handlePromptProposal(
			input,
			output,
			{
				mode: 'rewrite',
				outputFile,
				notion: { enabled: true, token: 'secret', databaseId: 'database' },
			},
			dependencies,
		);

		// Assert

		if (result.status !== 'created') {
			assert.fail('Expected a created proposal result');
		}
		assert.deepEqual(rewrittenRecord, result.record);
		assert.equal(calls.indexOf('rewritePrompt') < calls.indexOf('writeNotion'), true);
		assert.equal(resultFor(result.output, 'file').status, 'written');
		assert.equal(resultFor(result.output, 'notion').status, 'written');
		assert.equal(
			fetchCalls.some((call): boolean => call.init?.method === 'POST'),
			true,
		);
		const contents: string = await readFile(outputFile, 'utf8');
		assert.equal(contents.includes(result.record.proposedPrompt), true);
	});

	void test('does not rewrite in proposal mode', async () => {
		// Arrange

		const input: ChatMessageInput = chatInput();
		const output: ChatMessageOutput = chatOutput([textPart('Corrige esto')]);
		let rewritePromptCalls: number = 0;
		const dependencies: PromptProposalDependencies = {
			checkPrompt: (): Promise<PolisherResult> => Promise.resolve(polisherResult()),
			rewritePrompt: (): Promise<void> => {
				rewritePromptCalls += 1;
				return Promise.reject(new Error('Unexpected rewrite'));
			},
			writeProposal: (): Promise<ProposalOutputResult> => Promise.resolve([]),
			log: (): Promise<void> => Promise.resolve(),
			now: (): Date => new Date(createdAt),
		};

		// Act

		await handlePromptProposal(input, output, { mode: 'proposal' }, dependencies);

		// Assert

		assert.equal(rewritePromptCalls, 0);
	});

	void test('requires a rewrite dependency in rewrite mode at compile time', () => {
		// Arrange

		const input: ChatMessageInput = chatInput();
		const output: ChatMessageOutput = chatOutput([textPart('Corrige esto')]);
		const dependencies: PromptProposalDependencies = {
			checkPrompt: (): Promise<PolisherResult> => Promise.resolve(polisherResult()),
			writeProposal: (): Promise<ProposalOutputResult> => Promise.resolve([]),
			log: (): Promise<void> => Promise.resolve(),
			now: (): Date => new Date(createdAt),
		};

		// Assert

		if (process.env.NODE_ENV === 'english-prompt-polisher-typecheck') {
			// @ts-expect-error rewrite mode requires rewritePrompt
			void handlePromptProposal(input, output, { mode: 'rewrite' }, dependencies);
		}
	});

	void test('propagates checker failures without writing or logging', async () => {
		// Arrange

		const input: ChatMessageInput = chatInput();
		const output: ChatMessageOutput = chatOutput([textPart('Corrige esto')]);
		let writeProposalCalls: number = 0;
		let logCalls: number = 0;
		let nowCalls: number = 0;
		const checkerError: Error = new Error('Checker exploded');
		const dependencies: PromptProposalDependencies = {
			checkPrompt: (): Promise<PolisherResult> => Promise.reject(checkerError),
			writeProposal: (): Promise<ProposalOutputResult> => {
				writeProposalCalls += 1;
				return Promise.resolve([]);
			},
			log: (): Promise<void> => {
				logCalls += 1;
				return Promise.resolve();
			},
			now: (): Date => {
				nowCalls += 1;
				return new Date(createdAt);
			},
		};

		// Act and Assert

		await assert.rejects(
			async () => {
				await handlePromptProposal(input, output, {}, dependencies);
			},
			(error: unknown): boolean =>
				error === checkerError || (error instanceof Error && error.cause === checkerError),
		);
		assert.equal(writeProposalCalls, 0);
		assert.equal(logCalls, 0);
		assert.equal(nowCalls, 0);
	});

	void test('propagates writer failures without logging', async () => {
		// Arrange

		const input: ChatMessageInput = chatInput();
		const output: ChatMessageOutput = chatOutput([textPart('Corrige esto')]);
		let logCalls: number = 0;
		const writerError: Error = new Error('Writer exploded');
		const dependencies: PromptProposalDependencies = {
			checkPrompt: (): Promise<PolisherResult> => Promise.resolve(polisherResult()),
			writeProposal: (): Promise<ProposalOutputResult> => Promise.reject(writerError),
			log: (): Promise<void> => {
				logCalls += 1;
				return Promise.resolve();
			},
			now: (): Date => new Date(createdAt),
		};

		// Act and Assert

		await assert.rejects(
			async () => {
				await handlePromptProposal(input, output, {}, dependencies);
			},
			(error: unknown): boolean =>
				error === writerError || (error instanceof Error && error.cause === writerError),
		);
		assert.equal(logCalls, 0);
	});

	void test('propagates log failures after writing the proposal', async () => {
		// Arrange

		const input: ChatMessageInput = chatInput();
		const output: ChatMessageOutput = chatOutput([textPart('Corrige esto')]);
		let writeProposalCalls: number = 0;
		const logError: Error = new Error('Log exploded');
		const dependencies: PromptProposalDependencies = {
			checkPrompt: (): Promise<PolisherResult> => Promise.resolve(polisherResult()),
			writeProposal: (): Promise<ProposalOutputResult> => {
				writeProposalCalls += 1;
				return Promise.resolve([
					{ sink: 'file', status: 'written', message: 'Wrote English prompt proposal file' },
				]);
			},
			log: (): Promise<void> => Promise.reject(logError),
			now: (): Date => new Date(createdAt),
		};

		// Act and Assert

		await assert.rejects(
			async () => {
				await handlePromptProposal(input, output, {}, dependencies);
			},
			(error: unknown): boolean => error === logError || (error instanceof Error && error.cause === logError),
		);
		assert.equal(writeProposalCalls, 1);
	});
});
