'use client';

import * as Sentry from '@sentry/nextjs';
import { LoaderCircleIcon, ClipboardPasteIcon } from 'lucide-react';
import posthog from 'posthog-js';
import * as React from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogTitle, DialogFooter, DialogHeader, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { createDocument } from '@/lib/actions/document.actions';
import convertMarkdownToEditorState from '@/lib/utils/convert-markdown-to-editor-state';
import getErrorMessage from '@/lib/utils/get-error-message';

type PasteMarkdownDialogProps = {
  open: boolean;
  parentFolderId?: string | null;
  onOpenChange: (open: boolean) => void;
};

export default function PasteMarkdownDialog({ onOpenChange, open, parentFolderId }: PasteMarkdownDialogProps) {
  const [content, setContent] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [isOverflowing, setIsOverflowing] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const previewRef = React.useRef<HTMLDivElement>(null);
  const pasteTargetRef = React.useRef<HTMLDivElement>(null);

  function resetState() {
    setContent('');
    setTitle('');
    setIsOverflowing(false);
    setIsImporting(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetState();
    }

    onOpenChange(nextOpen);
  }

  React.useEffect(() => {
    if (open) {
      pasteTargetRef.current?.focus();
    }
  }, [open]);

  React.useLayoutEffect(() => {
    const element = previewRef.current;

    if (!element) {
      setIsOverflowing(false);

      return;
    }

    setIsOverflowing(element.scrollHeight > element.clientHeight);
  }, [content]);

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    setContent(event.clipboardData.getData('text/plain'));
  }

  async function handleConfirm() {
    if (!content) {
      return;
    }

    try {
      setIsImporting(true);

      const editorState = convertMarkdownToEditorState(content);
      const { id } = await createDocument({
        content: editorState,
        folderId: parentFolderId ?? null,
        title: title.trim() || 'Untitled Document',
      });

      posthog.capture('document_imported_from_markdown', { documentId: id });
      toast.success('Created a new document from pasted markdown');
      handleOpenChange(false);
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error creating document from pasted markdown: ', error);
      toast.error('Error creating document from pasted markdown', {
        description: getErrorMessage(error),
      });
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {open && (
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Paste Markdown</DialogTitle>
          </DialogHeader>

          <Input
            value={title}
            placeholder="Untitled Document"
            onChange={(event) => {
              setTitle(event.target.value);
            }}
          />

          <div className="relative">
            <div
              tabIndex={0}
              ref={pasteTargetRef}
              onPaste={handlePaste}
              className="border-input focus-visible:border-ring focus-visible:ring-ring/50 rounded-md border outline-none focus-visible:ring-[3px]"
            >
              <div ref={previewRef} className="max-h-56 overflow-y-auto p-3">
                {content ? (
                  <pre className="font-mono text-xs whitespace-pre-wrap">{content}</pre>
                ) : (
                  <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 py-8 text-center text-sm">
                    <ClipboardPasteIcon className="size-6" />
                    Press ⌘V / Ctrl+V to paste markdown
                  </div>
                )}
              </div>
            </div>
            {isOverflowing && (
              <div className="from-background pointer-events-none absolute inset-x-0 bottom-0 h-12 rounded-b-md bg-gradient-to-t to-transparent" />
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              disabled={!content || isImporting}
              onClick={() => {
                void handleConfirm();
              }}
            >
              {isImporting && <LoaderCircleIcon className="mr-2 animate-spin" />}
              Create Document
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
