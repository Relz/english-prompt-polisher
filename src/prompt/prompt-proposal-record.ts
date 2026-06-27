import type { PolisherResult } from '../checker/polisher-result.ts';
import type { ProposalRecord } from '../proposal/proposal-types.ts';
import type { ChatMessageInput } from '../shared/chat.ts';

import type { PromptProposalCandidate } from './prompt-proposal-candidate.ts';

export function shouldCreatePromptProposalRecord(result: PolisherResult, originalPrompt: string): boolean {
	return result.needsProposal && result.proposedPrompt.trim().length > 0 && result.proposedPrompt !== originalPrompt;
}

export function createPromptProposalRecord(
	input: ChatMessageInput,
	candidate: PromptProposalCandidate,
	result: PolisherResult,
	createdAt: string,
): ProposalRecord | undefined {
	if (!shouldCreatePromptProposalRecord(result, candidate.originalPrompt)) {
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
