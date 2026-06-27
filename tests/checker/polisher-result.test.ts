import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

import { polisherResultFromUnknown, type PolisherResult } from '../../src/checker/polisher-result.ts';

const validResult: PolisherResult = {
	needsProposal: true,
	detectedLanguage: 'English',
	reason: 'Prompt needs cleanup.',
	proposedPrompt: 'Clean this up.',
};

function polisherResult(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		...validResult,
		...overrides,
	};
}

void suite('polisherResultFromUnknown', () => {
	void test('validates and normalizes polisher result objects', () => {
		// Arrange

		const value: unknown = polisherResult({ proposedPrompt: '  Clean this up.  ' });

		// Act

		const result: PolisherResult | undefined = polisherResultFromUnknown(value);

		// Assert

		assert.deepEqual(result, validResult);
	});

	void test('accepts false needsProposal values', () => {
		// Arrange

		const value: unknown = polisherResult({ needsProposal: false });

		// Act

		const result: PolisherResult | undefined = polisherResultFromUnknown(value);

		// Assert

		assert.deepEqual(result, { ...validResult, needsProposal: false });
	});

	const invalidInputCases: { name: string; value: unknown }[] = [
		{ name: 'undefined input', value: undefined },
		{ name: 'null input', value: null },
		{ name: 'string input', value: 'text' },
		{ name: 'number input', value: 123 },
		{ name: 'boolean input', value: true },
		{ name: 'array input', value: [] },
	];

	for (const current of invalidInputCases) {
		void test(`returns undefined for ${current.name}`, () => {
			// Act

			const result: PolisherResult | undefined = polisherResultFromUnknown(current.value);

			// Assert

			assert.equal(result, undefined, current.name);
		});
	}

	const missingRequiredFields: (keyof PolisherResult)[] = [
		'needsProposal',
		'detectedLanguage',
		'reason',
		'proposedPrompt',
	];

	for (const field of missingRequiredFields) {
		void test(`returns undefined when ${field} is missing`, () => {
			// Arrange

			const value: Record<string, unknown> = Object.fromEntries(
				Object.entries(polisherResult()).filter(([key]) => key !== field),
			);

			// Act

			const result: PolisherResult | undefined = polisherResultFromUnknown(value);

			// Assert

			assert.equal(result, undefined, field);
		});
	}

	const invalidRequiredFieldCases: { field: keyof PolisherResult; value: unknown }[] = [
		{ field: 'needsProposal', value: polisherResult({ needsProposal: 'true' }) },
		{ field: 'detectedLanguage', value: polisherResult({ detectedLanguage: 123 }) },
		{ field: 'reason', value: polisherResult({ reason: null }) },
		{ field: 'proposedPrompt', value: polisherResult({ proposedPrompt: {} }) },
	];

	for (const current of invalidRequiredFieldCases) {
		void test(`returns undefined when ${current.field} has an invalid type`, () => {
			// Act

			const result: PolisherResult | undefined = polisherResultFromUnknown(current.value);

			// Assert

			assert.equal(result, undefined, current.field);
		});
	}

	void test('ignores extra fields', () => {
		// Arrange

		const value: unknown = polisherResult({ extra: 'ignored' });

		// Act

		const result: PolisherResult | undefined = polisherResultFromUnknown(value);

		// Assert

		assert.deepEqual(result, validResult);
	});

	void test('trims whitespace-only proposed prompts to an empty string', () => {
		// Arrange

		const value: unknown = polisherResult({ proposedPrompt: ' \n\t ' });

		// Act

		const result: PolisherResult | undefined = polisherResultFromUnknown(value);

		// Assert

		assert.deepEqual(result, { ...validResult, proposedPrompt: '' });
	});
});
