'use client';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { Edit3, Columns2, MessageSquare } from 'lucide-react';
import posthog from 'posthog-js';
import * as React from 'react';
import type { Layout } from 'react-resizable-panels';
import { useSwipeable } from 'react-swipeable';

import { ChatStatusContext } from '@/components/providers/chat-status-provider';
import { MobileLayoutContext } from '@/components/providers/mobile-layout-provider';
import { Button } from '@/components/ui/button';
import { ResizablePanel, ResizableHandle, ResizablePanelGroup } from '@/components/ui/resizable';
import LAYOUT_PANELS from '@/lib/constants/layout-panels';
import cn from '@/lib/utils/cn';
import { resetEditorSelection } from '@/lib/utils/editor-helpers';
import setCookie from '@/lib/utils/set-cookie';

type AdaptiveLayoutProps = {
  chat: React.ReactNode;
  editor: React.ReactNode;
  initialChatWidth: number;
  initialEditorWidth: number;
};

const VIEW_MODES = ['chat', 'split', 'editor'] as const;
type ViewMode = (typeof VIEW_MODES)[number];

export default function AdaptiveLayout({ chat, editor, initialChatWidth, initialEditorWidth }: AdaptiveLayoutProps) {
  const { isMobile, setViewMode, viewMode } = React.use(MobileLayoutContext);
  const { isChatVisible } = React.use(ChatStatusContext);
  const [lexicalEditor] = useLexicalComposerContext();
  const defaultDesktopLayout = React.useMemo(() => {
    return {
      'chat-panel': initialChatWidth,
      'editor-panel': initialEditorWidth,
    };
  }, [initialChatWidth, initialEditorWidth]);

  React.useEffect(() => {
    if (isMobile && isChatVisible) {
      setViewMode('split');
    }
  }, [isMobile, isChatVisible, setViewMode]);

  React.useEffect(() => {
    setCookie('chat-collapsed', String(!isChatVisible));
  }, [isChatVisible]);

  function handleDesktopLayoutChanged(layout: Layout) {
    const chatWidth = layout['chat-panel'];
    const editorWidth = layout['editor-panel'];

    if (typeof chatWidth === 'number') {
      setCookie('chat-width', String(Math.round(chatWidth)));
    }

    if (typeof editorWidth === 'number') {
      setCookie('editor-width', String(Math.round(editorWidth)));
    }
  }

  const cycleViewMode = React.useCallback(
    (direction: 'left' | 'right') => {
      resetEditorSelection(lexicalEditor);

      const currentIndex = VIEW_MODES.indexOf(viewMode as ViewMode);
      let nextIndex: number;

      if (direction === 'left') {
        nextIndex = (currentIndex + 1) % VIEW_MODES.length;
      } else {
        nextIndex = (currentIndex - 1 + VIEW_MODES.length) % VIEW_MODES.length;
      }

      posthog.capture('swiped_to_view_mode', { mode: VIEW_MODES[nextIndex] });
      setViewMode(VIEW_MODES[nextIndex]);
    },
    [viewMode, setViewMode, lexicalEditor]
  );

  const swipeHandlers = useSwipeable({
    delta: 50,
    preventScrollOnSwipe: true,
    trackMouse: false,
    onSwipedLeft: () => {
      return isMobile && cycleViewMode('left');
    },
    onSwipedRight: () => {
      return isMobile && cycleViewMode('right');
    },
  });

  if (!isMobile) {
    if (!isChatVisible) {
      return <div className="h-full min-h-0">{editor}</div>;
    }

    return (
      <ResizablePanelGroup
        orientation="horizontal"
        className="h-full min-h-0"
        defaultLayout={defaultDesktopLayout}
        onLayoutChanged={handleDesktopLayoutChanged}
      >
        <ResizablePanel
          id="chat-panel"
          defaultSize={`${initialChatWidth}%`}
          minSize={`${LAYOUT_PANELS.CHAT_MIN_WIDTH}%`}
        >
          <div className="h-full min-h-0">{chat}</div>
        </ResizablePanel>
        <ResizableHandle isWithHandle />
        <ResizablePanel
          id="editor-panel"
          defaultSize={`${initialEditorWidth}%`}
          minSize={`${LAYOUT_PANELS.EDITOR_MIN_WIDTH}%`}
        >
          <div className="h-full min-h-0">{editor}</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  }

  if (!isChatVisible) {
    return <div className="flex h-full min-h-0 flex-col">{editor}</div>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative flex-1 overflow-hidden">
        {viewMode === 'split' ? (
          <ResizablePanelGroup className="h-full" orientation="vertical">
            <ResizablePanel minSize="45%" defaultSize="50%">
              <div className="h-full min-h-0">{chat}</div>
            </ResizablePanel>
            <ResizableHandle isWithHandle />
            <ResizablePanel minSize="30%" defaultSize="50%">
              <div className="h-full min-h-0">{editor}</div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <>
            <div
              className={cn(
                'absolute inset-0 transition-transform duration-300 ease-in-out',
                viewMode === 'chat' ? 'translate-y-0' : '-translate-y-full'
              )}
            >
              {chat}
            </div>
            <div
              className={cn(
                'absolute inset-0 transition-transform duration-300 ease-in-out',
                viewMode === 'editor' ? 'translate-y-0' : 'translate-y-full'
              )}
            >
              {editor}
            </div>
          </>
        )}
      </div>

      <div className="bg-background relative space-y-0.5 border-t p-2 text-center">
        <div {...swipeHandlers}>
          <div className="flex items-center justify-center gap-1">
            <Button
              size="sm"
              className={cn(viewMode === 'chat' && 'flex-1')}
              variant={viewMode === 'chat' ? 'default' : 'outline'}
              onClick={() => {
                resetEditorSelection(lexicalEditor);

                posthog.capture('clicked_on_mobile_view_mode', {
                  mode: 'chat',
                });
                setViewMode('chat');
              }}
            >
              <MessageSquare className="h-4 w-4" />
              {viewMode === 'chat' && 'Chat'}
            </Button>
            <Button
              size="sm"
              className={cn(viewMode === 'split' && 'flex-1')}
              variant={viewMode === 'split' ? 'default' : 'outline'}
              onClick={() => {
                resetEditorSelection(lexicalEditor);

                posthog.capture('clicked_on_mobile_view_mode', {
                  mode: 'split',
                });
                setViewMode('split');
              }}
            >
              <Columns2 className="h-4 w-4" />
              {viewMode === 'split' && 'Split'}
            </Button>
            <Button
              size="sm"
              className={cn(viewMode === 'editor' && 'flex-1')}
              variant={viewMode === 'editor' ? 'default' : 'outline'}
              onClick={() => {
                resetEditorSelection(lexicalEditor);

                posthog.capture('clicked_on_mobile_view_mode', {
                  mode: 'editor',
                });
                setViewMode('editor');
              }}
            >
              <Edit3 className="h-4 w-4" />
              {viewMode === 'editor' && 'Editor'}
            </Button>
          </div>
        </div>
        <span className="text-muted-foreground text-xs">Swipe left/right to change view mode</span>
      </div>
    </div>
  );
}
