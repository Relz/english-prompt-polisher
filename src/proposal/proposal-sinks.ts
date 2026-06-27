import { proposalFileSink } from './proposal-file-sink.ts';
import { proposalNotionSink } from './proposal-notion-sink.ts';
import type { ProposalSink } from './proposal-sink.ts';
import type { ProposalOutputTargets } from './proposal-targets.ts';
import type { ProposalRecord } from './proposal-types.ts';

type ProposalSinkFactory = (record: ProposalRecord, targets: ProposalOutputTargets) => ProposalSink;

const proposalSinkFactories: ProposalSinkFactory[] = [
	(record, targets): ProposalSink => proposalFileSink(record, targets.file),
	(record, targets): ProposalSink => proposalNotionSink(record, targets.notion),
];

export function createProposalSinks(record: ProposalRecord, targets: ProposalOutputTargets): ProposalSink[] {
	return proposalSinkFactories.map((factory) => factory(record, targets));
}
