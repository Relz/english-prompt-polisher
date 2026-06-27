import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

import { chunkText } from '../../src/shared/text-chunks.ts';

void suite('chunkText', () => {
	void test('returns one empty chunk for empty text', () => {
		// Arrange

		const text: string = '';

		// Act

		const chunks: string[] = chunkText(text, 3);

		// Assert

		assert.deepEqual(chunks, ['']);
	});

	void test('returns one chunk when text does not exceed the limit', () => {
		// Arrange

		const cases: { text: string; maxLength: number }[] = [
			{ text: 'ab', maxLength: 3 },
			{ text: 'abc', maxLength: 3 },
			{ text: 'abc', maxLength: 100 },
		];

		// Act, Assert

		for (const current of cases) {
			assert.deepEqual(chunkText(current.text, current.maxLength), [current.text]);
		}
	});

	void test('splits long text into fixed-size chunks', () => {
		// Arrange

		const text: string = 'abcdefg';

		// Act

		const chunks: string[] = chunkText(text, 3);

		// Assert

		assert.deepEqual(chunks, ['abc', 'def', 'g']);
	});

	const reassemblyCases: { name: string; text: string; maxLength: number }[] = [
		{ name: 'multiline text', text: 'abc def\n12345', maxLength: 4 },
		{ name: 'whitespace text', text: ' a\nb\tc', maxLength: 2 },
	];

	for (const current of reassemblyCases) {
		void test(`returns chunks that reassemble ${current.name}`, () => {
			// Act

			const chunks: string[] = chunkText(current.text, current.maxLength);

			// Assert

			assert.equal(chunks.join(''), current.text);
			assert.ok(chunks.every((chunk: string) => chunk.length <= current.maxLength));
		});
	}

	void test('does not add a trailing empty chunk for divisible text lengths', () => {
		// Arrange

		const text: string = 'abcdef';

		// Act

		const chunks: string[] = chunkText(text, 3);

		// Assert

		assert.deepEqual(chunks, ['abc', 'def']);
	});

	void test('splits into single characters when the limit is one', () => {
		// Arrange

		const text: string = 'abc';

		// Act

		const chunks: string[] = chunkText(text, 1);

		// Assert

		assert.deepEqual(chunks, ['a', 'b', 'c']);
	});

	const invalidLengths: number[] = [0, -1, 2.5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];

	for (const invalidLength of invalidLengths) {
		void test(`rejects invalid chunk length ${String(invalidLength)}`, () => {
			// Act, Assert

			assert.throws(
				(): string[] => chunkText('abc', invalidLength),
				Error,
				`Expected ${String(invalidLength)} to be rejected`,
			);
		});
	}

	void test('rejects invalid chunk length for empty text', () => {
		// Act, Assert

		assert.throws((): string[] => chunkText('', 0));
	});
});
