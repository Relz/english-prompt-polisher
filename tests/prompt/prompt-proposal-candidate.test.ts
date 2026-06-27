import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

import { createPromptProposalCandidate } from '../../src/prompt/prompt-proposal-candidate.ts';
import { truncatePrompt } from '../../src/prompt/prompt-text.ts';
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

	void test('truncates after assembling visible prompt text', () => {
		// Arrange

		const prompt: string = 'Alpha\n\nBeta';
		const output: ChatMessageOutput = chatOutput([textPart('  Alpha  '), textPart('  Beta  ')]);

		// Act

		const candidate: ReturnType<typeof createPromptProposalCandidate> = createPromptProposalCandidate(output, {
			maxChars: 10,
		});

		// Assert

		assert.deepEqual(candidate, { originalPrompt: truncatePrompt(prompt, 10) });
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

	void test('skips internal checker prompts before truncating', () => {
		// Arrange

		const output: ChatMessageOutput = chatOutput([textPart(`${INTERNAL_PROMPT_MARKER}\n\nFix this`)]);

		// Act

		const candidate: ReturnType<typeof createPromptProposalCandidate> = createPromptProposalCandidate(output, {
			maxChars: 5,
		});

		// Assert

		assert.equal(candidate, undefined);
	});
});
