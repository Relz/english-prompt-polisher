import { formatUnknownError } from '../shared/error.ts';
import { noopLog, type WriteLog } from '../shared/log.ts';

import type { ProposalOutputResult } from './proposal-output.ts';
import type { ProposalRecord } from './proposal-types.ts';

export async function logProposalOutputResults(
	record: ProposalRecord,
	output: ProposalOutputResult,
	writeLog: WriteLog = noopLog,
): Promise<void> {
	const extra: Record<string, string> = { conversationId: record.conversationId };
	if (record.messageId !== undefined) {
		extra.messageId = record.messageId;
	}

	for (const result of output) {
		if (result.status === 'written') {
			await writeLog('info', result.message, { ...extra, sink: result.sink });
		} else if (result.status === 'failed') {
			await writeLog('warn', result.message, {
				...extra,
				sink: result.sink,
				error: formatUnknownError(result.error),
			});
		}
	}
}
