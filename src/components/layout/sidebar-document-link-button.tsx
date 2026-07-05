import {
  FileIcon,
  TrashIcon,
  Settings2Icon,
  FolderInputIcon,
  LoaderCircleIcon,
  EllipsisVerticalIcon,
} from 'lucide-react';
import { useLinkStatus } from 'next/link';
import * as React from 'react';

import { useDocument } from '@/components/providers/document-provider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import useIsMobile from '@/lib/hooks/use-is-mobile';
import type { DocumentItem } from '@/lib/models/document.model';
import cn from '@/lib/utils/cn';

export default function SidebarDocumentLinkButton({ document }: { document: DocumentItem }) {
  const { pending } = useLinkStatus();
  const {
    activeDocument,
    activeDropdownDocumentId,
    documentIdBeingRemoved,
    documentIdInteractedWith,
    folders,
    handleDropdownOpenChange,
    initiateDocumentRemoval,
    openDocumentDialog,
    openMoveDialog,
  } = useDocument();
  const isMobile = useIsMobile();

  return (
    <div className="flex">
      <Button
        size="sm"
        tabIndex={-1}
        variant="ghost"
        disabled={documentIdBeingRemoved === document.id || pending}
        className={cn(
          'flex-1 justify-start overflow-hidden rounded-r-none pl-4! transition-none hover:bg-transparent dark:hover:bg-transparent',
          pending && 'pending',
          (pending || document.id === documentIdBeingRemoved) && 'justify-between pr-0',
          (pending || document.id === documentIdInteractedWith || document.id === activeDropdownDocumentId) &&
            'bg-secondary/50 hover:bg-secondary/50 dark:hover:bg-secondary/50 text-secondary-foreground',
          document.id === activeDocument?.id && 'bg-secondary hover:bg-secondary pointer-events-none cursor-default'
        )}
      >
        <FileIcon className="size-4 shrink-0" />
        <p className="flex-1 overflow-hidden text-left text-sm font-medium text-ellipsis">
          {document.title || 'Untitled'}
        </p>
        {(pending || documentIdBeingRemoved === document.id) && (
          <LoaderCircleIcon className="size-4 min-w-4 animate-spin" />
        )}
      </Button>

      <DropdownMenu
        open={activeDropdownDocumentId === document.id}
        onOpenChange={(isOpen) => {
          handleDropdownOpenChange(isOpen, document.id);
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending || documentIdBeingRemoved === document.id}
            className={cn(
              'focus:bg-accent rounded-l-none opacity-0 transition-none focus:opacity-100 focus:ring-0! focus:outline-none',
              (pending || documentIdBeingRemoved === document.id) && 'hidden',
              (isMobile ||
                pending ||
                document.id === activeDropdownDocumentId ||
                document.id === documentIdBeingRemoved ||
                document.id === documentIdInteractedWith ||
                document.id === activeDocument?.id) &&
                'opacity-100',
              (pending || documentIdInteractedWith === document.id || activeDropdownDocumentId === document.id) &&
                'bg-secondary/50 text-secondary-foreground hover:bg-secondary/75',
              document.id === activeDocument?.id && 'bg-secondary hover:bg-secondary/75 dark:hover:bg-secondary/75'
            )}
          >
            <EllipsisVerticalIcon className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" sideOffset={16}>
          <DropdownMenuItem
            className="space-x-2"
            onClick={() => {
              openDocumentDialog();
            }}
          >
            <Settings2Icon />
            Edit details
          </DropdownMenuItem>
          <DropdownMenuItem
            className="space-x-2"
            disabled={!document.folderId && folders.length === 0}
            onClick={() => {
              openMoveDialog({ id: document.id, kind: 'document' });
            }}
          >
            <FolderInputIcon />
            Move to folder
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            className="space-x-2"
            onClick={() => {
              void initiateDocumentRemoval(document.id);
            }}
          >
            <TrashIcon />
            Remove document
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
