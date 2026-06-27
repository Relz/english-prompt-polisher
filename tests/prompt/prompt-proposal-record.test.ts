import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

import type { PolisherResult } from '../../src/checker/polisher-result.ts';
import type { PromptProposalCandidate } from '../../src/prompt/prompt-proposal-candidate.ts';
import { createPromptProposalRecord } from '../../src/prompt/prompt-proposal-record.ts';
import type { ProposalRecord } from '../../src/proposal/proposal-types.ts';
import type { ChatMessageInput } from '../../src/shared/chat.ts';

const input: ChatMessageInput = { conversationId: 'conversation_123', messageId: 'message_456' };
const candidate: PromptProposalCandidate = { originalPrompt: 'Corrige esto' };
const result: PolisherResult = {
	needsProposal: true,
	detectedLanguage: 'Spanish',
	reason: 'Prompt is not English.',
	proposedPrompt: 'Correct this.',
};
const createdAt: string = '2026-06-13T12:00:00.000Z';

void suite('createPromptProposalRecord', () => {
	void test('creates a record for a changed proposal', () => {
		// Act

		const record: ProposalRecord | undefined = createPromptProposalRecord(input, candidate, result, createdAt);

		// Assert

		assert.deepEqual(record, {
			...result,
			originalPrompt: 'Corrige esto',
			conversationId: 'conversation_123',
			messageId: 'message_456',
			createdAt,
		});
	});

	void test('returns undefined when proposals are disabled', () => {
		// Act

		const record: ProposalRecord | undefined = createPromptProposalRecord(
			input,
			candidate,
			{ ...result, needsProposal: false },
			createdAt,
		);

		// Assert

		assert.equal(record, undefined);
	});

	void test('returns undefined when the proposed prompt is empty', () => {
		// Act

		const record: ProposalRecord | undefined = createPromptProposalRecord(
			input,
			candidate,
			{ ...result, proposedPrompt: '' },
			createdAt,
		);

		// Assert

		assert.equal(record, undefined);
	});

	void test('returns undefined when the proposed prompt is whitespace only', () => {
		// Act

		const record: ProposalRecord | undefined = createPromptProposalRecord(
			input,
			candidate,
			{ ...result, proposedPrompt: '  \n\t  ' },
			createdAt,
		);

		// Assert

		assert.equal(record, undefined);
	});

	void test('returns undefined when the proposed prompt matches the original prompt', () => {
		// Act

		const record: ProposalRecord | undefined = createPromptProposalRecord(
			input,
			candidate,
			{ ...result, proposedPrompt: candidate.originalPrompt },
			createdAt,
		);

		// Assert

		assert.equal(record, undefined);
	});

	void test('preserves undefined message IDs', () => {
		// Arrange

		const inputWithoutMessageId: ChatMessageInput = { conversationId: input.conversationId };

		// Act

		const record: ProposalRecord | undefined = createPromptProposalRecord(
			inputWithoutMessageId,
			candidate,
			result,
			createdAt,
		);

		// Assert

		assert.ok(record);
		const { messageId, ...recordWithoutMessageId } = record;
		assert.equal(messageId, undefined);
		assert.deepEqual(recordWithoutMessageId, {
			...result,
			originalPrompt: 'Corrige esto',
			conversationId: 'conversation_123',
			createdAt,
		});
	});
});
