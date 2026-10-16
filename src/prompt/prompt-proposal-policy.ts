import { isInternalPrompt } from '../shared/internal-prompt.ts';
import { positiveIntegerOption, type Options } from '../shared/options.ts';

export function maxPromptChars(options: Options): number | undefined {
	return positiveIntegerOption(options.maxChars);
}

export function shouldCheckPromptForProposal(prompt: string, options: Options = {}): boolean {
	const maxChars: number | undefined = maxPromptChars(options);
	return (
		prompt.trim().length > 0 &&
		!isInternalPrompt(prompt) &&
		(maxChars === undefined || Array.from(prompt).length <= maxChars)
	);
}
