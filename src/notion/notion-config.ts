import type { Options } from '../shared/options.ts';

export type NotionConfig = {
	token: string;
	databaseId: string;
	titleProperty?: string;
};

export function resolveNotionConfig(options: Options): NotionConfig | undefined {
	const notion: Options['notion'] = options.notion;
	if (notion?.enabled !== true) {
		return;
	}

	const token: string | undefined = notion.token;
	const databaseId: string | undefined = notion.databaseId;

	if (!token) {
		throw new Error('Notion is enabled but notion.token is not set.');
	}
	if (!databaseId) {
		throw new Error('Notion is enabled but notion.databaseId is not set.');
	}

	return { token, databaseId, titleProperty: notion.titleProperty };
}
