import type { NotionDatabaseProperties } from './notion-types.ts';

export function notionTitlePropertyName(properties: NotionDatabaseProperties, configured?: string): string {
	if (configured) {
		return configured;
	}
	for (const [name, property] of Object.entries(properties)) {
		if (property?.type === 'title') {
			return name;
		}
	}
	return 'Name';
}

export function hasNotionPropertyType(properties: NotionDatabaseProperties, name: string, type: string): boolean {
	return Object.hasOwn(properties, name) && properties[name]?.type === type;
}
