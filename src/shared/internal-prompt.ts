export const INTERNAL_PROMPT_MARKER: string = 'english-prompt-polisher:internal-check';

export function isInternalPrompt(prompt: string): boolean {
	return prompt.includes(INTERNAL_PROMPT_MARKER);
}
