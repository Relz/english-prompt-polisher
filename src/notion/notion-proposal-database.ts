import { readNotionDatabase } from './notion-client.ts';
import type { NotionConfig } from './notion-config.ts';
import { notionDatabasePropertiesFromUnknown } from './notion-database-properties.ts';
import type { NotionDatabaseProperties } from './notion-types.ts';

export async function readNotionProposalDatabaseProperties(config: NotionConfig): Promise<NotionDatabaseProperties> {
	const database: unknown = await readNotionDatabase(config.token, config.databaseId);
	return notionDatabasePropertiesFromUnknown(database);
}
