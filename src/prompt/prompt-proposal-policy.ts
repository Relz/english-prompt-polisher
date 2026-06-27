import { isInternalPrompt } from '../shared/internal-prompt.ts';
import type { Options } from '../shared/options.ts';

const DEFAULT_MAX_CHARS: number = 4000;

export function maxPromptChars(options: Options): number {
	return typeof options.maxChars === 'number' && Number.isSafeInteger(options.maxChars) && options.maxChars > 0
		? options.maxChars
		: DEFAULT_MAX_CHARS;
}

export function shouldCheckPromptForProposal(prompt: string): boolean {
	return prompt.trim().length > 0 && !isInternalPrompt(prompt);
}
