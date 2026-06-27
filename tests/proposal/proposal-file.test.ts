import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { suite, test } from 'node:test';

import { appendProposalFile } from '../../src/proposal/proposal-file.ts';

void suite('proposal file helpers', () => {
	void test('appendProposalFile creates a new file with proposal content', async (t) => {
		// Arrange

		const directory: string = await mkdtemp(join(tmpdir(), 'english-prompt-polisher-'));
		const outputFile: string = join(directory, 'proposals.md');
		const content: string = '## Proposal\n\nCreate a CLI.';

		t.after(async () => {
			await rm(directory, { recursive: true, force: true });
		});

		// Act

		await appendProposalFile(outputFile, content);

		// Assert

		const contents: string = await readFile(outputFile, 'utf8');
		assert.equal(contents.replace(/^\n/, ''), content);
	});

	void test('appendProposalFile appends to existing file contents', async (t) => {
		// Arrange

		const directory: string = await mkdtemp(join(tmpdir(), 'english-prompt-polisher-'));
		const outputFile: string = join(directory, 'proposals.md');
		const existingContents: string = '# Previous Proposals\n';
		const content: string = '## Proposal\n\nCreate a CLI.';

		await writeFile(outputFile, existingContents, 'utf8');

		t.after(async () => {
			await rm(directory, { recursive: true, force: true });
		});

		// Act

		await appendProposalFile(outputFile, content);

		// Assert

		const contents: string = await readFile(outputFile, 'utf8');
		assert.equal(contents, `${existingContents}\n${content}`);
	});

	void test('appendProposalFile appends after existing contents without a trailing newline', async (t) => {
		// Arrange

		const directory: string = await mkdtemp(join(tmpdir(), 'english-prompt-polisher-'));
		const outputFile: string = join(directory, 'proposals.md');
		const existingContents: string = '# Previous Proposals';
		const content: string = '## Proposal\n\nCreate a CLI.';

		await writeFile(outputFile, existingContents, 'utf8');

		t.after(async () => {
			await rm(directory, { recursive: true, force: true });
		});

		// Act

		await appendProposalFile(outputFile, content);

		// Assert

		const contents: string = await readFile(outputFile, 'utf8');
		assert.equal(contents, `${existingContents}\n${content}`);
	});

	void test('appendProposalFile preserves multiline content and trailing newlines', async (t) => {
		// Arrange

		const directory: string = await mkdtemp(join(tmpdir(), 'english-prompt-polisher-'));
		const outputFile: string = join(directory, 'proposals.md');
		const content: string = '## Proposal\n\nCreate a CLI.\n\n- Keep formatting.\n';

		t.after(async () => {
			await rm(directory, { recursive: true, force: true });
		});

		// Act

		await appendProposalFile(outputFile, content);

		// Assert

		const contents: string = await readFile(outputFile, 'utf8');
		assert.equal(contents.replace(/^\n/, ''), content);
	});

	void test('appendProposalFile expands leading home paths', async (t) => {
		// Arrange

		const directory: string = await mkdtemp(join(tmpdir(), 'english-prompt-polisher-'));
		const originalHome: string | undefined = process.env.HOME;
		const content: string = '## Proposal\n\nCreate a CLI.';

		t.after(async () => {
			await rm(directory, { recursive: true, force: true });
		});

		// Act

		process.env.HOME = directory;
		try {
			await appendProposalFile('~/proposals.md', content);
		} finally {
			if (originalHome === undefined) {
				delete process.env.HOME;
			} else {
				process.env.HOME = originalHome;
			}
		}

		// Assert

		const contents: string = await readFile(join(directory, 'proposals.md'), 'utf8');
		assert.equal(contents.replace(/^\n/, ''), content);
	});
});
