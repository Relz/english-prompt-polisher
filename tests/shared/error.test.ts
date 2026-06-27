import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

import { formatUnknownError } from '../../src/shared/error.ts';

void suite('formatUnknownError', () => {
	void test('uses Error messages', () => {
		assert.equal(formatUnknownError(new Error('boom')), 'boom');
	});

	void test('stringifies non-Error values', () => {
		assert.equal(formatUnknownError('plain failure'), 'plain failure');
		assert.equal(formatUnknownError(42), '42');
	});
});
