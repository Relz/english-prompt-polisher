export type ProposalRecord = {
	needsProposal: boolean;
	detectedLanguage: string;
	reason: string;
	proposedPrompt: string;
	originalPrompt: string;
	conversationId: string;
	messageId?: string;
	createdAt: string;
};
