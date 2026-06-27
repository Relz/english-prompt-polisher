import type { ProposalRecord } from '../proposal/proposal-types.ts';

import { createNotionPage } from './notion-client.ts';
import type { NotionConfig } from './notion-config.ts';
import { readNotionProposalDatabaseProperties } from './notion-proposal-database.ts';
import { buildNotionProposalPayload } from './notion-proposal-payload.ts';
import type { NotionDatabaseProperties, NotionPagePayload } from './notion-types.ts';

export { readNotionProposalDatabaseProperties } from './notion-proposal-database.ts';
export { buildNotionProposalPayload } from './notion-proposal-payload.ts';

export function buildNotionProposalPagePayload(
	record: ProposalRecord,
	config: NotionConfig,
	databaseProperties: NotionDatabaseProperties,
): NotionPagePayload {
	return buildNotionProposalPayload(record, config.databaseId, databaseProperties, config.titleProperty);
}

export async function writeNotionProposalPage(config: NotionConfig, payload: NotionPagePayload): Promise<void> {
	await createNotionPage(config.token, payload);
}

export async function writeNotionProposal(record: ProposalRecord, config: NotionConfig): Promise<void> {
	const databaseProperties: NotionDatabaseProperties = await readNotionProposalDatabaseProperties(config);
	const payload: NotionPagePayload = buildNotionProposalPagePayload(record, config, databaseProperties);
	await writeNotionProposalPage(config, payload);
}
