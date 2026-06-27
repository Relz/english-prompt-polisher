# English Prompt Polisher

Reusable TypeScript library for proposing polished English versions of user prompts used with AI assistants.

The package does not include an adapter for any concrete AI agent. Integrations provide their own hook, model call, dedupe, scheduling, and logging through dependency injection.

## Features

- Proposes English versions for non-English prompts.
- Polishes grammatically incorrect or unclear English prompts.
- Keeps already clear English prompts unchanged.
- Skips internal checker prompts to avoid recursion.
- Writes proposals to `~/english-prompt-polisher.md` by default.
- Optionally creates one Notion database entry per proposal.
- Can call an adapter-provided rewrite callback while still writing proposal outputs.

## Install

```sh
npm install english-prompt-polisher
```

## Integration Example

Use `handlePromptProposal` inside your AI-agent plugin or message hook. The integration is responsible for adapting the concrete agent's message shape to `ChatMessageInput` and `ChatMessageOutput`, then providing a checker implementation.

```ts
import {
	buildCheckerPrompt,
	handlePromptProposal,
	parseCheckerResult,
	type ChatMessageInput,
	type ChatMessageOutput,
	type Options,
	type PolisherResult,
} from 'english-prompt-polisher';

const options: Options = {
	outputFile: '~/english-prompt-polisher.md',
	checker: { model: 'provider/model' },
	notion: {
		enabled: true,
		token: process.env.ENGLISH_PROMPT_POLISHER_NOTION_TOKEN,
		databaseId: process.env.ENGLISH_PROMPT_POLISHER_NOTION_DATABASE_ID,
	},
};

async function onUserPrompt(event: AgentMessageEvent): Promise<void> {
	const input: ChatMessageInput = {
		conversationId: event.conversationId,
		messageId: event.messageId,
		model: event.model,
	};

	const output: ChatMessageOutput = {
		parts: event.parts,
	};

	await handlePromptProposal(input, output, options, {
		checkPrompt: async (_input, checkerOptions, prompt): Promise<PolisherResult> => {
			const text: string = await event.ai.generateText({
				model: checkerOptions.checker?.model,
				prompt: buildCheckerPrompt(prompt),
			});

			return parseCheckerResult([{ type: 'text', text }]);
		},
		log: async (level, message, extra): Promise<void> => {
			event.logger[level](message, extra);
		},
	});
}
```

`AgentMessageEvent` is intentionally not provided by this package. It represents your integration's concrete message event type.

## Create a Plugin for Your AI Agent

Use this package as the prompt-polishing engine for your own AI-agent plugin. Wire it into your agent's message hook, pass the concrete message data into `handlePromptProposal`, and keep the agent-specific code focused on transport, dedupe, scheduling, model calls, and logging.

If you maintain an AI assistant, coding agent, chat client, or automation tool, create a small adapter around this library instead of rebuilding prompt detection, proposal formatting, file output, and Notion output from scratch.

Start with the integration example above, replace `AgentMessageEvent` with your agent's real event type, and publish the adapter as a plugin for that concrete agent.

## Rewrite Mode

Use `mode: 'rewrite'` when your adapter should replace the prompt with the proposed English prompt. Rewrite mode still writes proposal outputs, so proposals continue to be recorded in the configured Markdown file and, when enabled, in Notion.

```ts
const options: Options = {
	mode: 'rewrite',
	outputFile: '~/english-prompt-polisher.md',
	notion: {
		enabled: true,
		token: process.env.ENGLISH_PROMPT_POLISHER_NOTION_TOKEN,
		databaseId: process.env.ENGLISH_PROMPT_POLISHER_NOTION_DATABASE_ID,
	},
};

await handlePromptProposal(input, output, options, {
	checkPrompt,
	rewritePrompt: async (record): Promise<void> => {
		await event.rewritePrompt(record.proposedPrompt);
	},
});
```

The library decides when a rewrite is needed and passes the full proposal record to `rewritePrompt`. The concrete adapter still owns the agent-specific mutation because each agent exposes different hook and message APIs. Notion is optional and uses the same output flow as file proposals.

## Options

| Option                 | Default                        | Description                                         |
| ---------------------- | ------------------------------ | --------------------------------------------------- |
| `mode`                 | `proposal`                     | Use `rewrite` to call the adapter rewrite callback. |
| `outputFile`           | `~/english-prompt-polisher.md` | Markdown file that receives proposals.              |
| `maxChars`             | `4000`                         | Maximum prompt characters sent to the checker.      |
| `includeOriginal`      | `true`                         | Include the original prompt in the Markdown output. |
| `checker.model`        | unset                          | Optional model hint for the injected checker.       |
| `notion.enabled`       | `false`                        | Create Notion database entries.                     |
| `notion.token`         | unset                          | Direct Notion integration token.                    |
| `notion.databaseId`    | unset                          | Direct Notion database ID.                          |
| `notion.titleProperty` | auto-detect                    | Notion title property name.                         |

## Public API

- `handlePromptProposal`: high-level orchestration for extracting, checking, recording, and writing a proposal.
- `buildCheckerPrompt`: builds the checker prompt your integration can send to its model.
- `parseCheckerResult`: parses model output into a `PolisherResult`.
- `formatProposalMarkdown`: renders a proposal record as Markdown.
- `writeProposal`: writes a proposal to configured sinks.
- `normalizeOptions`: validates raw adapter options and normalizes shared option fields.
- `resolveCheckerModel`: resolves `checker.model` against the current input model.
- `formatUnknownError`: formats unknown thrown values for adapter logs.

The root export and `english-prompt-polisher/core` expose the same reusable core API. `english-prompt-polisher/notion` exposes Notion-specific helpers for integrations that want direct control over Notion writes.

Adapter lifecycle code such as message dedupe, background scheduling, and the concrete in-place prompt mutation belongs in the concrete AI-agent plugin because those behaviors depend on the agent's hook semantics and message model.

## Notion Setup

1. Create a Notion integration and copy its token.
2. Share the target database with the integration.
3. Export environment variables before starting your AI-agent integration:

```sh
export ENGLISH_PROMPT_POLISHER_NOTION_TOKEN="secret_..."
export ENGLISH_PROMPT_POLISHER_NOTION_DATABASE_ID="..."
```

The database must have a title property. These optional properties are filled only when they exist with matching Notion types:

- `Detected Language`: rich text
- `Conversation ID`: rich text
- `Created At`: date

The full reason, original prompt, and proposed English prompt are stored in the Notion page body.

## Output Example

````md
## 2026-06-13T12:00:00.000Z

- Conversation ID: conversation_123
- Message ID: message_456
- Detected Language: Spanish
- Reason: Prompt is written in Spanish and should be translated to English.

### Original Prompt

```text
Crea una herramienta CLI.
```

### Proposed English Prompt

```text
Create a CLI tool.
```
````

## Notes

- The original user prompt is not modified or blocked unless `mode: 'rewrite'` is configured and the adapter-provided `rewritePrompt` callback performs the mutation.
- The proposal is written as supporting output for the user to review.
- Checker failures are propagated to your integration.
- Default proposal output sinks do not throw on write failure. They return `{ status: 'failed' }` entries in `PromptProposalResult.output` and log warnings when a logger is provided.
- If you inject a custom `writeProposal` dependency and it rejects, that error is propagated.

## Handling Output Failures

```ts
const result: PromptProposalResult = await handlePromptProposal(input, output, options, dependencies);

if (result.status === 'created') {
	for (const sink of result.output) {
		if (sink.status === 'failed') {
			// Decide whether your integration should warn, retry, or fail.
		}
	}
}
```
