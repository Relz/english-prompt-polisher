import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

import { buildNotionProposalChildren } from '../../src/notion/notion-proposal-children.ts';
import type { ProposalRecord } from '../../src/proposal/proposal-types.ts';

const record: ProposalRecord = {
	needsProposal: true,
	detectedLanguage: 'Russian',
	reason: 'Prompt is written in Russian.',
	originalPrompt: 'Создай CLI.',
	proposedPrompt: 'Create a CLI.',
	conversationId: 'conversation_123',
	messageId: 'message_456',
	createdAt: '2026-06-13T12:00:00.000Z',
};

function blockTextContent(block: Record<string, unknown>): unknown {
	const blockContent: unknown = block.type === 'heading_2' ? block.heading_2 : block.paragraph;
	if (typeof blockContent !== 'object' || blockContent === null || !('rich_text' in blockContent)) {
		return undefined;
	}

	const richText: unknown = blockContent.rich_text;
	if (!Array.isArray(richText)) {
		return undefined;
	}

	const firstRichText: unknown = richText[0];
	if (typeof firstRichText !== 'object' || firstRichText === null || !('text' in firstRichText)) {
		return undefined;
	}

	const text: unknown = firstRichText.text;
	if (typeof text !== 'object' || text === null || !('content' in text)) {
		return undefined;
	}

	return text.content;
}

void suite('buildNotionProposalChildren', () => {
	void test('builds proposal sections in order', () => {
		// Act

		const children: Record<string, unknown>[] = buildNotionProposalChildren(record);

		// Assert

		assert.deepEqual(
			children.map((child: Record<string, unknown>): unknown => child.type),
			['heading_2', 'paragraph', 'heading_2', 'paragraph', 'heading_2', 'paragraph'],
		);
		assert.deepEqual(children.map(blockTextContent), [
			'Reason',
			record.reason,
			'Original Prompt',
			record.originalPrompt,
			'Proposed English Prompt',
			record.proposedPrompt,
		]);
	});
});
