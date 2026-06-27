import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

import { notionDatabasePropertiesFromUnknown } from '../../src/notion/notion-database-properties.ts';
import type { NotionDatabaseProperties } from '../../src/notion/notion-types.ts';

void suite('notionDatabasePropertiesFromUnknown', () => {
	void test('maps valid database property types', () => {
		// Arrange

		const value: unknown = {
			properties: {
				Name: { type: 'title' },
				Status: { type: 'select' },
			},
		};

		// Act

		const properties: NotionDatabaseProperties = notionDatabasePropertiesFromUnknown(value);

		// Assert

		assert.deepEqual(properties, {
			Name: { type: 'title' },
			Status: { type: 'select' },
		});
	});

	void test('defines returned properties as own enumerable properties', () => {
		// Arrange

		const value: unknown = {
			properties: {
				Name: { type: 'title' },
			},
		};

		// Act

		const properties: NotionDatabaseProperties = notionDatabasePropertiesFromUnknown(value);

		// Assert

		assert.equal(Object.hasOwn(properties, 'Name'), true);
		assert.deepEqual(Object.keys(properties), ['Name']);
		assert.deepEqual(properties.Name, { type: 'title' });
	});

	void test('accepts arbitrary string property types', () => {
		// Arrange

		const value: unknown = {
			properties: {
				Future: { type: 'future_notion_type' },
			},
		};

		// Act

		const properties: NotionDatabaseProperties = notionDatabasePropertiesFromUnknown(value);

		// Assert

		assert.deepEqual(properties, { Future: { type: 'future_notion_type' } });
	});

	void test('includes object properties without a type', () => {
		// Arrange

		const value: unknown = {
			properties: {
				Notes: {},
			},
		};

		// Act

		const properties: NotionDatabaseProperties = notionDatabasePropertiesFromUnknown(value);

		// Assert

		assert.equal(Object.hasOwn(properties, 'Notes'), true);
		assert.equal(properties.Notes?.type, undefined);
	});

	void test('returns empty properties for an empty database properties object', () => {
		// Arrange

		const value: unknown = { properties: {} };

		// Act

		const properties: NotionDatabaseProperties = notionDatabasePropertiesFromUnknown(value);

		// Assert

		assert.deepEqual(properties, {});
	});

	const nonRecordInputCases: { label: string; value: unknown }[] = [
		{ label: 'null', value: null },
		{ label: 'string', value: 'text' },
		{ label: 'array', value: [] },
		{ label: 'function', value: (): undefined => undefined },
	];

	for (const { label, value } of nonRecordInputCases) {
		void test(`returns empty properties for non-record input: ${label}`, () => {
			// Act

			const properties: NotionDatabaseProperties = notionDatabasePropertiesFromUnknown(value);

			// Assert

			assert.deepEqual(properties, {}, label);
		});
	}

	const invalidPropertiesCases: { label: string; value: unknown }[] = [
		{ label: 'missing properties', value: {} },
		{ label: 'null properties', value: { properties: null } },
		{ label: 'string properties', value: { properties: 'text' } },
		{ label: 'array properties', value: { properties: [] } },
		{ label: 'function properties', value: { properties: (): undefined => undefined } },
	];

	for (const { label, value } of invalidPropertiesCases) {
		void test(`returns empty properties for invalid properties value: ${label}`, () => {
			// Act

			const properties: NotionDatabaseProperties = notionDatabasePropertiesFromUnknown(value);

			// Assert

			assert.deepEqual(properties, {}, label);
		});
	}

	void test('accepts null-prototype root, database, and property records', () => {
		// Arrange

		const sourceDatabase: Record<string, unknown> = {};
		const sourceProperties: Record<string, unknown> = {};
		const sourceProperty: Record<string, unknown> = {};
		Object.setPrototypeOf(sourceDatabase, null);
		Object.setPrototypeOf(sourceProperties, null);
		Object.setPrototypeOf(sourceProperty, null);
		sourceProperty.type = 'title';
		sourceProperties.Name = sourceProperty;
		sourceDatabase.properties = sourceProperties;
		const value: unknown = sourceDatabase;

		// Act

		const properties: NotionDatabaseProperties = notionDatabasePropertiesFromUnknown(value);

		// Assert

		assert.deepEqual(properties, { Name: { type: 'title' } });
	});

	void test('ignores non-object property definitions', () => {
		// Arrange

		const value: unknown = {
			properties: {
				Name: 'title',
				Count: 123,
				Enabled: true,
				Missing: null,
				Undefined: undefined,
				Callback: (): undefined => undefined,
				Items: [],
				Valid: { type: 'rich_text' },
			},
		};

		// Act

		const properties: NotionDatabaseProperties = notionDatabasePropertiesFromUnknown(value);

		// Assert

		assert.deepEqual(properties, { Valid: { type: 'rich_text' } });
	});

	void test('ignores properties with invalid type values', () => {
		// Arrange

		const value: unknown = {
			properties: {
				Count: { type: 123 },
				Empty: { type: null },
				Enabled: { type: true },
				Object: { type: {} },
				Array: { type: [] },
				Callback: { type: (): undefined => undefined },
				Symbol: { type: Symbol('type') },
				BigInt: { type: 1n },
				Name: { type: 'title' },
			},
		};

		// Act

		const properties: NotionDatabaseProperties = notionDatabasePropertiesFromUnknown(value);

		// Assert

		assert.deepEqual(properties, { Name: { type: 'title' } });
	});

	void test('returns empty properties when every property definition is invalid', () => {
		// Arrange

		const value: unknown = {
			properties: {
				Name: 'title',
				Count: { type: 123 },
				Missing: null,
				Items: [],
			},
		};

		// Act

		const properties: NotionDatabaseProperties = notionDatabasePropertiesFromUnknown(value);

		// Assert

		assert.deepEqual(properties, {});
	});

	void test('drops extra property metadata', () => {
		// Arrange

		const sourceProperty: { title: Record<string, never>; type: string } = { type: 'title', title: {} };
		const value: unknown = {
			properties: {
				Name: sourceProperty,
			},
		};

		// Act

		const properties: NotionDatabaseProperties = notionDatabasePropertiesFromUnknown(value);

		// Assert

		assert.deepEqual(properties, { Name: { type: 'title' } });
		assert.notStrictEqual(properties.Name, sourceProperty);
		sourceProperty.type = 'rich_text';
		assert.deepEqual(properties.Name, { type: 'title' });
	});

	void test('preserves property names exactly', () => {
		// Arrange

		const value: unknown = {
			properties: {
				'Detected Language': { type: 'rich_text' },
				'Created At!': { type: 'date' },
			},
		};

		// Act

		const properties: NotionDatabaseProperties = notionDatabasePropertiesFromUnknown(value);

		// Assert

		assert.deepEqual(properties, {
			'Detected Language': { type: 'rich_text' },
			'Created At!': { type: 'date' },
		});
	});

	void test('preserves special property names as own properties', () => {
		// Arrange

		const value: unknown = {
			properties: {
				'': { type: 'title' },
				'01': { type: 'number' },
				constructor: { type: 'select' },
				toString: { type: 'date' },
				['__proto__']: { type: 'rich_text' },
			},
		};

		// Act

		const properties: NotionDatabaseProperties = notionDatabasePropertiesFromUnknown(value);

		// Assert

		const expectedProperties: NotionDatabaseProperties = {
			'': { type: 'title' },
			'01': { type: 'number' },
			constructor: { type: 'select' },
			toString: { type: 'date' },
			['__proto__']: { type: 'rich_text' },
		};

		assert.equal(Object.keys(properties).length, Object.keys(expectedProperties).length);
		for (const [name, property] of Object.entries(expectedProperties)) {
			assert.equal(Object.hasOwn(properties, name), true, name);
			assert.deepEqual(Object.getOwnPropertyDescriptor(properties, name)?.value, property, name);
		}
	});
});
