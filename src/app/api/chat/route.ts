import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { currentUser } from '@clerk/nextjs/server';
import {
  streamText,
  stepCountIs,
  type UIMessage,
  toUIMessageStream,
  convertToModelMessages,
  createUIMessageStreamResponse,
} from 'ai';

import { tools } from '@/lib/models/editor-commands';
import { decryptKey } from '@/lib/utils/encryption';
import wrapEditorPrompt from '@/lib/utils/wrap-editor-prompt';

export const maxDuration = 300;

type RequestBody = {
  apiKey?: string;
  editorMarkdownContent: string;
  editorRootChildren: string;
  messages: UIMessage[];
  model: string;
  providerName: 'openai' | 'claude';
};

export async function POST(req: Request) {
  const user = await currentUser();
  const { editorMarkdownContent, editorRootChildren, messages, model, providerName }: RequestBody = await req.json();

  if (providerName !== 'openai' && providerName !== 'claude') {
    return new Response('Invalid provider', { status: 400 });
  }

  const providerApiKey =
    providerName === 'openai' ? user?.privateMetadata.openaiApiKey : user?.privateMetadata.claudeApiKey;

  if (typeof providerApiKey !== 'string') {
    return new Response('API key is required', { status: 400 });
  }

  const apiKey = decryptKey(providerApiKey);

  const provider = providerName === 'openai' ? createOpenAI({ apiKey }) : createAnthropic({ apiKey });

  const result = streamText({
    messages: await convertToModelMessages(messages),
    model: provider(model),
    stopWhen: stepCountIs(5),
    system: wrapEditorPrompt(editorMarkdownContent, editorRootChildren),
    tools,
    experimental_telemetry: {
      isEnabled: true,
      recordInputs: true,
      recordOutputs: true,
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
