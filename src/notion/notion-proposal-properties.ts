import type { ProposalRecord } from '../proposal/proposal-types.ts';

import { richText } from './notion-blocks.ts';
import { hasNotionPropertyType, notionTitlePropertyName } from './notion-proposal-schema.ts';
import type { NotionDatabaseProperties } from './notion-types.ts';

const NOTION_PROPOSAL_TITLE_MAX_LENGTH: number = 120;

function addProperty(
	properties: Record<string, unknown>,
	databaseProperties: NotionDatabaseProperties,
	name: string,
	value: unknown,
	type: string,
): void {
	if (hasNotionPropertyType(databaseProperties, name, type)) {
		properties[name] = value;
	}
}

function previewTitle(value: string): string | undefined {
	const preview: string = value.trim().replace(/\s+/g, ' ');
	if (!preview) {
		return;
	}
	if (preview.length <= NOTION_PROPOSAL_TITLE_MAX_LENGTH) {
		return preview;
	}
	return `${preview.slice(0, NOTION_PROPOSAL_TITLE_MAX_LENGTH - 3).trimEnd()}...`;
}

export function formatNotionProposalTitle(record: ProposalRecord): string {
	return previewTitle(record.proposedPrompt) ?? previewTitle(record.originalPrompt) ?? 'Prompt polish proposal';
}

export function buildNotionProposalProperties(
	record: ProposalRecord,
	databaseProperties: NotionDatabaseProperties,
	configuredTitleProperty?: string,
): Record<string, unknown> {
	const titleProperty: string = notionTitlePropertyName(databaseProperties, configuredTitleProperty);
	const properties: Record<string, unknown> = {};
	properties[titleProperty] = {
		title: richText(formatNotionProposalTitle(record)),
	};
	addProperty(
		properties,
		databaseProperties,
		'Detected Language',
		{ rich_text: richText(record.detectedLanguage) },
		'rich_text',
	);
	addProperty(
		properties,
		databaseProperties,
		'Conversation ID',
		{ rich_text: richText(record.conversationId) },
		'rich_text',
	);
	addProperty(properties, databaseProperties, 'Created At', { date: { start: record.createdAt } }, 'date');

	return properties;
}
