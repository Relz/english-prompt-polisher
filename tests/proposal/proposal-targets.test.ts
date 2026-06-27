import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

import {
	resolveProposalFileTarget,
	resolveProposalOutputTargets,
	type ProposalFileTarget,
	type ProposalOutputTargets,
} from '../../src/proposal/proposal-targets.ts';
import type { Options } from '../../src/shared/options.ts';

void suite('resolveProposalFileTarget', () => {
	void test('applies file defaults', () => {
		// Arrange

		const config: Options = {};

		// Act

		const target: ProposalFileTarget = resolveProposalFileTarget(config);

		// Assert

		assert.deepEqual(target, { outputFile: '~/english-prompt-polisher.md', includeOriginal: true });
	});

	void test('preserves custom file options', () => {
		// Arrange

		const config: Options = { outputFile: '/tmp/proposals.md', includeOriginal: false };

		// Act

		const target: ProposalFileTarget = resolveProposalFileTarget(config);

		// Assert

		assert.deepEqual(target, { outputFile: '/tmp/proposals.md', includeOriginal: false });
	});
});

void suite('resolveProposalOutputTargets', () => {
	void test('applies file defaults and leaves Notion disabled', () => {
		// Arrange

		const config: Options = {};

		// Act

		const targets: ProposalOutputTargets = resolveProposalOutputTargets(config);

		// Assert

		assert.deepEqual(Object.keys(targets), ['file']);
		assert.equal(targets.file.includeOriginal, true);
	});

	void test('omits Notion when explicitly disabled and preserves file options', () => {
		// Arrange

		const config: Options = {
			outputFile: '/tmp/proposals.md',
			includeOriginal: false,
			notion: { enabled: false },
		};

		// Act

		const targets: ProposalOutputTargets = resolveProposalOutputTargets(config);

		// Assert

		assert.deepEqual(targets, {
			file: { outputFile: '/tmp/proposals.md', includeOriginal: false },
		});
	});

	void test('throws when Notion is enabled and config cannot be resolved', () => {
		// Arrange

		const config: Options = {
			outputFile: '/tmp/proposals.md',
			includeOriginal: false,
			notion: { enabled: true, databaseId: 'database' },
		};

		// Act & Assert

		assert.throws(() => resolveProposalOutputTargets(config), /notion\.token\b/);
	});

	void test('includes resolved Notion target when config can be resolved', () => {
		// Arrange

		const config: Options = {
			outputFile: '/tmp/proposals.md',
			includeOriginal: false,
			notion: { enabled: true, token: 'secret', databaseId: 'database', titleProperty: 'Prompt' },
		};

		// Act

		const targets: ProposalOutputTargets = resolveProposalOutputTargets(config);

		// Assert

		assert.deepEqual(targets, {
			file: { outputFile: '/tmp/proposals.md', includeOriginal: false },
			notion: { token: 'secret', databaseId: 'database', titleProperty: 'Prompt' },
		});
	});
});
