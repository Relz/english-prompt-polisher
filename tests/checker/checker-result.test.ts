import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

import { parseCheckerResult } from '../../src/checker/checker-result.ts';
import type { PolisherResult } from '../../src/checker/polisher-result.ts';
import type { ChatParts } from '../../src/shared/chat.ts';
import { textPart } from '../fixtures.ts';

void suite('parseCheckerResult', () => {
	void test('returns a valid polisher JSON object from text parts', () => {
		// Arrange

		const expectedResult: PolisherResult = {
			needsProposal: true,
			detectedLanguage: 'Spanish',
			reason: 'Prompt is not English.',
			proposedPrompt: 'Correct this.',
		};

		const parts: ChatParts = [textPart(JSON.stringify(expectedResult))];

		// Act

		const result: PolisherResult = parseCheckerResult(parts);

		// Assert

		assert.deepEqual(result, expectedResult);
	});

	void test('throws a checker-specific Error when no result can be parsed', () => {
		// Arrange

		const parts: ChatParts = [];

		// Act

		const act = (): unknown => parseCheckerResult(parts);

		// Assert

		assert.throws(act, /valid polisher JSON object/);
	});
});
