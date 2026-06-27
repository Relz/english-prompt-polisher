import type { NotionConfig } from '../notion/notion-config.ts';
import { writeNotionProposal } from '../notion/notion-proposal.ts';

import { skippedProposalSink, type ProposalSink } from './proposal-sink.ts';
import type { ProposalRecord } from './proposal-types.ts';

export function proposalNotionSink(record: ProposalRecord, config: NotionConfig | undefined): ProposalSink {
	if (!config) {
		return skippedProposalSink('notion');
	}

	return {
		sink: 'notion',
		writtenMessage: 'Wrote English prompt proposal to Notion',
		failedMessage: 'Failed to write English prompt proposal to Notion',
		write: async (): Promise<'written'> => {
			await writeNotionProposal(record, config);
			return 'written';
		},
	};
}
