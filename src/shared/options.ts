import type { ChatModel } from './chat.ts';

export type CheckerOptions = {
	model?: string | ChatModel;
};

export type NormalizedCheckerOptions = Omit<CheckerOptions, 'model'> & {
	model?: ChatModel | 'current';
};

export type PromptHandlingMode = 'proposal' | 'rewrite';

export type NotionOptions = {
	enabled?: boolean;
	token?: string;
	databaseId?: string;
	titleProperty?: string;
};

export type Options = {
	[key: string]: unknown;
	mode?: PromptHandlingMode;
	outputFile?: string;
	maxChars?: number;
	includeOriginal?: boolean;
	checker?: CheckerOptions;
	notion?: NotionOptions;
};

export type NormalizedOptions = {
	[key: string]: unknown;
	mode?: PromptHandlingMode;
	outputFile?: string;
	maxChars?: number;
	includeOriginal?: boolean;
	checker?: NormalizedCheckerOptions;
	notion?: NotionOptions;
};

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function stringOption(value: unknown): string | undefined {
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function booleanOption(value: unknown): boolean | undefined {
	return typeof value === 'boolean' ? value : undefined;
}

export function positiveIntegerOption(value: unknown): number | undefined {
	return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : undefined;
}

export function promptHandlingModeOption(value: unknown): PromptHandlingMode | undefined {
	return value === 'proposal' || value === 'rewrite' ? value : undefined;
}

export function chatModelOption(value: unknown): ChatModel | undefined {
	if (!isRecord(value)) {
		return;
	}

	const providerID: unknown = value.providerID;
	const modelID: unknown = value.modelID;
	if (typeof providerID !== 'string' || providerID.length === 0) {
		return;
	}
	if (typeof modelID !== 'string' || modelID.length === 0) {
		return;
	}

	return { providerID, modelID };
}

export function chatModelStringOption(value: string): ChatModel | undefined {
	const slash: number = value.indexOf('/');
	if (slash <= 0 || slash >= value.length - 1) {
		return;
	}

	return { providerID: value.slice(0, slash), modelID: value.slice(slash + 1) };
}

export function checkerModelOption(value: unknown): NormalizedCheckerOptions['model'] | undefined {
	if (value === 'current') {
		return 'current';
	}
	if (typeof value === 'string') {
		return chatModelStringOption(value);
	}
	return chatModelOption(value);
}

export function normalizeCheckerOptions(value: unknown): NormalizedCheckerOptions | undefined {
	if (!isRecord(value)) {
		return;
	}

	const checker: NormalizedCheckerOptions = {};
	let hasOptions: boolean = false;
	const model: NormalizedCheckerOptions['model'] | undefined = checkerModelOption(value.model);

	if (model !== undefined) {
		checker.model = model;
		hasOptions = true;
	}

	return hasOptions ? checker : undefined;
}

export function normalizeNotionOptions(value: unknown): NotionOptions | undefined {
	if (!isRecord(value)) {
		return;
	}

	const notion: NotionOptions = {};
	let hasOptions: boolean = false;
	const enabled: boolean | undefined = booleanOption(value.enabled);
	const token: string | undefined = stringOption(value.token);
	const databaseId: string | undefined = stringOption(value.databaseId);
	const titleProperty: string | undefined = stringOption(value.titleProperty);

	if (enabled !== undefined) {
		notion.enabled = enabled;
		hasOptions = true;
	}
	if (token !== undefined) {
		notion.token = token;
		hasOptions = true;
	}
	if (databaseId !== undefined) {
		notion.databaseId = databaseId;
		hasOptions = true;
	}
	if (titleProperty !== undefined) {
		notion.titleProperty = titleProperty;
		hasOptions = true;
	}

	return hasOptions ? notion : undefined;
}

export function resolveCheckerModel(
	inputModel: ChatModel | undefined,
	configuredModel: CheckerOptions['model'] | undefined,
): ChatModel | undefined {
	if (configuredModel === undefined || configuredModel === 'current') {
		return inputModel;
	}
	if (typeof configuredModel === 'string') {
		return chatModelStringOption(configuredModel);
	}
	return configuredModel;
}

function normalizeOptionDefaults(defaults: Options): NormalizedOptions {
	const options: NormalizedOptions = {};
	const mode: PromptHandlingMode | undefined = promptHandlingModeOption(defaults.mode);
	const outputFile: string | undefined = stringOption(defaults.outputFile);
	const maxChars: number | undefined = positiveIntegerOption(defaults.maxChars);
	const includeOriginal: boolean | undefined = booleanOption(defaults.includeOriginal);
	const checker: NormalizedCheckerOptions | undefined = normalizeCheckerOptions(defaults.checker);
	const notion: NotionOptions | undefined = normalizeNotionOptions(defaults.notion);

	if (mode !== undefined) {
		options.mode = mode;
	}
	if (outputFile !== undefined) {
		options.outputFile = outputFile;
	}
	if (maxChars !== undefined) {
		options.maxChars = maxChars;
	}
	if (includeOriginal !== undefined) {
		options.includeOriginal = includeOriginal;
	}
	if (checker !== undefined) {
		options.checker = checker;
	}
	if (notion !== undefined) {
		options.notion = notion;
	}

	return options;
}

export function normalizeOptions(rawOptions?: unknown, defaults: Options = {}): NormalizedOptions {
	const options: NormalizedOptions = normalizeOptionDefaults(defaults);
	if (!isRecord(rawOptions)) {
		return options;
	}

	const mode: PromptHandlingMode | undefined = promptHandlingModeOption(rawOptions.mode);
	const outputFile: string | undefined = stringOption(rawOptions.outputFile);
	const maxChars: number | undefined = positiveIntegerOption(rawOptions.maxChars);
	const includeOriginal: boolean | undefined = booleanOption(rawOptions.includeOriginal);
	const checker: NormalizedCheckerOptions | undefined = normalizeCheckerOptions(rawOptions.checker);
	const notion: NotionOptions | undefined = normalizeNotionOptions(rawOptions.notion);

	if (mode !== undefined) {
		options.mode = mode;
	}
	if (outputFile !== undefined) {
		options.outputFile = outputFile;
	}
	if (maxChars !== undefined) {
		options.maxChars = maxChars;
	}
	if (includeOriginal !== undefined) {
		options.includeOriginal = includeOriginal;
	}
	if (checker !== undefined) {
		options.checker = checker;
	}
	if (notion !== undefined) {
		options.notion = notion;
	}

	return options;
}
