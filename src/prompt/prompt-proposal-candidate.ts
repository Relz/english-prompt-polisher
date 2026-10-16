import type { ChatMessageOutput } from '../shared/chat.ts';
import type { Options } from '../shared/options.ts';

import { shouldCheckPromptForProposal } from './prompt-proposal-policy.ts';
import { textFromParts } from './prompt-text.ts';

export type PromptProposalCandidate = {
	originalPrompt: string;
};

export function createPromptProposalCandidate(
	output: ChatMessageOutput,
	options: Options = {},
): PromptProposalCandidate | undefined {
	const promptText: string = textFromParts(output.parts);
	if (!shouldCheckPromptForProposal(promptText, options)) {
		return;
	}

	return { originalPrompt: promptText };
}
