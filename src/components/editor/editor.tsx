'use client';

import { $convertFromMarkdownString } from '@lexical/markdown';
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';
import { $getRoot, $createParagraphNode } from 'lexical';
import { FileWarningIcon } from 'lucide-react';
import posthog from 'posthog-js';
import * as React from 'react';

import FloatingLinkEditorPlugin from '@/components/editor/plugins/floating-link-editor-plugin';
import ShortcutsPlugin from '@/components/editor/plugins/shortcuts-plugin';
import ToolbarPlugin from '@/components/editor/plugins/toolbar-editor-plugin';
import '@/lib/styles/editor-check-list.scss';
import { ChatStatusContext } from '@/components/providers/chat-status-provider';
import { useDocument } from '@/components/providers/document-provider';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import editorSampleContents, { type SampleContentKey } from '@/lib/constants/editor-sample-contents';
import ENHANCED_LEXICAL_TRANSFORMERS from '@/lib/constants/enhanced-lexical-transformers';
import { resetEditorSelection } from '@/lib/utils/editor-helpers';
import { validateUrl } from '@/lib/utils/url';

export default function Editor() {
  const [editor] = useLexicalComposerContext();
  const [isFocused, setIsFocused] = React.useState(false);
  const { status } = React.use(ChatStatusContext);
  const { handleEditorChange } = useDocument();
  const floatingAnchorRef = React.useRef<HTMLDivElement>(null);

  function fillSampleContent(content: string, key: SampleContentKey) {
    posthog.capture('fill_sample_content', { content_type: key });

    editor.update(
      () => {
        const root = $getRoot();

        if (root.isEmpty()) {
          root.append($createParagraphNode());
        }
      },
      { discrete: true }
    );

    editor.update(() => {
      const root = $getRoot();

      if (root.isEmpty()) {
        root.append($createParagraphNode());
      }

      $convertFromMarkdownString(content, ENHANCED_LEXICAL_TRANSFORMERS, undefined, true);
    });

    resetEditorSelection(editor);
  }

  function focusEditor() {
    const editorElement = document.querySelector('.editor [contenteditable="true"]');

    if (editorElement && editorElement instanceof HTMLElement) {
      editorElement.focus();
    }
  }

  return (
    <div className="editor group relative flex h-full min-h-0 flex-col overflow-hidden">
      <ToolbarPlugin />
      <RichTextPlugin
        ErrorBoundary={LexicalErrorBoundary}
        contentEditable={
          <div
            ref={floatingAnchorRef}
            className="border-border focus-within:border-foreground group relative min-h-0 flex-1 overflow-y-auto border-t px-[1px] pb-[1px] focus-within:border focus-within:px-0 focus-within:pb-0.5"
          >
            <ContentEditable
              className="h-fit p-4 outline-none"
              aria-placeholder="Start typing your document..."
              onFocus={() => {
                setIsFocused(true);
              }}
              onBlur={() => {
                setIsFocused(false);
              }}
              placeholder={
                <div className="absolute top-[18px] left-5 space-y-4 select-none group-focus-within:left-[19px]">
                  <p
                    onClick={focusEditor}
                    className="text-muted-foreground/60 group-focus-within:text-muted-foreground cursor-text"
                  >
                    Start typing your document or fill in sample content
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {editorSampleContents.map((sample) => {
                      return (
                        <Button
                          size="sm"
                          key={sample.key}
                          variant={sample.key === 'everything' ? 'default' : 'outline'}
                          onClick={() => {
                            fillSampleContent(sample.content, sample.key);
                          }}
                        >
                          {sample.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              }
            />
            {isFocused && (status === 'submitted' || status === 'streaming') && (
              <div className="absolute right-0 bottom-0 left-0 p-2">
                <Alert variant="destructive">
                  <FileWarningIcon />
                  <AlertTitle>Please don&apos;t make edits to the document yet</AlertTitle>
                  <AlertDescription>
                    The editor content is managed by the AI at this moment. Making manual edits may lead to unexpected
                    behavior.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
        }
      />
      <ListPlugin />
      <HistoryPlugin />
      <ShortcutsPlugin />
      <CheckListPlugin />
      <TabIndentationPlugin />
      <LinkPlugin validateUrl={validateUrl} />
      <OnChangePlugin onChange={handleEditorChange} />
      <MarkdownShortcutPlugin transformers={ENHANCED_LEXICAL_TRANSFORMERS} />
      {floatingAnchorRef.current && <FloatingLinkEditorPlugin anchor={floatingAnchorRef.current} />}
    </div>
  );
}
