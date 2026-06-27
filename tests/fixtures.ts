import type { ChatMessageInput, ChatMessageOutput, ChatParts, TextChatPart } from '../src/shared/chat.ts';

const defaultModel: NonNullable<ChatMessageInput['model']> = { providerID: 'anthropic', modelID: 'claude' };

export function chatInput(overrides: Partial<ChatMessageInput> = {}): ChatMessageInput {
	const input: ChatMessageInput = {
		conversationId: 'conversation_123',
		messageId: 'message_456',
		model: defaultModel,
		...overrides,
	};
	return input;
}

export function textPart(text: string, overrides: Partial<TextChatPart> = {}): TextChatPart {
	const part: TextChatPart = {
		id: 'prt_123',
		type: 'text',
		text,
		...overrides,
	};
	return part;
}

type TestUserMessage = {
	id: string;
	conversationId: string;
	role: 'user';
	time: { created: number };
	model: NonNullable<ChatMessageInput['model']>;
};

export function userMessage(overrides: Partial<TestUserMessage> = {}): TestUserMessage {
	const message: TestUserMessage = {
		id: 'message_456',
		conversationId: 'conversation_123',
		role: 'user',
		time: { created: 0 },
		model: defaultModel,
		...overrides,
	};
	return message;
}

export function chatOutput(parts: ChatParts): ChatMessageOutput {
	const output: ChatMessageOutput = {
		message: userMessage(),
		parts,
	};
	return output;
}
