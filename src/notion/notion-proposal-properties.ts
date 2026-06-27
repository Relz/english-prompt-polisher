import type { ProposalRecord } from '../proposal/proposal-types.ts';

import { richText } from './notion-blocks.ts';
import { hasNotionPropertyType, notionTitlePropertyName } from './notion-proposal-schema.ts';
import type { NotionDatabaseProperties } from './notion-types.ts';

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

export function buildNotionProposalProperties(
	record: ProposalRecord,
	databaseProperties: NotionDatabaseProperties,
	configuredTitleProperty?: string,
): Record<string, unknown> {
	const titleProperty: string = notionTitlePropertyName(databaseProperties, configuredTitleProperty);
	const properties: Record<string, unknown> = {};
	properties[titleProperty] = {
		title: richText(`Prompt polish proposal - ${record.createdAt}`),
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
