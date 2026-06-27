import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

import { resolveNotionConfig, type NotionConfig } from '../../src/notion/notion-config.ts';
import type { Options } from '../../src/shared/options.ts';

void suite('resolveNotionConfig', () => {
	void test('returns undefined when Notion is disabled', () => {
		// Arrange

		const config: Options = {};

		// Act

		const notionConfig: NotionConfig | undefined = resolveNotionConfig(config);

		// Assert

		assert.equal(notionConfig, undefined);
	});

	void test('returns undefined when Notion config is present without enabled flag', () => {
		// Arrange

		const config: Options = { notion: { token: 'secret', databaseId: 'database' } };

		// Act

		const notionConfig: NotionConfig | undefined = resolveNotionConfig(config);

		// Assert

		assert.equal(notionConfig, undefined);
	});

	void test('returns undefined when Notion is explicitly disabled', () => {
		// Arrange

		const config: Options = { notion: { enabled: false, token: 'secret', databaseId: 'database' } };

		// Act

		const notionConfig: NotionConfig | undefined = resolveNotionConfig(config);

		// Assert

		assert.equal(notionConfig, undefined);
	});

	void test('reads token and database id from configured values', () => {
		// Arrange

		const config: Options = {
			notion: {
				enabled: true,
				token: 'secret',
				databaseId: 'database',
			},
		};

		// Act

		const notionConfig: NotionConfig | undefined = resolveNotionConfig(config);

		// Assert

		assert.equal(notionConfig?.token, 'secret');
		assert.equal(notionConfig.databaseId, 'database');
	});

	void test('throws when token is missing', () => {
		// Arrange

		const config: Options = { notion: { enabled: true, databaseId: 'database' } };

		// Act & Assert

		assert.throws(() => resolveNotionConfig(config), /notion\.token\b/);
	});

	void test('throws when token is empty', () => {
		// Arrange

		const config: Options = { notion: { enabled: true, token: '', databaseId: 'database' } };

		// Act & Assert

		assert.throws(() => resolveNotionConfig(config), /notion\.token\b/);
	});

	void test('throws when database id is missing', () => {
		// Arrange

		const config: Options = { notion: { enabled: true, token: 'secret' } };

		// Act & Assert

		assert.throws(() => resolveNotionConfig(config), /notion\.databaseId\b/);
	});

	void test('throws when database id is empty', () => {
		// Arrange

		const config: Options = { notion: { enabled: true, token: 'secret', databaseId: '' } };

		// Act & Assert

		assert.throws(() => resolveNotionConfig(config), /notion\.databaseId\b/);
	});

	void test('passes through the configured title property', () => {
		// Arrange

		const config: Options = {
			notion: { enabled: true, token: 'secret', databaseId: 'database', titleProperty: 'Prompt' },
		};

		// Act

		const notionConfig: NotionConfig | undefined = resolveNotionConfig(config);

		// Assert

		assert.equal(notionConfig?.titleProperty, 'Prompt');
	});
});
