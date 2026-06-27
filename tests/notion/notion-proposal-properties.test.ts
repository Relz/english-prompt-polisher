import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

import { buildNotionProposalProperties } from '../../src/notion/notion-proposal-properties.ts';
import type { NotionDatabaseProperties } from '../../src/notion/notion-types.ts';
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

void suite('buildNotionProposalProperties', () => {
	void test('maps supported page properties with exact values', () => {
		// Arrange

		const databaseProperties: NotionDatabaseProperties = {
			Name: { type: 'title' },
			'Detected Language': { type: 'rich_text' },
			'Conversation ID': { type: 'rich_text' },
			'Created At': { type: 'date' },
		};

		// Act

		const properties: Record<string, unknown> = buildNotionProposalProperties(record, databaseProperties);

		// Assert

		assert.deepEqual(properties, {
			Name: {
				title: [
					{
						type: 'text',
						text: { content: 'Prompt polish proposal - 2026-06-13T12:00:00.000Z' },
					},
				],
			},
			'Detected Language': {
				rich_text: [{ type: 'text', text: { content: 'Russian' } }],
			},
			'Conversation ID': {
				rich_text: [{ type: 'text', text: { content: 'conversation_123' } }],
			},
			'Created At': { date: { start: '2026-06-13T12:00:00.000Z' } },
		});
	});

	void test('uses a configured title property name', () => {
		// Arrange

		const databaseProperties: NotionDatabaseProperties = { Name: { type: 'title' } };
		const titleProperty: string = 'Prompt';

		// Act

		const properties: Record<string, unknown> = buildNotionProposalProperties(
			record,
			databaseProperties,
			titleProperty,
		);

		// Assert

		assert.deepEqual(Object.keys(properties), [titleProperty]);
	});

	void test('keeps only title property when optional property types mismatch', () => {
		// Arrange

		const databaseProperties: NotionDatabaseProperties = {
			Name: { type: 'title' },
			'Detected Language': { type: 'number' },
			'Conversation ID': { type: 'date' },
			'Created At': { type: 'rich_text' },
		};

		// Act

		const properties: Record<string, unknown> = buildNotionProposalProperties(record, databaseProperties);

		// Assert

		assert.deepEqual(Object.keys(properties), ['Name']);
	});

	void test('uses discovered title property and includes only supported optional properties', () => {
		// Arrange

		const databaseProperties: NotionDatabaseProperties = {
			Prompt: { type: 'title' },
			'Detected Language': undefined,
			'Conversation ID': { type: 'rich_text' },
			'Created At': { type: 'rich_text' },
			Ignored: { type: 'rich_text' },
		};

		// Act

		const properties: Record<string, unknown> = buildNotionProposalProperties(record, databaseProperties);

		// Assert

		assert.deepEqual(Object.keys(properties).sort(), ['Conversation ID', 'Prompt']);
	});
});
