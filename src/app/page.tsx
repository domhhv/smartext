import { currentUser } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';

import Chat from '@/components/chat/chat';
import Editor from '@/components/editor/editor';
import AdaptiveLayout from '@/components/layout/adaptive-layout';
import ChatStatusProvider from '@/components/providers/chat-status-provider';
import EditorToolbarStateProvider from '@/components/providers/editor-toolbar-state-provider';
import MobileLayoutProvider from '@/components/providers/mobile-layout-provider';
import LAYOUT_PANELS from '@/lib/constants/layout-panels';

function clampPaneWidth(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getInitialPaneWidths(chatWidthCookie: string | undefined, editorWidthCookie: string | undefined) {
  const storedChatWidth = Number(chatWidthCookie);
  const storedEditorWidth = Number(editorWidthCookie);
  const maxChatWidth = 100 - LAYOUT_PANELS.EDITOR_MIN_WIDTH;
  const maxEditorWidth = 100 - LAYOUT_PANELS.CHAT_MIN_WIDTH;

  if (Number.isFinite(storedChatWidth)) {
    const chatWidth = clampPaneWidth(storedChatWidth, LAYOUT_PANELS.CHAT_MIN_WIDTH, maxChatWidth);

    return {
      chatWidth,
      editorWidth: 100 - chatWidth,
    };
  }

  if (Number.isFinite(storedEditorWidth)) {
    const editorWidth = clampPaneWidth(storedEditorWidth, LAYOUT_PANELS.EDITOR_MIN_WIDTH, maxEditorWidth);

    return {
      chatWidth: 100 - editorWidth,
      editorWidth,
    };
  }

  return {
    chatWidth: LAYOUT_PANELS.CHAT_DEFAULT_WIDTH,
    editorWidth: LAYOUT_PANELS.EDITOR_DEFAULT_WIDTH,
  };
}

export default async function Home() {
  const user = await currentUser();
  const hasApiKey = Boolean(user?.privateMetadata.openaiApiKey) || Boolean(user?.privateMetadata.claudeApiKey);
  const cookieStore = await cookies();
  const isChatCollapsed = cookieStore.get('chat-collapsed')?.value === 'true';
  const initialPaneWidths = getInitialPaneWidths(
    cookieStore.get('chat-width')?.value,
    cookieStore.get('editor-width')?.value
  );

  return (
    <ChatStatusProvider defaultIsVisible={!isChatCollapsed}>
      <EditorToolbarStateProvider>
        <MobileLayoutProvider>
          <AdaptiveLayout
            editor={<Editor />}
            initialChatWidth={initialPaneWidths.chatWidth}
            initialEditorWidth={initialPaneWidths.editorWidth}
            chat={<Chat hasApiKey={hasApiKey} isAuthenticated={!!user} />}
          />
        </MobileLayoutProvider>
      </EditorToolbarStateProvider>
    </ChatStatusProvider>
  );
}
