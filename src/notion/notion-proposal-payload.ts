import type { ProposalRecord } from '../proposal/proposal-types.ts';

import { buildNotionProposalChildren } from './notion-proposal-children.ts';
import { buildNotionProposalProperties } from './notion-proposal-properties.ts';
import type { NotionDatabaseProperties, NotionPagePayload } from './notion-types.ts';

export function buildNotionProposalPayload(
	record: ProposalRecord,
	databaseId: string,
	databaseProperties: NotionDatabaseProperties,
	configuredTitleProperty?: string,
): NotionPagePayload {
	return {
		parent: { database_id: databaseId },
		properties: buildNotionProposalProperties(record, databaseProperties, configuredTitleProperty),
		children: buildNotionProposalChildren(record),
	};
}
