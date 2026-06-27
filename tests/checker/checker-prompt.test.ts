import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

import { buildCheckerPrompt } from '../../src/checker/checker-prompt.ts';
import { INTERNAL_PROMPT_MARKER } from '../../src/shared/internal-prompt.ts';

function assertFinalPromptBlock(checkerPrompt: string, prompt: string): void {
	const promptBlock: string = `<<<PROMPT\n${prompt}\nPROMPT>>>`;
	const promptBlockIndex: number = checkerPrompt.indexOf(promptBlock);

	assert.notEqual(promptBlockIndex, -1);
	assert.equal(promptBlockIndex, checkerPrompt.length - promptBlock.length);
}

void suite('buildCheckerPrompt', () => {
	void test('builds an internal checker prompt with the original prompt as the final block', () => {
		// Arrange

		const prompt: string = 'Fix this';

		// Act

		const checkerPrompt: string = buildCheckerPrompt(prompt);

		// Assert

		assert.equal(checkerPrompt.startsWith(INTERNAL_PROMPT_MARKER), true);
		assertFinalPromptBlock(checkerPrompt, prompt);
	});

	void test('includes the JSON response schema contract', () => {
		// Arrange

		const prompt: string = 'Fix this';

		// Act

		const checkerPrompt: string = buildCheckerPrompt(prompt);

		// Assert

		assert.match(checkerPrompt, /Return only a JSON object/);
		assert.match(
			checkerPrompt,
			/\{ needsProposal: boolean; detectedLanguage: string; reason: string; proposedPrompt: string \}/,
		);
	});

	const promptPreservationCases: { name: string; prompt: string }[] = [
		{ name: 'empty prompt', prompt: '' },
		{ name: 'whitespace-only prompt', prompt: ' \t  ' },
		{ name: 'prompt with trailing newline', prompt: 'Fix this\n' },
	];

	for (const testCase of promptPreservationCases) {
		void test(`preserves ${testCase.name} inside the checker prompt`, () => {
			// Act

			const checkerPrompt: string = buildCheckerPrompt(testCase.prompt);

			// Assert

			assertFinalPromptBlock(checkerPrompt, testCase.prompt);
		});
	}
});
