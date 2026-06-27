export function formatUnknownError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
