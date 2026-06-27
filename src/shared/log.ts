export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type WriteLog = (level: LogLevel, message: string, extra?: Record<string, unknown>) => Promise<void>;

export function noopLog(_level: LogLevel, _message: string, _extra?: Record<string, unknown>): Promise<void> {
	return Promise.resolve();
}
