import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

import { createPromptProposalCandidate } from '../../src/prompt/prompt-proposal-candidate.ts';
import type { ChatMessageOutput, ChatParts } from '../../src/shared/chat.ts';
import { INTERNAL_PROMPT_MARKER } from '../../src/shared/internal-prompt.ts';
import { chatOutput, textPart } from '../fixtures.ts';

function nonTextPart(): ChatParts[number] {
	return {
		id: 'prt_step',
		type: 'step-start',
	};
}

void suite('createPromptProposalCandidate', () => {
	void test('extracts user-visible prompt text', () => {
		// Arrange

		const output: ChatMessageOutput = chatOutput([
			textPart('  Corrige esto  '),
			textPart('Ignored', { ignored: true }),
			textPart('Synthetic', { synthetic: true }),
			nonTextPart(),
			textPart('  Por favor  '),
		]);

		// Act

		const candidate: ReturnType<typeof createPromptProposalCandidate> = createPromptProposalCandidate(output, {
			maxChars: 100,
		});

		// Assert

		assert.deepEqual(candidate, { originalPrompt: 'Corrige esto\n\nPor favor' });
	});

	void test('skips prompts exceeding the limit after assembling visible text', () => {
		// Arrange

		const output: ChatMessageOutput = chatOutput([textPart('  Alpha  '), textPart('  Beta  ')]);

		// Act

		const candidate: ReturnType<typeof createPromptProposalCandidate> = createPromptProposalCandidate(output, {
			maxChars: 10,
		});

		// Assert

		assert.equal(candidate, undefined);
	});

	void test('preserves long prompts without a configured limit', () => {
		// Arrange

		const prompt: string = 'Line 1\n  Line 2\n\n'.repeat(1000).trim();
		const output: ChatMessageOutput = chatOutput([textPart(prompt)]);

		// Act

		const candidate: ReturnType<typeof createPromptProposalCandidate> = createPromptProposalCandidate(output);

		// Assert

		assert.deepEqual(candidate, { originalPrompt: prompt });
	});

	void test('skips empty visible prompt text', () => {
		// Arrange

		const output: ChatMessageOutput = chatOutput([textPart('  \t  ')]);

		// Act

		const candidate: ReturnType<typeof createPromptProposalCandidate> = createPromptProposalCandidate(output, {
			maxChars: 100,
		});

		// Assert

		assert.equal(candidate, undefined);
	});

	void test('skips internal checker prompts without a length limit', () => {
		// Arrange

		const output: ChatMessageOutput = chatOutput([textPart(`${INTERNAL_PROMPT_MARKER}\n\nFix this`)]);

		// Act

		const candidate: ReturnType<typeof createPromptProposalCandidate> = createPromptProposalCandidate(output);

		// Assert

		assert.equal(candidate, undefined);
	});
});
