import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

import { richText, splitBlocks } from '../../src/notion/notion-blocks.ts';

const NOTION_RICH_TEXT_CONTENT_LIMIT: number = 2000;

function blockTextContent(block: Record<string, unknown>): unknown {
	const blockContent: unknown = block.type === 'heading_2' ? block.heading_2 : block.paragraph;
	if (typeof blockContent !== 'object' || blockContent === null || !('rich_text' in blockContent)) {
		return undefined;
	}

	const richText: unknown = blockContent.rich_text;
	if (!Array.isArray(richText)) {
		return undefined;
	}

	const firstRichText: unknown = richText[0];
	if (typeof firstRichText !== 'object' || firstRichText === null || !('text' in firstRichText)) {
		return undefined;
	}

	const text: unknown = firstRichText.text;
	if (typeof text !== 'object' || text === null || !('content' in text)) {
		return undefined;
	}

	return text.content;
}

void suite('notion blocks', () => {
	void test('richText builds a Notion text rich text item', () => {
		// Arrange

		const content: string = 'Hello';

		// Act

		const richTextItems: Record<string, unknown>[] = richText(content);

		// Assert

		assert.deepEqual(richTextItems, [{ type: 'text', text: { content: 'Hello' } }]);
	});

	void test('richText builds an empty Notion text rich text item for empty content', () => {
		// Arrange

		const content: string = '';

		// Act

		const richTextItems: Record<string, unknown>[] = richText(content);

		// Assert

		assert.deepEqual(richTextItems, [{ type: 'text', text: { content: '' } }]);
	});

	void test('richText truncates content at the Notion rich text limit', () => {
		// Arrange

		const content: string = `${'a'.repeat(NOTION_RICH_TEXT_CONTENT_LIMIT)}b`;

		// Act

		const richTextItems: Record<string, unknown>[] = richText(content);

		// Assert

		assert.deepEqual(richTextItems, [
			{ type: 'text', text: { content: 'a'.repeat(NOTION_RICH_TEXT_CONTENT_LIMIT) } },
		]);
	});

	void test('splitBlocks creates a heading block followed by one paragraph block', () => {
		// Arrange

		const label: string = 'Reason';
		const value: string = 'Short reason';

		// Act

		const blocks: Record<string, unknown>[] = splitBlocks(label, value);

		// Assert

		assert.equal(blocks.length, 2);
		assert.equal(blocks[0].object, 'block');
		assert.equal(blocks[0].type, 'heading_2');
		assert.equal(blockTextContent(blocks[0]), label);
		assert.equal(blocks[1].object, 'block');
		assert.equal(blocks[1].type, 'paragraph');
		assert.equal(blockTextContent(blocks[1]), value);
	});

	void test('splitBlocks creates an empty paragraph block for an empty value', () => {
		// Arrange

		const label: string = 'Reason';
		const value: string = '';

		// Act

		const blocks: Record<string, unknown>[] = splitBlocks(label, value);

		// Assert

		assert.equal(blocks.length, 2);
		assert.equal(blocks[0].object, 'block');
		assert.equal(blocks[0].type, 'heading_2');
		assert.equal(blockTextContent(blocks[0]), label);
		assert.equal(blocks[1].object, 'block');
		assert.equal(blocks[1].type, 'paragraph');
		assert.equal(blockTextContent(blocks[1]), value);
	});

	void test('splitBlocks splits paragraph content over the Notion rich text limit without losing text', () => {
		// Arrange

		const label: string = 'Original Prompt';
		const value: string = `${'a'.repeat(NOTION_RICH_TEXT_CONTENT_LIMIT)}b`;

		// Act

		const blocks: Record<string, unknown>[] = splitBlocks(label, value);

		// Assert

		assert.equal(blocks[0].object, 'block');
		assert.equal(blocks[0].type, 'heading_2');
		assert.equal(blockTextContent(blocks[0]), label);

		const paragraphBlocks: Record<string, unknown>[] = blocks.slice(1);
		const paragraphContents: string[] = paragraphBlocks.map((block: Record<string, unknown>): string => {
			assert.equal(block['object'], 'block');
			assert.equal(block['type'], 'paragraph');

			const content: unknown = blockTextContent(block);
			if (typeof content !== 'string') {
				assert.fail('Expected paragraph content to be a string');
			}

			return content;
		});

		assert.equal(paragraphContents.join(''), value);
		assert.ok(
			paragraphContents.every((content: string): boolean => content.length <= NOTION_RICH_TEXT_CONTENT_LIMIT),
		);
	});
});
