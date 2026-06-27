import type { Options } from '../shared/options.ts';

import { writeProposalSink } from './proposal-sink.ts';
import type { ProposalOutputResult } from './proposal-sink.ts';
import { createProposalSinks } from './proposal-sinks.ts';
import { resolveProposalOutputTargets, type ProposalOutputTargets } from './proposal-targets.ts';
import type { ProposalRecord } from './proposal-types.ts';

export type { ProposalOutputResult, ProposalOutputSinkResult } from './proposal-sink.ts';

export async function writeProposal(record: ProposalRecord, options: Options): Promise<ProposalOutputResult> {
	const targets: ProposalOutputTargets = resolveProposalOutputTargets(options);
	return await Promise.all(createProposalSinks(record, targets).map(writeProposalSink));
}
