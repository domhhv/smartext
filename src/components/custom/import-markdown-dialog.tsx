'use client';

import * as Sentry from '@sentry/nextjs';
import { FileIcon, UploadIcon, LoaderCircleIcon } from 'lucide-react';
import posthog from 'posthog-js';
import * as React from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogTitle, DialogFooter, DialogHeader, DialogContent } from '@/components/ui/dialog';
import { createDocument } from '@/lib/actions/document.actions';
import convertMarkdownToEditorState from '@/lib/utils/convert-markdown-to-editor-state';
import getErrorMessage from '@/lib/utils/get-error-message';

type ImportMarkdownDialogProps = {
  open: boolean;
  parentFolderId?: string | null;
  onOpenChange: (open: boolean) => void;
};

export default function ImportMarkdownDialog({ onOpenChange, open, parentFolderId }: ImportMarkdownDialogProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [isImporting, setIsImporting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function resetState() {
    setFile(null);
    setIsImporting(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetState();
    }

    onOpenChange(nextOpen);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
  }

  async function handleConfirm() {
    if (!file) {
      return;
    }

    try {
      setIsImporting(true);

      const content = await file.text();
      const editorState = convertMarkdownToEditorState(content);
      const title = file.name.replace(/\.(md|markdown)$/i, '');
      const { id } = await createDocument({
        content: editorState,
        folderId: parentFolderId ?? null,
        title,
      });

      posthog.capture('document_imported_from_markdown', { documentId: id });
      toast.success(`Imported "${file.name}" as a new document`);
      handleOpenChange(false);
    } catch (error) {
      Sentry.captureException(error);
      console.error('Error importing markdown file: ', error);
      toast.error('Error importing markdown file', {
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
            <DialogTitle>Import Markdown</DialogTitle>
          </DialogHeader>

          <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".md,.markdown,text/markdown"
          />

          <button
            type="button"
            onClick={() => {
              fileInputRef.current?.click();
            }}
            className="border-input hover:bg-accent hover:text-accent-foreground flex flex-col items-center justify-center gap-2 rounded-md border border-dashed px-6 py-10 text-center transition-colors"
          >
            {file ? (
              <>
                <FileIcon className="text-muted-foreground size-6" />
                <span className="text-sm font-medium">{file.name}</span>
                <span className="text-muted-foreground text-xs">Click to choose a different file</span>
              </>
            ) : (
              <>
                <UploadIcon className="text-muted-foreground size-6" />
                <span className="text-sm font-medium">Select a .md file</span>
                <span className="text-muted-foreground text-xs">This will create a new document</span>
              </>
            )}
          </button>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              disabled={!file || isImporting}
              onClick={() => {
                void handleConfirm();
              }}
            >
              {isImporting && <LoaderCircleIcon className="mr-2 animate-spin" />}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
