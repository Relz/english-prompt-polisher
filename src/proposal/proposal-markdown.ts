import type { ProposalRecord } from './proposal-types.ts';

function fenced(value: string): string {
	const backtickRuns: string[] = value.match(/`+/g) ?? [];
	const longestBacktickRun: number = backtickRuns.reduce((longest, run) => Math.max(longest, run.length), 0);
	const fence: string = '`'.repeat(Math.max(3, longestBacktickRun + 1));
	return `${fence}\n${value}\n${fence}`;
}

function metadataLine(label: string, value: string): string {
	return `- ${label}: ${value.replace(/\r\n|\r|\n/g, '\n  ')}`;
}

export function formatProposalMarkdown(record: ProposalRecord, includeOriginal: boolean): string {
	const original: string = includeOriginal ? `\n### Original Prompt\n\n${fenced(record.originalPrompt)}\n` : '';
	return [
		`## ${record.createdAt}`,
		'',
		metadataLine('Conversation ID', record.conversationId),
		record.messageId ? metadataLine('Message ID', record.messageId) : undefined,
		metadataLine('Detected Language', record.detectedLanguage),
		metadataLine('Reason', record.reason),
		original.trimEnd(),
		'### Proposed English Prompt',
		'',
		fenced(record.proposedPrompt),
		'',
	]
		.filter((line) => line !== undefined)
		.join('\n');
}
