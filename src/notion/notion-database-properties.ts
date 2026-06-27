import type { NotionDatabaseProperties } from './notion-types.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
	if (value === null || typeof value !== 'object' || Array.isArray(value)) {
		return false;
	}
	const prototype: unknown = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

export function notionDatabasePropertiesFromUnknown(value: unknown): NotionDatabaseProperties {
	if (!isRecord(value)) {
		return {};
	}
	if (!Object.hasOwn(value, 'properties') || !isRecord(value.properties)) {
		return {};
	}

	const properties: NotionDatabaseProperties = {};
	for (const [name, property] of Object.entries(value.properties)) {
		if (!isRecord(property)) {
			continue;
		}
		const type: unknown = Object.hasOwn(property, 'type') ? property.type : undefined;
		if (type !== undefined && typeof type !== 'string') {
			continue;
		}
		Object.defineProperty(properties, name, {
			configurable: true,
			enumerable: true,
			value: { type },
			writable: true,
		});
	}

	return properties;
}
