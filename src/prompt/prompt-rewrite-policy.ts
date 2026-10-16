import type { Options } from '../shared/options.ts';

import { shouldCheckPromptForProposal } from './prompt-proposal-policy.ts';

export function shouldCheckPromptForRewrite(prompt: string, options: Options = {}): boolean {
	return shouldCheckPromptForProposal(prompt, options);
}
