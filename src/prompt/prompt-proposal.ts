import type { PolisherResult } from '../checker/polisher-result.ts';
import { logProposalOutputResults } from '../proposal/proposal-output-log.ts';
import { writeProposal, type ProposalOutputResult } from '../proposal/proposal-output.ts';
import type { ProposalRecord } from '../proposal/proposal-types.ts';
import type { ChatMessageInput, ChatMessageOutput } from '../shared/chat.ts';
import { noopLog, type WriteLog } from '../shared/log.ts';
import type { Options } from '../shared/options.ts';

import { createPromptProposalCandidate } from './prompt-proposal-candidate.ts';
import { createPromptProposalRecord, shouldCreatePromptProposalRecord } from './prompt-proposal-record.ts';

type CheckPrompt = (input: ChatMessageInput, options: Options, prompt: string) => Promise<PolisherResult>;

type RewritePrompt = (record: ProposalRecord, input: ChatMessageInput, output: ChatMessageOutput) => Promise<void>;

type WriteProposal = (record: ProposalRecord, options: Options) => Promise<ProposalOutputResult>;

export type PromptProposalDependencies = {
	checkPrompt: CheckPrompt;
	rewritePrompt?: RewritePrompt;
	writeProposal?: WriteProposal;
	log?: WriteLog;
	now?: () => Date;
};

export type PromptProposalRewriteDependencies = PromptProposalDependencies & {
	rewritePrompt: RewritePrompt;
};

export type PromptProposalProposalOptions = Options & { mode?: 'proposal' };

export type PromptProposalRewriteOptions = Options & { mode: 'rewrite' };

export type PromptProposalResult =
	{ status: 'skipped' } | { status: 'created'; record: ProposalRecord; output: ProposalOutputResult };

export function handlePromptProposal(
	input: ChatMessageInput,
	output: ChatMessageOutput,
	options: PromptProposalProposalOptions,
	dependencies: PromptProposalDependencies,
): Promise<PromptProposalResult>;
export function handlePromptProposal(
	input: ChatMessageInput,
	output: ChatMessageOutput,
	options: Options,
	dependencies: PromptProposalRewriteDependencies,
): Promise<PromptProposalResult>;
export async function handlePromptProposal(
	input: ChatMessageInput,
	output: ChatMessageOutput,
	options: Options,
	dependencies: PromptProposalDependencies,
): Promise<PromptProposalResult> {
	const {
		checkPrompt: runCheckPrompt,
		rewritePrompt,
		writeProposal: writeRecord = writeProposal,
		log: writeLog = noopLog,
		now = (): Date => new Date(),
	} = dependencies;

	const candidate: ReturnType<typeof createPromptProposalCandidate> = createPromptProposalCandidate(output, options);
	if (!candidate) {
		return { status: 'skipped' };
	}

	const result: PolisherResult = await runCheckPrompt(input, options, candidate.originalPrompt);
	if (!shouldCreatePromptProposalRecord(result, candidate.originalPrompt)) {
		return { status: 'skipped' };
	}

	const record: ProposalRecord | undefined = createPromptProposalRecord(
		input,
		candidate,
		result,
		now().toISOString(),
	);
	if (!record) {
		return { status: 'skipped' };
	}

	if (options.mode === 'rewrite' && rewritePrompt !== undefined) {
		await rewritePrompt(record, input, output);
	}

	const outputResult: ProposalOutputResult = await writeRecord(record, options);

	await logProposalOutputResults(record, outputResult, writeLog);
	return { status: 'created', record, output: outputResult };
}
