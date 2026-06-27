export type PolisherResult = {
	needsProposal: boolean;
	detectedLanguage: string;
	reason: string;
	proposedPrompt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object';
}

export function polisherResultFromUnknown(value: unknown): PolisherResult | undefined {
	if (!isRecord(value)) {
		return;
	}
	const row: Record<string, unknown> = value;
	if (typeof row.needsProposal !== 'boolean') {
		return;
	}
	if (typeof row.detectedLanguage !== 'string') {
		return;
	}
	if (typeof row.reason !== 'string') {
		return;
	}
	if (typeof row.proposedPrompt !== 'string') {
		return;
	}

	return {
		needsProposal: row.needsProposal,
		detectedLanguage: row.detectedLanguage,
		reason: row.reason,
		proposedPrompt: row.proposedPrompt.trim(),
	};
}
