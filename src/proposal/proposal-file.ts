import { appendFile } from 'node:fs/promises';

import { expandHome } from '../shared/path.ts';

export async function appendProposalFile(outputFile: string, content: string): Promise<void> {
	await appendFile(expandHome(outputFile), `\n${content}`);
}
