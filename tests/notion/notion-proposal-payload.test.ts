import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

import { buildNotionProposalPayload } from '../../src/notion/notion-proposal-payload.ts';
import { formatNotionProposalTitle } from '../../src/notion/notion-proposal-properties.ts';
import type { NotionDatabaseProperties, NotionPagePayload } from '../../src/notion/notion-types.ts';
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

void suite('buildNotionProposalPayload', () => {
	void test('composes parent, properties, and children', () => {
		// Arrange

		const databaseProperties: NotionDatabaseProperties = {
			Name: { type: 'title' },
			'Detected Language': { type: 'rich_text' },
			'Conversation ID': { type: 'rich_text' },
			'Created At': { type: 'date' },
			Ignored: { type: 'number' },
		};
		const titleProperty: string = 'Prompt';

		// Act

		const payload: NotionPagePayload = buildNotionProposalPayload(
			record,
			'database',
			databaseProperties,
			titleProperty,
		);

		// Assert

		assert.deepEqual(payload.parent, { database_id: 'database' });
		assert.deepEqual(
			new Set(Object.keys(payload.properties)),
			new Set(['Prompt', 'Detected Language', 'Conversation ID', 'Created At']),
		);
		assert.deepEqual(payload.properties.Prompt, {
			title: [{ type: 'text', text: { content: 'Create a CLI.' } }],
		});
		assert.deepEqual(payload.properties['Detected Language'], {
			rich_text: [{ type: 'text', text: { content: 'Russian' } }],
		});
		assert.deepEqual(payload.properties['Conversation ID'], {
			rich_text: [{ type: 'text', text: { content: 'conversation_123' } }],
		});
		assert.deepEqual(payload.properties['Created At'], { date: { start: '2026-06-13T12:00:00.000Z' } });
		assert.equal(payload.children.length, 6);
		assert.deepEqual(payload.children[0], {
			object: 'block',
			type: 'heading_2',
			heading_2: { rich_text: [{ type: 'text', text: { content: 'Reason' } }] },
		});
		assert.deepEqual(payload.children[1], {
			object: 'block',
			type: 'paragraph',
			paragraph: { rich_text: [{ type: 'text', text: { content: 'Prompt is written in Russian.' } }] },
		});
	});

	void test('formats title from proposed prompt preview', () => {
		// Arrange

		const titleRecord: ProposalRecord = {
			...record,
			proposedPrompt: '  Create\n\t a CLI tool.  ',
		};

		// Act

		const title: string = formatNotionProposalTitle(titleRecord);

		// Assert

		assert.equal(title, 'Create a CLI tool.');
	});

	void test('truncates long proposed prompt previews', () => {
		// Arrange

		const titleRecord: ProposalRecord = {
			...record,
			proposedPrompt: 'Create '.repeat(30).trim(),
		};

		// Act

		const title: string = formatNotionProposalTitle(titleRecord);

		// Assert

		assert.equal(title.length, 120);
		assert.match(title, /^Create Create/);
		assert.equal(title.endsWith('...'), true);
	});

	void test('falls back when proposed prompt title is empty', () => {
		// Arrange

		const originalFallbackRecord: ProposalRecord = {
			...record,
			originalPrompt: '  Original\n\tprompt  ',
			proposedPrompt: ' \n\t ',
		};
		const genericFallbackRecord: ProposalRecord = {
			...record,
			originalPrompt: ' ',
			proposedPrompt: '',
		};

		// Act

		const originalFallbackTitle: string = formatNotionProposalTitle(originalFallbackRecord);
		const genericFallbackTitle: string = formatNotionProposalTitle(genericFallbackRecord);

		// Assert

		assert.equal(originalFallbackTitle, 'Original prompt');
		assert.equal(genericFallbackTitle, 'Prompt polish proposal');
	});
});
