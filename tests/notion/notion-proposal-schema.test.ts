import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

import { hasNotionPropertyType, notionTitlePropertyName } from '../../src/notion/notion-proposal-schema.ts';
import type { NotionDatabaseProperties } from '../../src/notion/notion-types.ts';

void suite('notionTitlePropertyName', () => {
	void test('returns configured title property even when absent from schema', () => {
		// Arrange

		const properties: NotionDatabaseProperties = {
			Prompt: { type: 'title' },
		};

		// Act

		const titleProperty: string = notionTitlePropertyName(properties, 'Configured');

		// Assert

		assert.equal(titleProperty, 'Configured');
	});

	void test('returns configured title property even when schema type is not title', () => {
		// Arrange

		const properties: NotionDatabaseProperties = {
			Configured: { type: 'rich_text' },
			Prompt: { type: 'title' },
		};

		// Act

		const titleProperty: string = notionTitlePropertyName(properties, 'Configured');

		// Assert

		assert.equal(titleProperty, 'Configured');
	});

	void test('discovers the first title property', () => {
		// Arrange

		const properties: NotionDatabaseProperties = {
			Notes: { type: 'rich_text' },
			Prompt: { type: 'title' },
		};

		// Act

		const titleProperty: string = notionTitlePropertyName(properties);

		// Assert

		assert.equal(titleProperty, 'Prompt');
	});

	void test('returns Name when no title property exists', () => {
		// Arrange

		const properties: NotionDatabaseProperties = {
			Notes: { type: 'rich_text' },
		};

		// Act

		const titleProperty: string = notionTitlePropertyName(properties);

		// Assert

		assert.equal(titleProperty, 'Name');
	});

	void test('skips undefined properties and properties without a title type', () => {
		// Arrange

		const properties: NotionDatabaseProperties = {
			Missing: undefined,
			Notes: {},
			Language: { type: 'rich_text' },
			Prompt: { type: 'title' },
		};

		// Act

		const titleProperty: string = notionTitlePropertyName(properties);

		// Assert

		assert.equal(titleProperty, 'Prompt');
	});

	void test('returns Name when only inherited title properties exist', () => {
		// Arrange

		const prototype: NotionDatabaseProperties = {
			Inherited: { type: 'title' },
		};
		const properties: NotionDatabaseProperties = {};
		Object.setPrototypeOf(properties, prototype);

		// Act

		const titleProperty: string = notionTitlePropertyName(properties);

		// Assert

		assert.equal(titleProperty, 'Name');
	});

	const specialTitlePropertyNames: string[] = ['constructor', 'toString', '__proto__'];

	for (const name of specialTitlePropertyNames) {
		void test(`discovers own special property name ${name} with title type`, () => {
			// Arrange

			const properties: NotionDatabaseProperties = {};
			Object.defineProperty(properties, name, {
				configurable: true,
				enumerable: true,
				value: { type: 'title' },
				writable: true,
			});

			// Act

			const titleProperty: string = notionTitlePropertyName(properties);

			// Assert

			assert.equal(titleProperty, name);
		});
	}

	void test('falls back to discovered title property when configured title is empty', () => {
		// Arrange

		const properties: NotionDatabaseProperties = {
			Prompt: { type: 'title' },
		};

		// Act

		const titleProperty: string = notionTitlePropertyName(properties, '');

		// Assert

		assert.equal(titleProperty, 'Prompt');
	});

	void test('returns whitespace configured title property as configured', () => {
		// Arrange

		const properties: NotionDatabaseProperties = {
			Prompt: { type: 'title' },
		};

		// Act

		const titleProperty: string = notionTitlePropertyName(properties, '   ');

		// Assert

		assert.equal(titleProperty, '   ');
	});

	void test('discovers title properties from null-prototype property dictionaries', () => {
		// Arrange

		const properties: NotionDatabaseProperties = {
			Prompt: { type: 'title' },
		};
		Object.setPrototypeOf(properties, null);

		// Act

		const titleProperty: string = notionTitlePropertyName(properties);

		// Assert

		assert.equal(titleProperty, 'Prompt');
	});
});

void suite('hasNotionPropertyType', () => {
	void test('returns true for an exact property type match', () => {
		// Arrange

		const properties: NotionDatabaseProperties = {
			'Detected Language': { type: 'rich_text' },
		};

		// Act

		const hasRichText: boolean = hasNotionPropertyType(properties, 'Detected Language', 'rich_text');

		// Assert

		assert.equal(hasRichText, true);
	});

	void test('returns false when the property type does not match', () => {
		// Arrange

		const properties: NotionDatabaseProperties = {
			'Detected Language': { type: 'rich_text' },
		};

		// Act

		const hasDate: boolean = hasNotionPropertyType(properties, 'Detected Language', 'date');

		// Assert

		assert.equal(hasDate, false);
	});

	void test('returns false when the property is missing', () => {
		// Arrange

		const properties: NotionDatabaseProperties = {
			'Detected Language': { type: 'rich_text' },
		};

		// Act

		const hasRichText: boolean = hasNotionPropertyType(properties, 'Missing', 'rich_text');

		// Assert

		assert.equal(hasRichText, false);
	});

	void test('returns false when the property is undefined', () => {
		// Arrange

		const properties: NotionDatabaseProperties = {
			'Detected Language': undefined,
		};

		// Act

		const hasRichText: boolean = hasNotionPropertyType(properties, 'Detected Language', 'rich_text');

		// Assert

		assert.equal(hasRichText, false);
	});

	void test('returns false when the property type is missing', () => {
		// Arrange

		const properties: NotionDatabaseProperties = {
			'Detected Language': {},
		};

		// Act

		const hasRichText: boolean = hasNotionPropertyType(properties, 'Detected Language', 'rich_text');

		// Assert

		assert.equal(hasRichText, false);
	});

	void test('returns false for inherited property definitions', () => {
		// Arrange

		const prototype: NotionDatabaseProperties = {
			'Detected Language': { type: 'rich_text' },
		};
		const properties: NotionDatabaseProperties = {};
		Object.setPrototypeOf(properties, prototype);

		// Act

		const hasRichText: boolean = hasNotionPropertyType(properties, 'Detected Language', 'rich_text');

		// Assert

		assert.equal(hasRichText, false);
	});

	const specialPropertyTypeCases: { name: string; type: string }[] = [
		{ name: 'constructor', type: 'select' },
		{ name: 'toString', type: 'date' },
		{ name: '__proto__', type: 'rich_text' },
	];

	for (const { name, type } of specialPropertyTypeCases) {
		void test(`returns true for own special property definition ${name}`, () => {
			// Arrange

			const properties: NotionDatabaseProperties = {};
			Object.defineProperty(properties, name, {
				configurable: true,
				enumerable: true,
				value: { type },
				writable: true,
			});

			// Act

			const hasType: boolean = hasNotionPropertyType(properties, name, type);

			// Assert

			assert.equal(hasType, true, name);
		});
	}

	void test('returns true for null-prototype property dictionaries', () => {
		// Arrange

		const properties: NotionDatabaseProperties = {
			Prompt: { type: 'title' },
		};
		Object.setPrototypeOf(properties, null);

		// Act

		const hasTitle: boolean = hasNotionPropertyType(properties, 'Prompt', 'title');

		// Assert

		assert.equal(hasTitle, true);
	});
});
