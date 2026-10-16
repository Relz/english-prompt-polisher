import type { PolisherResult } from '../checker/polisher-result.ts';

export function hasUsablePromptProposal(result: PolisherResult, originalPrompt: string): boolean {
	return result.needsProposal && result.proposedPrompt.trim().length > 0 && result.proposedPrompt !== originalPrompt;
}
