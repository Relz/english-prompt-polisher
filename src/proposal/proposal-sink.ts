export type ProposalOutputSinkStatus = 'written' | 'skipped';

export type ProposalOutputSinkResult =
	| { sink: string; status: 'written'; message: string }
	| { sink: string; status: 'skipped' }
	| { sink: string; status: 'failed'; message: string; error: unknown };

export type ProposalOutputResult = ProposalOutputSinkResult[];

export type ProposalSink = {
	sink: string;
	writtenMessage: string;
	failedMessage: string;
	write: () => Promise<ProposalOutputSinkStatus>;
};

export function skippedProposalSink(sink: string): ProposalSink {
	return {
		sink,
		writtenMessage: '',
		failedMessage: '',
		write: (): Promise<'skipped'> => Promise.resolve('skipped'),
	};
}

export async function writeProposalSink({
	sink,
	writtenMessage,
	failedMessage,
	write,
}: ProposalSink): Promise<ProposalOutputSinkResult> {
	try {
		const status: ProposalOutputSinkStatus = await write();
		if (status === 'skipped') {
			return { sink, status };
		}
		return { sink, status, message: writtenMessage };
	} catch (error) {
		return { sink, status: 'failed', message: failedMessage, error };
	}
}
