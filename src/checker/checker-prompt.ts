import { INTERNAL_PROMPT_MARKER } from '../shared/internal-prompt.ts';

export const CHECKER_SYSTEM_PROMPT: string =
	'You only inspect and polish user prompts. You must not call tools or perform the requested task.';

export function buildCheckerPrompt(prompt: string): string {
	return `${INTERNAL_PROMPT_MARKER}\n\nYou are checking a user's prompt before it is sent to an AI assistant.\n\nTask:\n- Determine whether the prompt is written in correct, natural English.\n- If the prompt is not English, translate it into English.\n- If the prompt is English but contains grammar, wording, or clarity problems, produce a polished English version.\n- If the prompt is already correct, natural English, set needsProposal to false and keep proposedPrompt equal to the original prompt.\n\nRules:\n- Preserve the user's intent exactly.\n- Preserve code, commands, file paths, package names, API names, product names, identifiers, quoted strings, and technical terms.\n- Do not add requirements that are not present in the original prompt.\n- Do not answer the user's prompt. Only inspect and polish it.\n- Return only a JSON object that matches this TypeScript type:\n  { needsProposal: boolean; detectedLanguage: string; reason: string; proposedPrompt: string }\n\nOriginal prompt:\n<<<PROMPT\n${prompt}\nPROMPT>>>`;
}
