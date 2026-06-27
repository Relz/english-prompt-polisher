import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

import { formatProposalMarkdown } from '../../src/proposal/proposal-markdown.ts';
import type { ProposalRecord } from '../../src/proposal/proposal-types.ts';

const record: ProposalRecord = {
	needsProposal: true,
	detectedLanguage: 'English',
	reason: 'Prompt needs grammar cleanup.',
	originalPrompt: 'Fix grammar in this sentence',
	proposedPrompt: 'Fix the grammar in this sentence.',
	conversationId: 'conversation_123',
	messageId: 'message_456',
	createdAt: '2026-06-13T12:00:00.000Z',
};

function block(lines: string[]): string {
	return lines.join('\n');
}

void suite('proposal markdown helpers', () => {
	void test('formatProposalMarkdown includes the original prompt when requested', () => {
		// Arrange

		const includeOriginal: boolean = true;
		// Act

		const markdown: string = formatProposalMarkdown(record, includeOriginal);

		// Assert

		assert.ok(markdown.includes(block(['### Original Prompt', '', '```', record.originalPrompt, '```'])));
		assert.ok(markdown.includes(block(['### Proposed English Prompt', '', '```', record.proposedPrompt, '```'])));
	});

	void test('formatProposalMarkdown omits the original prompt when disabled', () => {
		// Arrange

		const includeOriginal: boolean = false;
		// Act

		const markdown: string = formatProposalMarkdown(record, includeOriginal);

		// Assert

		assert.doesNotMatch(markdown, /^### Original Prompt$/m);
		assert.doesNotMatch(markdown, /Fix grammar in this sentence/);
		assert.ok(markdown.includes(block(['### Proposed English Prompt', '', '```', record.proposedPrompt, '```'])));
	});

	void test('formatProposalMarkdown does not include needsProposal in markdown metadata', () => {
		// Arrange

		const recordWithoutProposalNeed: ProposalRecord = { ...record, needsProposal: false };

		// Act

		const markdown: string = formatProposalMarkdown(recordWithoutProposalNeed, false);

		// Assert

		assert.doesNotMatch(markdown, /^- Needs Proposal:/m);
		assert.match(markdown, /Fix the grammar in this sentence\./);
	});

	const recordWithoutMessageId: ProposalRecord = { ...record };
	delete recordWithoutMessageId.messageId;
	const recordWithUndefinedMessageId: ProposalRecord = { ...record, messageId: undefined };
	const recordWithEmptyMessageId: ProposalRecord = { ...record, messageId: '' };
	const absentMessageIdCases: {
		caseName: string;
		proposalRecord: ProposalRecord;
		includeOriginal: boolean;
	}[] = [
		{
			caseName: 'omitted message ID with original prompt',
			proposalRecord: recordWithoutMessageId,
			includeOriginal: true,
		},
		{
			caseName: 'undefined message ID',
			proposalRecord: recordWithUndefinedMessageId,
			includeOriginal: false,
		},
		{
			caseName: 'empty message ID',
			proposalRecord: recordWithEmptyMessageId,
			includeOriginal: false,
		},
	];

	for (const { caseName, proposalRecord, includeOriginal } of absentMessageIdCases) {
		void test(`formatProposalMarkdown treats ${caseName} as absent`, () => {
			// Act

			const markdown: string = formatProposalMarkdown(proposalRecord, includeOriginal);

			// Assert

			assert.doesNotMatch(markdown, /^- Message ID:/m, caseName);
		});
	}

	void test('formatProposalMarkdown keeps multiline metadata within metadata bullets', () => {
		// Arrange

		const recordWithMarkdownMetadata: ProposalRecord = {
			...record,
			detectedLanguage: 'English `variant`',
			reason: 'First line with **Markdown**.\nSecond line stays part of the reason.',
			conversationId: 'conversation_*123*',
			messageId: 'message_[456]',
		};

		// Act

		const markdown: string = formatProposalMarkdown(recordWithMarkdownMetadata, false);

		// Assert

		assert.ok(
			markdown.includes(
				block([
					'- Conversation ID: conversation_*123*',
					'- Message ID: message_[456]',
					'- Detected Language: English `variant`',
					'- Reason: First line with **Markdown**.',
					'  Second line stays part of the reason.',
				]),
			),
		);
	});

	void test('formatProposalMarkdown uses a longer fence when content contains a closing fence line', () => {
		// Arrange

		const recordWithClosingFenceLine: ProposalRecord = {
			...record,
			proposedPrompt: 'Start with context\n```\nEnd with instructions',
		};

		// Act

		const markdown: string = formatProposalMarkdown(recordWithClosingFenceLine, false);

		// Assert

		assert.ok(markdown.includes(block(['````', 'Start with context', '```', 'End with instructions', '````'])));
	});

	void test('formatProposalMarkdown sizes original and proposed fences independently', () => {
		// Arrange

		const recordWithDifferentFenceNeeds: ProposalRecord = {
			...record,
			originalPrompt: 'Original starts\n````\nOriginal ends',
			proposedPrompt: 'Proposed uses ``details``.',
		};

		// Act

		const markdown: string = formatProposalMarkdown(recordWithDifferentFenceNeeds, true);

		// Assert

		assert.ok(markdown.includes(block(['`````', 'Original starts', '````', 'Original ends', '`````'])));
		assert.ok(markdown.includes(block(['```', 'Proposed uses ``details``.', '```'])));
	});

	void test('formatProposalMarkdown preserves multiline prompts inside fences', () => {
		// Arrange

		const multilineRecord: ProposalRecord = {
			...record,
			originalPrompt: 'Original line one\nOriginal line two',
			proposedPrompt: 'Proposed line one\nProposed line two',
		};

		// Act

		const markdown: string = formatProposalMarkdown(multilineRecord, true);

		// Assert

		assert.ok(markdown.includes(block(['```', 'Original line one', 'Original line two', '```'])));
		assert.ok(markdown.includes(block(['```', 'Proposed line one', 'Proposed line two', '```'])));
	});

	void test('formatProposalMarkdown formats empty prompt strings as empty fenced blocks', () => {
		// Arrange

		const emptyPromptRecord: ProposalRecord = { ...record, originalPrompt: '', proposedPrompt: '' };

		// Act

		const markdown: string = formatProposalMarkdown(emptyPromptRecord, true);

		// Assert

		assert.match(markdown, /### Original Prompt\n\n(`{3,})\n\n\1/);
		assert.match(markdown, /### Proposed English Prompt\n\n(`{3,})\n\n\1/);
	});

	void test('formatProposalMarkdown preserves prompt whitespace inside fences', () => {
		// Arrange

		const whitespaceRecord: ProposalRecord = {
			...record,
			originalPrompt: '  leading original\ntrailing original  ',
			proposedPrompt: '\n  leading blank proposed\ntrailing blank proposed  \n',
		};

		// Act

		const markdown: string = formatProposalMarkdown(whitespaceRecord, true);

		// Assert

		assert.ok(markdown.includes(block(['```', '  leading original', 'trailing original  ', '```'])));
		assert.ok(
			markdown.includes(block(['```', '', '  leading blank proposed', 'trailing blank proposed  ', '', '```'])),
		);
	});
});
