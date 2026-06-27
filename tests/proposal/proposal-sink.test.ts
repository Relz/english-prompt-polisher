import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

import {
	skippedProposalSink,
	writeProposalSink,
	type ProposalOutputSinkResult,
	type ProposalSink,
} from '../../src/proposal/proposal-sink.ts';

void suite('skippedProposalSink', () => {
	void test('builds a sink that resolves skipped', async () => {
		// Act

		const sink: ProposalSink = skippedProposalSink('notion');
		const status: 'skipped' | 'written' = await sink.write();

		// Assert

		assert.equal(sink.sink, 'notion');
		assert.equal(status, 'skipped');
	});
});

void suite('writeProposalSink', () => {
	void test('returns a written result with the configured success message', async () => {
		// Arrange

		let calls: number = 0;
		const sink: ProposalSink = {
			sink: 'file',
			writtenMessage: 'Wrote proposal file',
			failedMessage: 'Failed to write proposal file',
			write: () => {
				calls += 1;
				return Promise.resolve('written');
			},
		};

		// Act

		const result: ProposalOutputSinkResult = await writeProposalSink(sink);

		// Assert

		assert.deepEqual(result, {
			sink: 'file',
			status: 'written',
			message: 'Wrote proposal file',
		});
		assert.equal(calls, 1);
	});

	void test('returns a skipped result without a message', async () => {
		// Arrange

		let calls: number = 0;
		const sink: ProposalSink = {
			sink: 'notion',
			writtenMessage: 'Wrote proposal to Notion',
			failedMessage: 'Failed to write proposal to Notion',
			write: () => {
				calls += 1;
				return Promise.resolve('skipped');
			},
		};

		// Act

		const result: ProposalOutputSinkResult = await writeProposalSink(sink);

		// Assert

		assert.deepEqual(result, { sink: 'notion', status: 'skipped' });
		assert.equal(calls, 1);
	});

	void test('returns a failed result with the configured failure message and original error', async () => {
		// Arrange

		let calls: number = 0;
		const error: Error = new Error('write failed');
		const sink: ProposalSink = {
			sink: 'file',
			writtenMessage: 'Wrote proposal file',
			failedMessage: 'Failed to write proposal file',
			write: () => {
				calls += 1;
				return Promise.reject(error);
			},
		};

		// Act

		const result: ProposalOutputSinkResult = await writeProposalSink(sink);

		// Assert

		if (result.status !== 'failed') {
			assert.fail('Expected failed sink result');
		}
		assert.deepEqual(
			{ sink: result.sink, status: result.status, message: result.message },
			{
				sink: 'file',
				status: 'failed',
				message: 'Failed to write proposal file',
			},
		);
		assert.equal(result.error, error);
		assert.equal(calls, 1);
	});

	void test('returns a failed result when write throws synchronously', async () => {
		// Arrange

		let calls: number = 0;
		const error: Error = new Error('write failed');
		const sink: ProposalSink = {
			sink: 'file',
			writtenMessage: 'Wrote proposal file',
			failedMessage: 'Failed to write proposal file',
			write: () => {
				calls += 1;
				throw error;
			},
		};

		// Act

		const result: ProposalOutputSinkResult = await writeProposalSink(sink);

		// Assert

		if (result.status !== 'failed') {
			assert.fail('Expected failed sink result');
		}
		assert.deepEqual(
			{ sink: result.sink, status: result.status, message: result.message },
			{
				sink: 'file',
				status: 'failed',
				message: 'Failed to write proposal file',
			},
		);
		assert.equal(result.error, error);
		assert.equal(calls, 1);
	});

	void test('preserves non-Error rejection values in failed results', async () => {
		// Arrange

		let calls: number = 0;
		const error: string = 'write failed';
		const sink: ProposalSink = {
			sink: 'file',
			writtenMessage: 'Wrote proposal file',
			failedMessage: 'Failed to write proposal file',
			write: () => {
				calls += 1;
				// eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- Testing preservation of non-Error rejection values.
				return Promise.reject(error);
			},
		};

		// Act

		const result: ProposalOutputSinkResult = await writeProposalSink(sink);

		// Assert

		assert.deepEqual(result, {
			sink: 'file',
			status: 'failed',
			message: 'Failed to write proposal file',
			error,
		});
		assert.equal(calls, 1);
	});
});
