import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

import { logProposalOutputResults } from '../../src/proposal/proposal-output-log.ts';
import type { ProposalOutputResult } from '../../src/proposal/proposal-output.ts';
import type { ProposalRecord } from '../../src/proposal/proposal-types.ts';

const record: ProposalRecord = {
	needsProposal: true,
	detectedLanguage: 'Spanish',
	reason: 'Prompt is not English.',
	originalPrompt: 'Crea una CLI.',
	proposedPrompt: 'Create a CLI.',
	conversationId: 'conversation_123',
	messageId: 'message_456',
	createdAt: '2026-06-13T12:00:00.000Z',
};

void suite('logProposalOutputResults', () => {
	void test('logs written and failed sinks only', async () => {
		// Arrange

		const output: ProposalOutputResult = [
			{ sink: 'file', status: 'written', message: 'Wrote proposal file' },
			{ sink: 'notion', status: 'skipped' },
			{
				sink: 'archive',
				status: 'failed',
				message: 'Failed to archive proposal',
				error: new Error('archive exploded'),
			},
		];
		const logs: { level: string; message: string; extra?: Record<string, unknown> }[] = [];

		// Act

		await logProposalOutputResults(record, output, (level, message, extra): Promise<void> => {
			logs.push({ level, message, extra });
			return Promise.resolve();
		});

		// Assert

		assert.deepEqual(
			logs.map(({ level, message }) => ({ level, message })),
			[
				{ level: 'info', message: 'Wrote proposal file' },
				{ level: 'warn', message: 'Failed to archive proposal' },
			],
		);
		assert.deepEqual(logs[0].extra, { conversationId: 'conversation_123', messageId: 'message_456', sink: 'file' });
		assert.deepEqual(logs[1].extra, {
			conversationId: 'conversation_123',
			messageId: 'message_456',
			sink: 'archive',
			error: 'archive exploded',
		});
	});

	void test('does not log empty output', async () => {
		// Arrange

		const output: ProposalOutputResult = [];
		const logs: { level: string; message: string; extra?: Record<string, unknown> }[] = [];

		// Act

		await logProposalOutputResults(record, output, (level, message, extra): Promise<void> => {
			logs.push({ level, message, extra });
			return Promise.resolve();
		});

		// Assert

		assert.deepEqual(logs, []);
	});

	void test('does not log skipped sinks', async () => {
		// Arrange

		const output: ProposalOutputResult = [
			{ sink: 'notion', status: 'skipped' },
			{ sink: 'archive', status: 'skipped' },
		];
		const logs: { level: string; message: string; extra?: Record<string, unknown> }[] = [];

		// Act

		await logProposalOutputResults(record, output, (level, message, extra): Promise<void> => {
			logs.push({ level, message, extra });
			return Promise.resolve();
		});

		// Assert

		assert.deepEqual(logs, []);
	});

	void test('stringifies non-Error failed sink errors', async () => {
		// Arrange

		const output: ProposalOutputResult = [
			{ sink: 'file', status: 'failed', message: 'Failed to write proposal file', error: 'disk full' },
			{ sink: 'archive', status: 'failed', message: 'Failed to archive proposal', error: 503 },
		];
		const logs: { level: string; message: string; extra?: Record<string, unknown> }[] = [];

		// Act

		await logProposalOutputResults(record, output, (level, message, extra): Promise<void> => {
			logs.push({ level, message, extra });
			return Promise.resolve();
		});

		// Assert

		assert.deepEqual(logs, [
			{
				level: 'warn',
				message: 'Failed to write proposal file',
				extra: {
					conversationId: 'conversation_123',
					messageId: 'message_456',
					sink: 'file',
					error: 'disk full',
				},
			},
			{
				level: 'warn',
				message: 'Failed to archive proposal',
				extra: { conversationId: 'conversation_123', messageId: 'message_456', sink: 'archive', error: '503' },
			},
		]);
	});

	void test('logs output when message ID is omitted from the record', async () => {
		// Arrange

		const recordWithoutMessageId: ProposalRecord = {
			needsProposal: true,
			detectedLanguage: 'Spanish',
			reason: 'Prompt is not English.',
			originalPrompt: 'Crea una CLI.',
			proposedPrompt: 'Create a CLI.',
			conversationId: 'conversation_123',
			createdAt: '2026-06-13T12:00:00.000Z',
		};
		const output: ProposalOutputResult = [{ sink: 'file', status: 'written', message: 'Wrote proposal file' }];
		const logs: { level: string; message: string; extra?: Record<string, unknown> }[] = [];

		// Act

		await logProposalOutputResults(recordWithoutMessageId, output, (level, message, extra): Promise<void> => {
			logs.push({ level, message, extra });
			return Promise.resolve();
		});

		// Assert

		assert.equal(logs.length, 1);
		assert.equal(logs[0].level, 'info');
		assert.equal(logs[0].message, 'Wrote proposal file');
		assert.deepEqual(logs[0].extra, { conversationId: 'conversation_123', sink: 'file' });
	});

	void test('uses a no-op logger when writeLog is omitted', async () => {
		// Arrange

		const output: ProposalOutputResult = [{ sink: 'file', status: 'written', message: 'Wrote proposal file' }];

		// Act & Assert

		await assert.doesNotReject((): Promise<void> => logProposalOutputResults(record, output));
	});

	void test('awaits injected log writes in output order', async () => {
		// Arrange

		const output: ProposalOutputResult = [
			{ sink: 'file', status: 'written', message: 'Wrote proposal file' },
			{
				sink: 'archive',
				status: 'failed',
				message: 'Failed to archive proposal',
				error: new Error('archive exploded'),
			},
		];
		const events: string[] = [];

		// Act

		await logProposalOutputResults(record, output, async (_level, message): Promise<void> => {
			events.push(`start:${message}`);
			await Promise.resolve();
			events.push(`end:${message}`);
		});

		// Assert

		assert.deepEqual(events, [
			'start:Wrote proposal file',
			'end:Wrote proposal file',
			'start:Failed to archive proposal',
			'end:Failed to archive proposal',
		]);
	});

	void test('propagates injected writeLog failures', async () => {
		// Arrange

		const output: ProposalOutputResult = [{ sink: 'file', status: 'written', message: 'Wrote proposal file' }];

		// Act & Assert

		await assert.rejects(
			() =>
				logProposalOutputResults(record, output, (): Promise<void> => {
					return Promise.reject(new Error('writeLog failed'));
				}),
			/writeLog failed/,
		);
	});
});
