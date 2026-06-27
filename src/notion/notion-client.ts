import type { NotionPagePayload } from './notion-types.ts';

async function notionRequest(path: string, token: string, init: RequestInit = {}): Promise<unknown> {
	const headers: Headers = new Headers({
		Authorization: `Bearer ${token}`,
		'Content-Type': 'application/json',
		'Notion-Version': '2022-06-28',
	});

	const response: Response = await fetch(`https://api.notion.com/v1${path}`, {
		...init,
		headers,
	});

	if (!response.ok) {
		const body: string = await response.text().catch((): string => '');
		throw new Error(`Notion request failed: ${response.status} ${response.statusText}${body ? `: ${body}` : ''}`);
	}

	return await response.json();
}

export async function readNotionDatabase(token: string, databaseId: string): Promise<unknown> {
	return await notionRequest(`/databases/${databaseId}`, token);
}

export async function createNotionPage(token: string, payload: NotionPagePayload): Promise<void> {
	await notionRequest('/pages', token, {
		method: 'POST',
		body: JSON.stringify(payload),
	});
}
