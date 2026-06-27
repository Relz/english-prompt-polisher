import type { ChatParts } from '../shared/chat.ts';

import type { PolisherResult } from './polisher-result.ts';
import { resultFromParts } from './result.ts';

export function parseCheckerResult(parts: ChatParts): PolisherResult {
	const parsed: PolisherResult | undefined = resultFromParts(parts);
	if (parsed) {
		return parsed;
	}

	throw new Error('Checker response did not contain a valid polisher JSON object');
}
