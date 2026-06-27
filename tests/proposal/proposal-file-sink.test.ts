import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { suite, test } from 'node:test';

import { proposalFileSink } from '../../src/proposal/proposal-file-sink.ts';
import { formatProposalMarkdown } from '../../src/proposal/proposal-markdown.ts';
import type { ProposalSink } from '../../src/proposal/proposal-sink.ts';
import type { ProposalFileTarget } from '../../src/proposal/proposal-targets.ts';
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

void suite('proposalFileSink', () => {
	void test('builds the file sink adapter', () => {
		// Arrange

		const target: ProposalFileTarget = { outputFile: '/tmp/proposals.md', includeOriginal: true };

		// Act

		const sink: ProposalSink = proposalFileSink(record, target);

		// Assert

		assert.equal(sink.sink, 'file');
		assert.equal(sink.writtenMessage, 'Wrote English prompt proposal file');
		assert.equal(sink.failedMessage, 'Failed to write English prompt proposal file');
	});

	void test('writes formatted proposal markdown to the target file', async (t) => {
		// Arrange

		const directory: string = await mkdtemp(join(tmpdir(), 'english-prompt-polisher-'));
		const outputFile: string = join(directory, 'proposals.md');
		const target: ProposalFileTarget = { outputFile, includeOriginal: true };
		const sink: ProposalSink = proposalFileSink(record, target);

		t.after(async () => {
			await rm(directory, { recursive: true, force: true });
		});

		// Act

		const status: 'written' | 'skipped' = await sink.write();

		// Assert

		assert.equal(status, 'written');
		const contents: string = await readFile(outputFile, 'utf8');
		assert.equal(contents, `\n${formatProposalMarkdown(record, true)}`);
	});

	void test('honors includeOriginal false', async (t) => {
		// Arrange

		const directory: string = await mkdtemp(join(tmpdir(), 'english-prompt-polisher-'));
		const outputFile: string = join(directory, 'proposals.md');
		const target: ProposalFileTarget = { outputFile, includeOriginal: false };
		const sink: ProposalSink = proposalFileSink(record, target);

		t.after(async () => {
			await rm(directory, { recursive: true, force: true });
		});

		// Act

		const status: 'written' | 'skipped' = await sink.write();

		// Assert

		assert.equal(status, 'written');
		const contents: string = await readFile(outputFile, 'utf8');
		assert.equal(contents, `\n${formatProposalMarkdown(record, false)}`);
	});

	void test('propagates write failures', async (t) => {
		// Arrange

		const directory: string = await mkdtemp(join(tmpdir(), 'english-prompt-polisher-'));
		const outputFile: string = join(directory, 'missing', 'proposals.md');
		const target: ProposalFileTarget = { outputFile, includeOriginal: true };
		const sink: ProposalSink = proposalFileSink(record, target);

		t.after(async () => {
			await rm(directory, { recursive: true, force: true });
		});

		// Act and assert

		await assert.rejects(sink.write(), Error);
	});
});
