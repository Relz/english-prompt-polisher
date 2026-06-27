import type { ChatParts } from '../shared/chat.ts';

import { jsonFromText } from './json-from-text.ts';
import { polisherResultFromUnknown, type PolisherResult } from './polisher-result.ts';

export function resultFromParts(parts: ChatParts): PolisherResult | undefined {
	for (const part of parts) {
		if (part.type !== 'text' || typeof part.text !== 'string') {
			continue;
		}
		const parsed: PolisherResult | undefined = polisherResultFromUnknown(jsonFromText(part.text));
		if (parsed) {
			return parsed;
		}
	}
}
