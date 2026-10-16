import type { PolisherResult } from '../checker/polisher-result.ts';
import type { ProposalRecord } from '../proposal/proposal-types.ts';
import type { ChatMessageInput } from '../shared/chat.ts';

import type { PromptProposalCandidate } from './prompt-proposal-candidate.ts';
import { hasUsablePromptProposal } from './prompt-proposal-result.ts';

export function createPromptProposalRecord(
	input: ChatMessageInput,
	candidate: PromptProposalCandidate,
	result: PolisherResult,
	createdAt: string,
): ProposalRecord | undefined {
	if (!hasUsablePromptProposal(result, candidate.originalPrompt)) {
		return;
	}

	return {
		...result,
		originalPrompt: candidate.originalPrompt,
		conversationId: input.conversationId,
		messageId: input.messageId,
		createdAt,
	};
}
