import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

import { expandHome } from '../../src/shared/path.ts';

void suite('path helpers', () => {
	void test('expandHome expands only a leading home segment', () => {
		// Arrange

		const environment: NodeJS.ProcessEnv = { HOME: '/home/test' };

		// Act

		const home: string = expandHome('~', environment);
		const homeDirectory: string = expandHome('~/', environment);
		const homeFile: string = expandHome('~/proposals.md', environment);
		const nestedHomeFile: string = expandHome('~/notes/proposals.md', environment);
		const nestedHome: string = expandHome('/tmp/~/proposals.md', environment);

		// Assert

		assert.equal(home, '/home/test');
		assert.equal(homeDirectory, '/home/test/');
		assert.equal(homeFile, '/home/test/proposals.md');
		assert.equal(nestedHomeFile, '/home/test/notes/proposals.md');
		assert.equal(nestedHome, '/tmp/~/proposals.md');
	});

	void test('expandHome avoids duplicate separators when HOME ends with a slash', () => {
		// Arrange

		const environment: NodeJS.ProcessEnv = { HOME: '/home/test/' };

		// Act

		const homeFile: string = expandHome('~/proposals.md', environment);

		// Assert

		assert.equal(homeFile, '/home/test/proposals.md');
	});

	void test('expandHome joins root HOME without duplicate separators', () => {
		// Arrange

		const environment: NodeJS.ProcessEnv = { HOME: '/' };

		// Act

		const homeFile: string = expandHome('~/proposals.md', environment);

		// Assert

		assert.equal(homeFile, '/proposals.md');
	});

	void test('expandHome leaves paths unchanged when HOME is missing', () => {
		// Arrange

		const missingEnvironment: NodeJS.ProcessEnv = {};
		const emptyEnvironment: NodeJS.ProcessEnv = { HOME: '' };

		// Act

		const missingHome: string = expandHome('~', missingEnvironment);
		const missingHomeDirectory: string = expandHome('~/', missingEnvironment);
		const missingHomeFile: string = expandHome('~/proposals.md', missingEnvironment);
		const emptyHome: string = expandHome('~', emptyEnvironment);
		const emptyHomeDirectory: string = expandHome('~/', emptyEnvironment);
		const emptyHomeFile: string = expandHome('~/proposals.md', emptyEnvironment);

		// Assert

		assert.equal(missingHome, '~');
		assert.equal(missingHomeDirectory, '~/');
		assert.equal(missingHomeFile, '~/proposals.md');
		assert.equal(emptyHome, '~');
		assert.equal(emptyHomeDirectory, '~/');
		assert.equal(emptyHomeFile, '~/proposals.md');
	});

	void test('expandHome leaves tilde-like paths unchanged', () => {
		// Arrange

		const environment: NodeJS.ProcessEnv = { HOME: '/home/test' };

		// Act

		const userHome: string = expandHome('~user/proposals.md', environment);
		const tildeFile: string = expandHome('~proposals.md', environment);
		const doubleTilde: string = expandHome('~~/proposals.md', environment);
		const backslashHome: string = expandHome('~\\proposals.md', environment);
		const embeddedTilde: string = expandHome('abc~/proposals.md', environment);

		// Assert

		assert.equal(userHome, '~user/proposals.md');
		assert.equal(tildeFile, '~proposals.md');
		assert.equal(doubleTilde, '~~/proposals.md');
		assert.equal(backslashHome, '~\\proposals.md');
		assert.equal(embeddedTilde, 'abc~/proposals.md');
	});

	void test('expandHome uses process.env by default', () => {
		// Arrange

		const originalHome: string | undefined = process.env.HOME;

		try {
			process.env.HOME = '/home/default';

			// Act

			const homeFile: string = expandHome('~/proposals.md');

			// Assert

			assert.equal(homeFile, '/home/default/proposals.md');
		} finally {
			if (originalHome === undefined) {
				delete process.env.HOME;
			} else {
				process.env.HOME = originalHome;
			}
		}
	});

	void test('expandHome leaves ordinary paths unchanged', () => {
		// Arrange

		const environment: NodeJS.ProcessEnv = { HOME: '/home/test' };

		// Act

		const emptyPath: string = expandHome('', environment);
		const absolutePath: string = expandHome('/tmp/proposals.md', environment);
		const relativePath: string = expandHome('tmp/proposals.md', environment);

		// Assert

		assert.equal(emptyPath, '');
		assert.equal(absolutePath, '/tmp/proposals.md');
		assert.equal(relativePath, 'tmp/proposals.md');
	});
});
