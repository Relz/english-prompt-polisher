import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type Mock, suite, test } from 'node:test';

import {
	handlePromptRewrite,
	INTERNAL_PROMPT_MARKER,
	type Options,
	type PolisherResult,
	type PromptRewriteDependencies,
	type PromptRewriteResult,
} from '../../src/core.ts';
import { chatInput } from '../fixtures.ts';

const usableResult: PolisherResult = {
	needsProposal: true,
	detectedLanguage: 'Spanish',
	reason: 'Prompt is not English.',
	proposedPrompt: 'Correct this.',
};

void suite('handlePromptRewrite', () => {
	void test('checks the complete prompt without a mode and returns the proposal verbatim', async () => {
		// Arrange

		const input: ReturnType<typeof chatInput> = chatInput();
		const options: Options = { checker: { model: 'current' } };
		const prompt: string = '  \nCorrige esto\t  ';
		const proposedPrompt: string = '  Correct this.\n';
		const calls: Parameters<PromptRewriteDependencies['checkPrompt']>[] = [];

		// Act

		const result: PromptRewriteResult = await handlePromptRewrite(input, prompt, options, {
			checkPrompt: (...args): Promise<PolisherResult> => {
				calls.push(args);
				return Promise.resolve({ ...usableResult, proposedPrompt });
			},
		});

		// Assert

		assert.deepEqual(calls, [[input, options, prompt]]);
		assert.deepEqual(result, { status: 'rewritten', proposedPrompt });
	});

	const ineligiblePrompts: { name: string; prompt: string; options: Options }[] = [
		{ name: 'empty', prompt: '', options: {} },
		{ name: 'whitespace-only', prompt: '  \n\t ', options: {} },
		{ name: 'internal', prompt: `Corrige esto\n${INTERNAL_PROMPT_MARKER}`, options: {} },
		{ name: 'oversized', prompt: 'A😊e\u0301', options: { maxChars: 3 } },
		{ name: 'oversized including surrounding whitespace', prompt: ' A ', options: { maxChars: 1 } },
	];

	for (const { name, prompt, options } of ineligiblePrompts) {
		void test(`skips ${name} prompts without calling the checker`, async () => {
			const result: PromptRewriteResult = await handlePromptRewrite(chatInput(), prompt, options, {
				checkPrompt: (): Promise<PolisherResult> => assert.fail('Unexpected prompt check'),
			});

			assert.deepEqual(result, { status: 'skipped' });
		});
	}

	const eligiblePrompts: { name: string; prompt: string; options: Options }[] = [
		{ name: 'at the Unicode code point limit', prompt: 'A😊e\u0301', options: { maxChars: 4 } },
		{ name: 'without a default length limit', prompt: 'Corrige esto.\n'.repeat(1000), options: {} },
	];

	for (const { name, prompt, options } of eligiblePrompts) {
		void test(`checks the full prompt ${name}`, async () => {
			const checkedPrompts: string[] = [];
			const result: PromptRewriteResult = await handlePromptRewrite(chatInput(), prompt, options, {
				checkPrompt: (_input, _options, checkedPrompt): Promise<PolisherResult> => {
					checkedPrompts.push(checkedPrompt);
					return Promise.resolve(usableResult);
				},
			});

			assert.deepEqual(checkedPrompts, [prompt]);
			assert.deepEqual(result, { status: 'rewritten', proposedPrompt: usableResult.proposedPrompt });
		});
	}

	const originalPrompt: string = 'Corrige esto';
	const unusableResults: { name: string; overrides: Partial<PolisherResult> }[] = [
		{ name: 'no proposal needed', overrides: { needsProposal: false } },
		{ name: 'empty proposal', overrides: { proposedPrompt: '' } },
		{ name: 'whitespace-only proposal', overrides: { proposedPrompt: ' \n\t ' } },
		{ name: 'unchanged proposal', overrides: { proposedPrompt: originalPrompt } },
	];

	for (const { name, overrides } of unusableResults) {
		void test(`skips a checker result with ${name}`, async () => {
			const result: PromptRewriteResult = await handlePromptRewrite(
				chatInput(),
				originalPrompt,
				{},
				{
					checkPrompt: (): Promise<PolisherResult> => Promise.resolve({ ...usableResult, ...overrides }),
				},
			);

			assert.deepEqual(result, { status: 'skipped' });
		});
	}

	void test('propagates checker failures', async () => {
		const checkerError: Error = new Error('Checker failed');

		await assert.rejects(
			handlePromptRewrite(
				chatInput(),
				originalPrompt,
				{},
				{
					checkPrompt: (): Promise<PolisherResult> => Promise.reject(checkerError),
				},
			),
			(error: unknown): boolean =>
				error === checkerError || (error instanceof Error && error.cause === checkerError),
		);
	});

	void test('does not write configured Markdown or Notion outputs', async (t) => {
		// Arrange

		const directory: string = await mkdtemp(join(tmpdir(), 'english-prompt-polisher-rewrite-'));
		t.after(async () => {
			await rm(directory, { recursive: true, force: true });
		});
		const outputFile: string = join(directory, 'proposals.md');
		const fetchMock: Mock<typeof fetch> = t.mock.method(globalThis, 'fetch', (): Promise<Response> =>
			Promise.reject(new Error('Unexpected network request')),
		);
		const options: Options = {
			mode: 'rewrite',
			outputFile,
			notion: { enabled: true, token: 'test-token', databaseId: 'test-database' },
		};

		// Act

		const result: PromptRewriteResult = await handlePromptRewrite(chatInput(), originalPrompt, options, {
			checkPrompt: (): Promise<PolisherResult> => Promise.resolve(usableResult),
		});

		// Assert

		assert.deepEqual(result, { status: 'rewritten', proposedPrompt: usableResult.proposedPrompt });
		assert.equal(fetchMock.mock.callCount(), 0);
		await assert.rejects(readFile(outputFile, 'utf8'), { code: 'ENOENT' });
	});
});
