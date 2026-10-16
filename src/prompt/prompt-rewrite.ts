import type { PolisherResult } from '../checker/polisher-result.ts';
import type { ChatMessageInput } from '../shared/chat.ts';
import type { Options } from '../shared/options.ts';

import { hasUsablePromptProposal } from './prompt-proposal-result.ts';
import { shouldCheckPromptForRewrite } from './prompt-rewrite-policy.ts';

export type PromptRewriteDependencies = {
	checkPrompt: (input: ChatMessageInput, options: Options, prompt: string) => Promise<PolisherResult>;
};

export type PromptRewriteResult = { status: 'skipped' } | { status: 'rewritten'; proposedPrompt: string };

// Return a rewrite decision without mutating messages or writing proposal outputs.
export async function handlePromptRewrite(
	input: ChatMessageInput,
	prompt: string,
	options: Options,
	dependencies: PromptRewriteDependencies,
): Promise<PromptRewriteResult> {
	if (!shouldCheckPromptForRewrite(prompt, options)) {
		return { status: 'skipped' };
	}

	const result: PolisherResult = await dependencies.checkPrompt(input, options, prompt);
	if (!hasUsablePromptProposal(result, prompt)) {
		return { status: 'skipped' };
	}

	return { status: 'rewritten', proposedPrompt: result.proposedPrompt };
}
