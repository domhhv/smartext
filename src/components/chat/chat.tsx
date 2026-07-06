'use client';

import { useChat } from '@ai-sdk/react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { UIMessage, UIDataTypes } from 'ai';
import { lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import { MessageSquare } from 'lucide-react';
import * as React from 'react';

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import type { PromptInputMessage } from '@/components/ai-elements/prompt-input';
import { Tool, ToolInput, ToolHeader, ToolOutput, ToolContent } from '@/components/ai-elements/tool';
import ChatEmptyState from '@/components/chat/chat-empty-state';
import ChatHeader from '@/components/chat/chat-header';
import ChatPromptInput from '@/components/chat/chat-prompt-input';
import { ChatStatusContext } from '@/components/providers/chat-status-provider';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import QuantumLoader from '@/components/ui/quantum-loader';
import type { EditorCommandTools } from '@/lib/models/editor-commands';
import executeEditorCommand from '@/lib/utils/execute-editor-command';
import getErrorMessage from '@/lib/utils/get-error-message';
import $getNextEditorState from '@/lib/utils/get-next-editor-state';

type ChatProps = {
  hasApiKey: boolean;
  isAuthenticated: boolean;
};

export default function Chat({ hasApiKey, isAuthenticated }: ChatProps) {
  const [editor] = useLexicalComposerContext();
  const [model, setModel] = React.useState('gpt-5.5');
  const { setStatus } = React.use(ChatStatusContext);
  const { addToolOutput, error, messages, sendMessage, status } = useChat<
    UIMessage<unknown, UIDataTypes, EditorCommandTools>
  >({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    async onToolCall({ toolCall }) {
      const { dynamic, input, toolCallId, toolName } = toolCall;

      if (dynamic) {
        return;
      }

      if (toolName === 'insertParagraph') {
        const result = await executeEditorCommand(editor, {
          ...input,
          type: 'insertParagraph',
        });

        void addToolOutput({
          output: result,
          tool: toolName,
          toolCallId,
        });
      }

      if (toolName === 'editParagraph') {
        const result = await executeEditorCommand(editor, {
          ...input,
          type: 'editParagraph',
        });

        void addToolOutput({
          output: result,
          tool: toolName,
          toolCallId,
        });
      }

      if (toolName === 'formatText') {
        const result = await executeEditorCommand(editor, {
          ...input,
          type: 'formatText',
        });

        void addToolOutput({
          output: result,
          tool: toolName,
          toolCallId,
        });
      }
    },
  });

  React.useEffect(() => {
    setStatus(status);
  }, [status, setStatus]);

  const submitMessage = React.useCallback(
    async (message: PromptInputMessage, providerName: string) => {
      editor.read(() => {
        const { nextEditorMarkdownContent: editorMarkdownContent, nextEditorRootChildren: editorRootChildren } =
          $getNextEditorState();

        void sendMessage(message, {
          body: {
            editorMarkdownContent,
            editorRootChildren,
            model,
            providerName,
          },
        });
      });
    },
    [editor, sendMessage, model]
  );

  if (!hasApiKey) {
    return (
      <div className="flex h-full flex-col">
        <ChatHeader />
        <ChatEmptyState isAuthenticated={isAuthenticated} />
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full flex-col overflow-x-auto">
        <ChatHeader />

        <div className="relative flex flex-1 flex-col justify-between overflow-y-auto">
          {error && (
            <div className="m-4">
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{getErrorMessage(error)}</AlertDescription>
              </Alert>
            </div>
          )}
          <Conversation className="relative size-full">
            <ConversationContent>
              {messages.length === 0 && (
                <ConversationEmptyState
                  title="No messages yet"
                  icon={<MessageSquare />}
                  description="Send a message to start the conversation."
                />
              )}
              {messages.map((message) => {
                return (
                  <Message key={message.id} from={message.role}>
                    <MessageContent className="w-full">
                      {message.parts.map((part, i) => {
                        switch (part.type) {
                          case 'text':
                            return <MessageResponse key={`${message.id}-${i}`}>{part.text}</MessageResponse>;

                          case 'tool-insertParagraph':
                            return (
                              <Tool key={`${message.id}-${i}`}>
                                <ToolHeader type={part.type} state={part.state} title="New paragraph" />
                                <ToolContent>
                                  <ToolInput input={part.input} />
                                  <ToolOutput
                                    errorText={part.errorText}
                                    output={<div className="p-2">Inserted new paragraph</div>}
                                  />
                                </ToolContent>
                              </Tool>
                            );

                          case 'tool-editParagraph':
                            return (
                              <Tool key={`${message.id}-${i}`}>
                                <ToolHeader type={part.type} state={part.state} title="Edit paragraph" />
                                <ToolContent>
                                  <ToolInput input={part.input} />
                                  <ToolOutput
                                    errorText={part.errorText}
                                    output={<div className="p-2">Edited a paragraph</div>}
                                  />
                                </ToolContent>
                              </Tool>
                            );

                          case 'tool-formatText':
                            return (
                              <Tool key={`${message.id}-${i}`}>
                                <ToolHeader type={part.type} state={part.state} title="Format text" />
                                <ToolContent>
                                  <ToolInput input={part.input} />
                                  <ToolOutput
                                    errorText={part.errorText}
                                    output={<div className="p-2">Formatted text</div>}
                                  />
                                </ToolContent>
                              </Tool>
                            );
                        }
                      })}
                    </MessageContent>
                  </Message>
                );
              })}
              {status === 'submitted' && (
                <QuantumLoader size={30} color="var(--foreground)" className="ml-3 animate-spin" />
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          <div className="bg-background/80 border-border sticky bottom-0 border-t p-4 backdrop-blur-md">
            <ChatPromptInput model={model} status={status} onSubmit={submitMessage} onModelChange={setModel} />
          </div>
        </div>
      </div>
    </>
  );
}
