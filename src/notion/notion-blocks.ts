import { chunkText } from '../shared/text-chunks.ts';

const RICH_TEXT_CONTENT_LIMIT: number = 2000;
const PARAGRAPH_TEXT_CHUNK_SIZE: number = 1900;

export function richText(content: string): Record<string, unknown>[] {
	return [{ type: 'text', text: { content: content.slice(0, RICH_TEXT_CONTENT_LIMIT) } }];
}

export function splitBlocks(label: string, value: string): Record<string, unknown>[] {
	const blocks: Record<string, unknown>[] = [
		{
			object: 'block',
			type: 'heading_2',
			heading_2: { rich_text: richText(label) },
		},
	];

	for (const chunk of chunkText(value, PARAGRAPH_TEXT_CHUNK_SIZE)) {
		blocks.push({
			object: 'block',
			type: 'paragraph',
			paragraph: { rich_text: richText(chunk) },
		});
	}
	return blocks;
}
