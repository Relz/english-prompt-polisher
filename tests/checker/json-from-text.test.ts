import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

import { jsonFromText } from '../../src/checker/json-from-text.ts';

function testNameFromText(text: string): string {
	return text.replaceAll('\r', '\\r').replaceAll('\n', '\\n').replaceAll('\t', '\\t');
}

void suite('jsonFromText', () => {
	void test('parses plain object JSON', () => {
		// Arrange

		const text: string = '{"ok":true}';

		// Act

		const result: unknown = jsonFromText(text);

		// Assert

		assert.deepEqual(result, { ok: true });
	});

	const completeJsonCases: { text: string; expected: unknown }[] = [
		{ text: '{}', expected: {} },
		{ text: '[1,2]', expected: [1, 2] },
		{ text: '"value"', expected: 'value' },
		{ text: '""', expected: '' },
		{ text: 'true', expected: true },
		{ text: 'false', expected: false },
		{ text: '123', expected: 123 },
		{ text: '0', expected: 0 },
		{ text: 'null', expected: null },
	];

	for (const current of completeJsonCases) {
		void test(`parses complete JSON value ${testNameFromText(current.text)}`, () => {
			// Act

			const result: unknown = jsonFromText(current.text);

			// Assert

			assert.deepEqual(result, current.expected, current.text);
		});
	}

	void test('trims complete JSON input', () => {
		// Arrange

		const text: string = ' \n\t {"ok":true} \n';

		// Act

		const result: unknown = jsonFromText(text);

		// Assert

		assert.deepEqual(result, { ok: true });
	});

	const fencedJsonCases: { text: string; expected: unknown }[] = [
		{ text: '```json\n{"ok":true}\n```', expected: { ok: true } },
		{ text: '```JSON\n{"ok":true}\n```', expected: { ok: true } },
		{ text: '``` json\n[1,2]\n```', expected: [1, 2] },
		{ text: '```json   \n{"ok":true}\n```', expected: { ok: true } },
		{ text: '```\tjson\t\n{"ok":true}\n```', expected: { ok: true } },
		{ text: '```json\n{\n  "ok": true\n}\n```', expected: { ok: true } },
		{ text: '```json\r\n{"ok":true}\r\n```', expected: { ok: true } },
		{ text: '```json\n{"ok":true}   \n```', expected: { ok: true } },
		{ text: '```\n{"ok":true}\n```', expected: { ok: true } },
	];

	for (const current of fencedJsonCases) {
		void test(`recovers JSON from fenced text ${testNameFromText(current.text)}`, () => {
			// Act

			const result: unknown = jsonFromText(current.text);

			// Assert

			assert.deepEqual(result, current.expected, current.text);
		});
	}

	const fencedScalarJsonCases: { text: string; expected: unknown }[] = [
		{ text: '```json\ntrue\n```', expected: true },
		{ text: '```json\n"value"\n```', expected: 'value' },
		{ text: '```json\nnull\n```', expected: null },
	];

	for (const current of fencedScalarJsonCases) {
		void test(`recovers fenced scalar JSON value ${testNameFromText(current.text)}`, () => {
			// Act

			const result: unknown = jsonFromText(current.text);

			// Assert

			assert.deepEqual(result, current.expected, current.text);
		});
	}

	void test('recovers fenced JSON surrounded by prose', () => {
		// Arrange

		const text: string = 'Result:\n```json\n{"ok":true}\n```\nDone.';

		// Act

		const result: unknown = jsonFromText(text);

		// Assert

		assert.deepEqual(result, { ok: true });
	});

	const fencedJsonPreferenceCases: { text: string; expected: unknown }[] = [
		{ text: 'Result {not json}:\n```json\n{"ok":true}\n```', expected: { ok: true } },
		{ text: 'Result:\n```json\n{"ok":true}\n```\nDone {ignored}', expected: { ok: true } },
	];

	for (const current of fencedJsonPreferenceCases) {
		void test(`prefers fenced JSON over surrounding brace-like prose ${testNameFromText(current.text)}`, () => {
			// Act

			const result: unknown = jsonFromText(current.text);

			// Assert

			assert.deepEqual(result, current.expected, current.text);
		});
	}

	const firstValidFencedJsonCases: { text: string; expected: unknown }[] = [
		{
			text: '```json\n{"ok":}\n```\n```json\n{"ok":true}\n```',
			expected: { ok: true },
		},
		{
			text: '```json\n{"first":true}\n```\n```json\n{"second":true}\n```',
			expected: { first: true },
		},
		{ text: '```json\nnot json\n```\n```json\n[1,2]\n```', expected: [1, 2] },
	];

	for (const current of firstValidFencedJsonCases) {
		void test(`returns first valid fenced JSON block ${testNameFromText(current.text)}`, () => {
			// Act

			const result: unknown = jsonFromText(current.text);

			// Assert

			assert.deepEqual(result, current.expected, current.text);
		});
	}

	const emptyFencedJsonCases: { text: string; expected: unknown }[] = [
		{ text: '```json\n\n```\n```json\n{"ok":true}\n```', expected: { ok: true } },
		{ text: '```json\n   \n```\n```json\n[1,2]\n```', expected: [1, 2] },
	];

	for (const current of emptyFencedJsonCases) {
		void test(`skips empty fenced JSON block ${testNameFromText(current.text)}`, () => {
			// Act

			const result: unknown = jsonFromText(current.text);

			// Assert

			assert.deepEqual(result, current.expected, current.text);
		});
	}

	const embeddedObjectJsonCases: { text: string; expected: unknown }[] = [
		{ text: 'Result: {}', expected: {} },
		{ text: 'Result: {"ok":true,"nested":{"count":1}}', expected: { ok: true, nested: { count: 1 } } },
		{
			text: 'Result: {"text":"use {braces} literally","ok":true}',
			expected: { text: 'use {braces} literally', ok: true },
		},
		{ text: 'Result: {"ok":true}.', expected: { ok: true } },
		{ text: 'Before\n{"ok":true}\nAfter', expected: { ok: true } },
		{ text: 'Result: {"items":[{"ok":true}]}', expected: { items: [{ ok: true }] } },
	];

	for (const current of embeddedObjectJsonCases) {
		void test(`recovers embedded object JSON ${testNameFromText(current.text)}`, () => {
			// Act

			const result: unknown = jsonFromText(current.text);

			// Assert

			assert.deepEqual(result, current.expected, current.text);
		});
	}

	const embeddedScalarJsonCases: string[] = [
		'Result: true',
		'Result: false',
		'Result: "value"',
		'Result: 123',
		'Result: null',
	];

	for (const text of embeddedScalarJsonCases) {
		void test(`returns undefined for embedded scalar JSON in prose ${testNameFromText(text)}`, () => {
			// Act

			const result: unknown = jsonFromText(text);

			// Assert

			assert.equal(result, undefined, text);
		});
	}

	const emptyInvalidOrNonJsonCases: string[] = ['', ' \n\t ', '{"ok":}', 'not json'];

	for (const text of emptyInvalidOrNonJsonCases) {
		void test(`returns undefined for empty, invalid, or non-json text ${testNameFromText(text)}`, () => {
			// Act

			const result: unknown = jsonFromText(text);

			// Assert

			assert.equal(result, undefined, text);
		});
	}

	const malformedJsonCases: string[] = ['```json\n{"ok":}\n```', '```json\n\n```', 'Result: {"ok":}'];

	for (const text of malformedJsonCases) {
		void test(`returns undefined for malformed fenced or embedded JSON ${testNameFromText(text)}`, () => {
			// Act

			const result: unknown = jsonFromText(text);

			// Assert

			assert.equal(result, undefined, text);
		});
	}

	const unsupportedFencedCodeCases: string[] = ['```ts\n{"ok":true}\n```', '```text\n{"ok":true}\n```'];

	for (const text of unsupportedFencedCodeCases) {
		void test(`returns undefined for unsupported fenced code block ${testNameFromText(text)}`, () => {
			// Act

			const result: unknown = jsonFromText(text);

			// Assert

			assert.equal(result, undefined, text);
		});
	}

	void test('skips unsupported fenced code blocks before supported JSON fences', () => {
		// Arrange

		const text: string = '```ts\n{"ignored":true}\n```\n```json\n{"ok":true}\n```';

		// Act

		const result: unknown = jsonFromText(text);

		// Assert

		assert.deepEqual(result, { ok: true });
	});

	void test('ignores unsupported fenced code blocks during embedded object recovery', () => {
		// Arrange

		const text: string = '```ts\n{"ignored":true}\n```\nResult: {"ok":true}';

		// Act

		const result: unknown = jsonFromText(text);

		// Assert

		assert.deepEqual(result, { ok: true });
	});

	void test('ignores unsupported fenced code blocks after embedded object recovery', () => {
		// Arrange

		const text: string = 'Result: {"ok":true}\n```ts\n{"ignored":true}\n```';

		// Act

		const result: unknown = jsonFromText(text);

		// Assert

		assert.deepEqual(result, { ok: true });
	});

	const unsupportedEmbeddedJsonShapeCases: string[] = [
		'Result: [1,2]',
		'Result: [{"ok":true}]',
		'First: {"one":1} Second: {"two":2}',
	];

	for (const text of unsupportedEmbeddedJsonShapeCases) {
		void test(`does not recover unsupported embedded JSON shape ${testNameFromText(text)}`, () => {
			// Act

			const result: unknown = jsonFromText(text);

			// Assert

			assert.equal(result, undefined, text);
		});
	}
});
