import type { ProposalRecord } from '../proposal/proposal-types.ts';

import { splitBlocks } from './notion-blocks.ts';

export function buildNotionProposalChildren(record: ProposalRecord): Record<string, unknown>[] {
	return [
		...splitBlocks('Reason', record.reason),
		...splitBlocks('Original Prompt', record.originalPrompt),
		...splitBlocks('Proposed English Prompt', record.proposedPrompt),
	];
}
