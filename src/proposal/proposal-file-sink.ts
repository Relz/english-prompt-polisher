import { appendProposalFile } from './proposal-file.ts';
import { formatProposalMarkdown } from './proposal-markdown.ts';
import type { ProposalSink } from './proposal-sink.ts';
import type { ProposalFileTarget } from './proposal-targets.ts';
import type { ProposalRecord } from './proposal-types.ts';

export function proposalFileSink(record: ProposalRecord, target: ProposalFileTarget): ProposalSink {
	return {
		sink: 'file',
		writtenMessage: 'Wrote English prompt proposal file',
		failedMessage: 'Failed to write English prompt proposal file',
		write: async (): Promise<'written'> => {
			await appendProposalFile(target.outputFile, formatProposalMarkdown(record, target.includeOriginal));
			return 'written';
		},
	};
}
