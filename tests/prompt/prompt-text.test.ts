import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

import { textFromParts } from '../../src/prompt/prompt-text.ts';
import type { ChatParts } from '../../src/shared/chat.ts';
import { textPart } from '../fixtures.ts';

type FileChatPart = ChatParts[number];

function filePart(overrides: Partial<FileChatPart> = {}): FileChatPart {
	const part: FileChatPart = {
		id: 'fil_123',
		type: 'file',
		mime: 'text/plain',
		url: 'file:///tmp/ignored.txt',
		...overrides,
	};
	return part;
}

void suite('prompt text helpers', () => {
	void test('textFromParts assembles only user-visible text parts', () => {
		// Arrange

		const parts: ChatParts = [
			textPart('  First line  '),
			filePart(),
			textPart('Ignored', { ignored: true }),
			textPart('Synthetic', { synthetic: true }),
			textPart(''),
			textPart('Second line'),
		];

		// Act

		const text: string = textFromParts(parts);

		// Assert

		assert.equal(text, 'First line\n\nSecond line');
	});

	void test('textFromParts returns empty text when there are no visible text parts', () => {
		// Arrange

		const filteredParts: ChatParts = [
			filePart(),
			textPart('   '),
			textPart('\n\t '),
			textPart('Ignored', { ignored: true }),
			textPart('Synthetic', { synthetic: true }),
		];

		// Act

		const emptyResult: string = textFromParts([]);
		const filteredResult: string = textFromParts(filteredParts);

		// Assert

		assert.equal(emptyResult, '');
		assert.equal(filteredResult, '');
	});

	void test('textFromParts preserves internal multiline formatting', () => {
		// Arrange

		const parts: ChatParts = [textPart('  line 1\nline 2  '), textPart('\nline 3\n')];

		// Act

		const text: string = textFromParts(parts);

		// Assert

		assert.equal(text, 'line 1\nline 2\n\nline 3');
	});

	void test('textFromParts preserves internal code-block indentation and blank lines', () => {
		// Arrange

		const parts: ChatParts = [
			textPart('\n```ts\nfunction example() {\n  return true;\n}\n```\n\nNext paragraph\n'),
		];

		// Act

		const text: string = textFromParts(parts);

		// Assert

		assert.equal(text, '```ts\nfunction example() {\n  return true;\n}\n```\n\nNext paragraph');
	});

	void test('textFromParts keeps explicitly visible text parts', () => {
		// Arrange

		const parts: ChatParts = [textPart('Visible', { ignored: false, synthetic: false })];

		// Act

		const text: string = textFromParts(parts);

		// Assert

		assert.equal(text, 'Visible');
	});
});
