import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

import type { PolisherResult } from '../../src/checker/polisher-result.ts';
import { resultFromParts } from '../../src/checker/result.ts';
import type { ChatParts } from '../../src/shared/chat.ts';
import { textPart } from '../fixtures.ts';

const spanishResult: PolisherResult = {
	needsProposal: true,
	detectedLanguage: 'Spanish',
	reason: 'Prompt is not English.',
	proposedPrompt: 'Correct this.',
};

const englishResult: PolisherResult = {
	needsProposal: false,
	detectedLanguage: 'English',
	reason: 'Prompt is already clear.',
	proposedPrompt: 'Looks good.',
};

function resultPart(result: PolisherResult): ChatParts[number] {
	return textPart(JSON.stringify(result));
}

function nonTextPart(): ChatParts[number] {
	return {
		id: 'prt_step',
		type: 'step-start',
	};
}

function nonTextPartWithText(text: string): ChatParts[number] {
	return {
		id: 'prt_step',
		type: 'step-start',
		text,
	};
}

void suite('resultFromParts', () => {
	void test('returns a valid polisher result from text parts', () => {
		// Arrange

		const parts: ChatParts = [resultPart(spanishResult)];

		// Act

		const result: PolisherResult | undefined = resultFromParts(parts);

		// Assert

		assert.deepEqual(result, spanishResult);
	});

	void test('returns undefined when no text part contains a valid polisher result', () => {
		// Arrange

		const parts: ChatParts = [textPart('not json'), textPart('null'), textPart('{}'), nonTextPart()];

		// Act

		const result: PolisherResult | undefined = resultFromParts(parts);

		// Assert

		assert.equal(result, undefined);
	});

	void test('skips invalid text parts and returns a later valid polisher result', () => {
		// Arrange

		const parts: ChatParts = [
			textPart('not json'),
			textPart('{"needsProposal":"true"}'),
			resultPart(englishResult),
		];

		// Act

		const result: PolisherResult | undefined = resultFromParts(parts);

		// Assert

		assert.deepEqual(result, englishResult);
	});

	void test('ignores non-text parts and returns a valid text result', () => {
		// Arrange

		const parts: ChatParts = [nonTextPartWithText(JSON.stringify(spanishResult)), resultPart(englishResult)];

		// Act

		const result: PolisherResult | undefined = resultFromParts(parts);

		// Assert

		assert.deepEqual(result, englishResult);
	});

	void test('returns the first valid polisher result from text parts', () => {
		// Arrange

		const parts: ChatParts = [resultPart(spanishResult), resultPart(englishResult)];

		// Act

		const result: PolisherResult | undefined = resultFromParts(parts);

		// Assert

		assert.deepEqual(result, spanishResult);
	});
});
