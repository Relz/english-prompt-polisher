export function expandHome(filePath: string, env: NodeJS.ProcessEnv = process.env): string {
	const home: string | undefined = env.HOME;

	if (!home) {
		return filePath;
	}
	if (filePath === '~') {
		return home;
	}
	if (filePath.startsWith('~/')) {
		const suffix: string = filePath.slice(2);
		return home.endsWith('/') ? `${home}${suffix}` : `${home}/${suffix}`;
	}
	return filePath;
}
