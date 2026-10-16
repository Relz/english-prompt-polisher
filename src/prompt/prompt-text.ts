import type { ChatParts, TextChatPart } from '../shared/chat.ts';

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
