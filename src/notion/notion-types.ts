type NotionProperty = { type?: string };

export type NotionDatabaseProperties = Record<string, NotionProperty | undefined>;
export type NotionPagePayload = {
	parent: Record<string, string>;
	properties: Record<string, unknown>;
	children: Record<string, unknown>[];
};
