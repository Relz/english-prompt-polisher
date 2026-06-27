import type { ChatParts, TextChatPart } from '../shared/chat.ts';

export function truncatePrompt(value: string, maxChars: number): string {
	// Unicode code points keep surrogate pairs intact while truncating.
	const chars: string[] = Array.from(value);
	if (chars.length <= maxChars) {
		return value;
	}
	return `${chars.slice(0, maxChars).join('')}\n\n[Prompt truncated by english-prompt-polisher at ${maxChars} characters.]`;
}

function isTextPart(part: ChatParts[number]): part is TextChatPart {
	return part.type === 'text' && typeof part.text === 'string';
}

export function textFromParts(parts: ChatParts): string {
	return parts
		.filter(isTextPart)
		.filter((part) => part.synthetic !== true && part.ignored !== true)
		.map((part) => part.text.trim())
		.filter((text) => text.length > 0)
		.join('\n\n')
		.trim();
}
