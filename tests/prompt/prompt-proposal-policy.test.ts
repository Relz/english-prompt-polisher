import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

import { maxPromptChars, shouldCheckPromptForProposal } from '../../src/prompt/prompt-proposal-policy.ts';
import { shouldCheckPromptForRewrite } from '../../src/prompt/prompt-rewrite-policy.ts';
import { INTERNAL_PROMPT_MARKER } from '../../src/shared/internal-prompt.ts';
import type { Options } from '../../src/shared/options.ts';

const unlimitedOptions: Options[] = [
	{},
	{ maxChars: 0 },
	{ maxChars: -1 },
	{ maxChars: 1.5 },
	{ maxChars: Number.NaN },
	{ maxChars: Number.POSITIVE_INFINITY },
	{ maxChars: Number.MAX_SAFE_INTEGER + 1 },
];

void suite('prompt eligibility policies', () => {
	void suite('maxPromptChars', () => {
		void test('returns configured positive safe integer limits', () => {
			for (const maxChars of [1, 1200, Number.MAX_SAFE_INTEGER]) {
				assert.equal(maxPromptChars({ maxChars }), maxChars);
			}
		});

		void test('omitted or invalid limits impose no length limit', () => {
			// Act and Assert

			for (const options of unlimitedOptions) {
				assert.equal(maxPromptChars(options), undefined, `maxChars: ${String(options.maxChars)}`);
			}
		});
	});

	const policies: { name: string; shouldCheck: typeof shouldCheckPromptForProposal }[] = [
		{ name: 'shouldCheckPromptForProposal', shouldCheck: shouldCheckPromptForProposal },
		{ name: 'shouldCheckPromptForRewrite', shouldCheck: shouldCheckPromptForRewrite },
	];

	for (const { name, shouldCheck } of policies) {
		void suite(name, () => {
			void test('omitted or invalid limits allow complete long prompts', () => {
				const prompt: string = 'Long prompt. '.repeat(1000);

				for (const options of unlimitedOptions) {
					assert.equal(shouldCheck(prompt, options), true, `maxChars: ${String(options.maxChars)}`);
				}
			});

			void test('checks the inclusive limit using Unicode code points, not code units or graphemes', () => {
				// Arrange

				const prompt: string = 'A😊e\u0301';

				// Act and Assert

				assert.equal(shouldCheck(prompt, { maxChars: 5 }), true);
				assert.equal(shouldCheck(prompt, { maxChars: 4 }), true);
				assert.equal(shouldCheck(prompt, { maxChars: 3 }), false);
			});
			void test('checks normal non-empty prompts', () => {
				// Act

				const eligible: boolean = shouldCheck('Corrige esto');

				// Assert

				assert.equal(eligible, true);
			});

			void test('checks prompts with surrounding whitespace and visible text', () => {
				// Act

				const eligible: boolean = shouldCheck('  \n\tCorrige esto  \n');

				// Assert

				assert.equal(eligible, true);
			});

			void test('skips empty prompts', () => {
				// Act

				const eligible: boolean = shouldCheck('');

				// Assert

				assert.equal(eligible, false);
			});

			void test('skips whitespace-only prompts', () => {
				// Act

				const eligible: boolean = shouldCheck('   \n\t  ');

				// Assert

				assert.equal(eligible, false);
			});

			void test('skips prompts containing the internal marker', () => {
				// Act

				const eligible: boolean = shouldCheck(`Fix this\n\n${INTERNAL_PROMPT_MARKER}`);

				// Assert

				assert.equal(eligible, false);
			});
		});
	}
});
