export type ChatModel = {
	providerID: string;
	modelID: string;
};

export type ChatMessageInput = {
	conversationId: string;
	messageId?: string;
	model?: ChatModel;
};

export type ChatPart = {
	[key: string]: unknown;
	type: string;
	text?: string;
	synthetic?: boolean;
	ignored?: boolean;
};

export type TextChatPart = ChatPart & {
	type: 'text';
	text: string;
};
export type ChatParts = ChatPart[];

export type ChatMessageOutput = {
	parts: ChatParts;
	message?: unknown;
};
