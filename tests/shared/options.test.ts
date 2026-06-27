import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

import {
	chatModelStringOption,
	normalizeCheckerOptions,
	normalizeNotionOptions,
	normalizeOptions,
	promptHandlingModeOption,
	resolveCheckerModel,
	type ChatModel,
	type NormalizedOptions,
} from '../../src/core.ts';

void suite('shared option helpers', () => {
	void test('normalizes core options and applies defaults', () => {
		// Arrange

		const rawOptions: Record<string, unknown> = {
			mode: 'rewrite',
			outputFile: '~/polished-prompts.md',
			maxChars: 1200,
			includeOriginal: false,
			checker: { model: 'openrouter/openai/gpt-4.1' },
			notion: {
				enabled: true,
				token: 'notion_secret',
				databaseId: 'db_123',
				titleProperty: 'Prompt',
			},
		};

		// Act

		const options: NormalizedOptions = normalizeOptions(rawOptions, { outputFile: '~/default.md' });

		// Assert

		assert.deepEqual(options, {
			mode: 'rewrite',
			outputFile: '~/polished-prompts.md',
			maxChars: 1200,
			includeOriginal: false,
			checker: { model: { providerID: 'openrouter', modelID: 'openai/gpt-4.1' } },
			notion: {
				enabled: true,
				token: 'notion_secret',
				databaseId: 'db_123',
				titleProperty: 'Prompt',
			},
		});
	});

	void test('drops malformed option values while preserving defaults', () => {
		// Act

		const options: NormalizedOptions = normalizeOptions(
			{
				mode: 'replace',
				outputFile: '',
				maxChars: 0,
				includeOriginal: 'false',
				checker: { model: 'gpt-4.1' },
				notion: {
					enabled: 'true',
					token: '',
					databaseId: 'db_123',
					titleProperty: 'Prompt',
				},
			},
			{ mode: 'proposal', outputFile: '~/default.md' },
		);

		// Assert

		assert.deepEqual(options, {
			mode: 'proposal',
			outputFile: '~/default.md',
			notion: {
				databaseId: 'db_123',
				titleProperty: 'Prompt',
			},
		});
	});

	void test('normalizes checker model values', () => {
		assert.deepEqual(normalizeCheckerOptions({ model: 'openai/gpt-4.1' }), {
			model: { providerID: 'openai', modelID: 'gpt-4.1' },
		});
		assert.deepEqual(normalizeCheckerOptions({ model: { providerID: 'anthropic', modelID: 'claude' } }), {
			model: { providerID: 'anthropic', modelID: 'claude' },
		});
		assert.deepEqual(normalizeCheckerOptions({ model: 'current' }), { model: 'current' });
		assert.equal(normalizeCheckerOptions({ model: 'gpt-4.1' }), undefined);
	});

	void test('normalizes Notion options', () => {
		assert.deepEqual(
			normalizeNotionOptions({ token: 'notion_secret', databaseId: 'db_123', titleProperty: 'Prompt' }),
			{
				token: 'notion_secret',
				databaseId: 'db_123',
				titleProperty: 'Prompt',
			},
		);
		assert.equal(normalizeNotionOptions({ databaseId: '' }), undefined);
	});

	void test('normalizes prompt handling modes', () => {
		assert.equal(promptHandlingModeOption('proposal'), 'proposal');
		assert.equal(promptHandlingModeOption('rewrite'), 'rewrite');
		assert.equal(promptHandlingModeOption('replace'), undefined);
		assert.equal(promptHandlingModeOption(true), undefined);
	});

	void test('parses and resolves checker models', () => {
		// Arrange

		const inputModel: ChatModel = { providerID: 'anthropic', modelID: 'claude' };

		// Assert

		assert.deepEqual(chatModelStringOption('openrouter/openai/gpt-4.1'), {
			providerID: 'openrouter',
			modelID: 'openai/gpt-4.1',
		});
		assert.equal(chatModelStringOption('gpt-4.1'), undefined);
		assert.deepEqual(resolveCheckerModel(inputModel, undefined), inputModel);
		assert.deepEqual(resolveCheckerModel(inputModel, 'current'), inputModel);
		assert.deepEqual(resolveCheckerModel(inputModel, 'openai/gpt-4.1'), {
			providerID: 'openai',
			modelID: 'gpt-4.1',
		});
		assert.deepEqual(resolveCheckerModel(inputModel, { providerID: 'openai', modelID: 'gpt-4.1' }), {
			providerID: 'openai',
			modelID: 'gpt-4.1',
		});
	});
});
