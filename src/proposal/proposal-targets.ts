import { resolveNotionConfig, type NotionConfig } from '../notion/notion-config.ts';
import type { Options } from '../shared/options.ts';

export const DEFAULT_OUTPUT_FILE: string = '~/english-prompt-polisher.md';

export type ProposalFileTarget = {
	outputFile: string;
	includeOriginal: boolean;
};

export type ProposalOutputTargets = {
	file: ProposalFileTarget;
	notion?: NotionConfig;
};

export function resolveProposalFileTarget(options: Options): ProposalFileTarget {
	return {
		outputFile: options.outputFile ?? DEFAULT_OUTPUT_FILE,
		includeOriginal: options.includeOriginal !== false,
	};
}

export function resolveProposalNotionTarget(options: Options): NotionConfig | undefined {
	return resolveNotionConfig(options);
}

export function resolveProposalOutputTargets(options: Options): ProposalOutputTargets {
	const targets: ProposalOutputTargets = {
		file: resolveProposalFileTarget(options),
	};
	const notion: NotionConfig | undefined = resolveProposalNotionTarget(options);
	if (notion) {
		targets.notion = notion;
	}

	return targets;
}
