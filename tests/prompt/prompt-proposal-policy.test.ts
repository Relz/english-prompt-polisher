import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

import { maxPromptChars, shouldCheckPromptForProposal } from '../../src/prompt/prompt-proposal-policy.ts';
import { INTERNAL_PROMPT_MARKER } from '../../src/shared/internal-prompt.ts';
import type { Options } from '../../src/shared/options.ts';

void suite('prompt proposal policy', () => {
	void suite('maxPromptChars', () => {
		void test('returns configured positive safe integer limits', () => {
			for (const maxChars of [1, 1200, Number.MAX_SAFE_INTEGER]) {
				assert.equal(maxPromptChars({ maxChars }), maxChars);
			}
		});

		void test('omitted or invalid limits impose no length limit', () => {
			// Arrange

			const prompt: string = 'Long prompt. '.repeat(1000);
			const optionsCases: Options[] = [
				{},
				{ maxChars: 0 },
				{ maxChars: -1 },
				{ maxChars: 1.5 },
				{ maxChars: Number.NaN },
				{ maxChars: Number.POSITIVE_INFINITY },
				{ maxChars: Number.MAX_SAFE_INTEGER + 1 },
			];

			// Act and Assert

			for (const options of optionsCases) {
				assert.equal(maxPromptChars(options), undefined, `maxChars: ${String(options.maxChars)}`);
				assert.equal(shouldCheckPromptForProposal(prompt, options), true);
			}
		});
	});

	void suite('shouldCheckPromptForProposal', () => {
		void test('checks the inclusive limit using Unicode code points, not code units or graphemes', () => {
			// Arrange

			const prompt: string = 'A😊e\u0301';

			// Act and Assert

			assert.equal(shouldCheckPromptForProposal(prompt, { maxChars: 5 }), true);
			assert.equal(shouldCheckPromptForProposal(prompt, { maxChars: 4 }), true);
			assert.equal(shouldCheckPromptForProposal(prompt, { maxChars: 3 }), false);
		});
		void test('checks normal non-empty prompts', () => {
			// Act

			const shouldCheck: boolean = shouldCheckPromptForProposal('Corrige esto');

			// Assert

			assert.equal(shouldCheck, true);
		});

		void test('checks prompts with surrounding whitespace and visible text', () => {
			// Act

			const shouldCheck: boolean = shouldCheckPromptForProposal('  \n\tCorrige esto  \n');

			// Assert

			assert.equal(shouldCheck, true);
		});

		void test('skips empty prompts', () => {
			// Act

			const shouldCheck: boolean = shouldCheckPromptForProposal('');

			// Assert

			assert.equal(shouldCheck, false);
		});

		void test('skips whitespace-only prompts', () => {
			// Act

			const shouldCheck: boolean = shouldCheckPromptForProposal('   \n\t  ');

			// Assert

			assert.equal(shouldCheck, false);
		});

		void test('skips prompts containing the internal marker', () => {
			// Act

			const shouldCheck: boolean = shouldCheckPromptForProposal(`Fix this\n\n${INTERNAL_PROMPT_MARKER}`);

			// Assert

			assert.equal(shouldCheck, false);
		});
	});
});
