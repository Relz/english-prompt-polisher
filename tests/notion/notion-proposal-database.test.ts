import assert from 'node:assert/strict';
import { afterEach, suite, test } from 'node:test';

import type { NotionConfig } from '../../src/notion/notion-config.ts';
import { readNotionProposalDatabaseProperties } from '../../src/notion/notion-proposal-database.ts';
import type { NotionDatabaseProperties } from '../../src/notion/notion-types.ts';

const originalFetch: typeof fetch = globalThis.fetch;

void suite('readNotionProposalDatabaseProperties', () => {
	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	void test('reads configured database and returns parsed properties', async () => {
		// Arrange

		let fetchCallCount: number = 0;
		let fetchInput: Parameters<typeof fetch>[0] | undefined;
		let fetchInit: RequestInit | undefined;
		const config: NotionConfig = { token: 'token', databaseId: 'database-id' };
		globalThis.fetch = (input: Parameters<typeof fetch>[0], init?: RequestInit): Promise<Response> => {
			fetchCallCount += 1;
			fetchInput = input;
			fetchInit = init;
			return Promise.resolve(
				Response.json({
					object: 'database',
					properties: {
						Name: { type: 'title' },
						Status: { type: 'select' },
					},
				}),
			);
		};

		// Act

		const properties: NotionDatabaseProperties = await readNotionProposalDatabaseProperties(config);

		// Assert

		assert.equal(fetchCallCount, 1);
		assert.equal(fetchInput, 'https://api.notion.com/v1/databases/database-id');
		assert.equal(new Headers(fetchInit?.headers).get('Authorization'), 'Bearer token');
		assert.deepEqual(properties, {
			Name: { type: 'title' },
			Status: { type: 'select' },
		});
	});
});
