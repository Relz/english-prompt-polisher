export function chunkText(value: string, maxLength: number): string[] {
	if (!Number.isInteger(maxLength) || maxLength <= 0) {
		throw new Error('Text chunk length must be a positive integer');
	}

	const chunks: string[] = [];
	for (let index: number = 0; index < value.length; index += maxLength) {
		chunks.push(value.slice(index, index + maxLength));
	}
	return chunks.length > 0 ? chunks : [''];
}
