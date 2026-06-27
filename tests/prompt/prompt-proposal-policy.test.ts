import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

import { maxPromptChars, shouldCheckPromptForProposal } from '../../src/prompt/prompt-proposal-policy.ts';
import { INTERNAL_PROMPT_MARKER } from '../../src/shared/internal-prompt.ts';

const EXPECTED_DEFAULT_MAX_PROMPT_CHARS: number = 4000;

void suite('prompt proposal policy', () => {
	void suite('maxPromptChars', () => {
		void test('returns configured positive maxChars', () => {
			// Act

			const maxChars: number = maxPromptChars({ maxChars: 1200 });

			// Assert

			assert.equal(maxChars, 1200);
		});

		void test('returns configured minimum positive maxChars', () => {
			// Act

			const maxChars: number = maxPromptChars({ maxChars: 1 });

			// Assert

			assert.equal(maxChars, 1);
		});

		void test('returns configured maximum safe integer maxChars', () => {
			// Arrange

			const largeMaxChars: number = Number.MAX_SAFE_INTEGER;

			// Act

			const maxChars: number = maxPromptChars({ maxChars: largeMaxChars });

			// Assert

			assert.equal(maxChars, largeMaxChars);
		});

		void test('falls back to the default for unsafe integer maxChars values', () => {
			// Act

			const maxChars: number = maxPromptChars({ maxChars: Number.MAX_SAFE_INTEGER + 1 });

			// Assert

			assert.equal(maxChars, EXPECTED_DEFAULT_MAX_PROMPT_CHARS);
		});

		void test('returns a usable default when maxChars is omitted', () => {
			// Act

			const maxChars: number = maxPromptChars({});

			// Assert

			assert.equal(maxChars, EXPECTED_DEFAULT_MAX_PROMPT_CHARS);
		});

		const invalidMaxCharsCases: { name: string; value: number }[] = [
			{ name: 'zero', value: 0 },
			{ name: 'negative integer', value: -1 },
			{ name: 'fraction', value: 10.5 },
			{ name: 'NaN', value: Number.NaN },
			{ name: 'positive infinity', value: Number.POSITIVE_INFINITY },
			{ name: 'negative infinity', value: Number.NEGATIVE_INFINITY },
		];

		for (const { name, value: maxChars } of invalidMaxCharsCases) {
			void test(`falls back to the default for invalid maxChars value: ${name}`, () => {
				// Act

				const result: number = maxPromptChars({ maxChars });

				// Assert

				assert.equal(result, EXPECTED_DEFAULT_MAX_PROMPT_CHARS, name);
			});
		}

		const runtimeInvalidMaxCharsCases: { name: string; value: unknown }[] = [
			{ name: 'string', value: '1200' },
			{ name: 'null', value: null },
		];

		for (const { name, value: maxChars } of runtimeInvalidMaxCharsCases) {
			void test(`falls back to the default for runtime non-number maxChars value: ${name}`, () => {
				const options: Parameters<typeof maxPromptChars>[0] = {};
				Reflect.set(options, 'maxChars', maxChars);

				// Act

				const result: number = maxPromptChars(options);

				// Assert

				assert.equal(result, EXPECTED_DEFAULT_MAX_PROMPT_CHARS, name);
			});
		}
	});

	void suite('shouldCheckPromptForProposal', () => {
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
