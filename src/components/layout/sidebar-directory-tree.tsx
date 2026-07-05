'use client';

import {
  TrashIcon,
  FolderIcon,
  FilePlusIcon,
  Settings2Icon,
  FolderOpenIcon,
  FolderPlusIcon,
  FolderInputIcon,
  LoaderCircleIcon,
  EllipsisVerticalIcon,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import SidebarDocumentLinkButton from '@/components/layout/sidebar-document-link-button';
import { useDocument } from '@/components/providers/document-provider';
import { useSidebar } from '@/components/providers/sidebar-provider';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import useIsMobile from '@/lib/hooks/use-is-mobile';
import type { DocumentItem } from '@/lib/models/document.model';
import type { FolderNode } from '@/lib/utils/build-directory-tree';
import cn from '@/lib/utils/cn';
import getFolderSubtreeIds from '@/lib/utils/get-folder-subtree-ids';

type SidebarDirectoryTreeProps = {
  documents: DocumentItem[];
  folders: FolderNode[];
};

export default function SidebarDirectoryTree({ documents, folders }: SidebarDirectoryTreeProps) {
  return (
    <ul className="flex flex-col gap-1">
      {folders.map((folder) => {
        return <SidebarFolderItem key={folder.id} folder={folder} />;
      })}
      {documents.map((document) => {
        return <SidebarDocumentItem key={document.id} document={document} />;
      })}
    </ul>
  );
}

function SidebarDocumentItem({ document }: { document: DocumentItem }) {
  const isMobile = useIsMobile();
  const { toggleSidebar } = useSidebar();
  const { activeDocument, documentIdBeingRemoved, setDocumentIdInteractedWith } = useDocument();

  return (
    <li
      className="relative flex items-center rounded-md"
      onMouseLeave={() => {
        setDocumentIdInteractedWith('');
      }}
      onMouseEnter={() => {
        setDocumentIdInteractedWith(document.id);
      }}
    >
      <Link
        prefetch={false}
        href={{ pathname: '/', query: { document: document.id } }}
        className={cn(
          'focus:ring-accent flex-1 overflow-hidden focus:ring-2 focus:ring-offset-2 has-[.pending]:cursor-wait',
          documentIdBeingRemoved === document.id && 'pointer-events-none cursor-wait',
          document.id === activeDocument?.id && 'cursor-default'
        )}
        onClick={(e) => {
          if (
            document.id === activeDocument?.id ||
            (e.target instanceof HTMLElement && e.target.dataset.slot === 'dropdown-menu-item')
          ) {
            return e.preventDefault();
          }

          if (isMobile) {
            toggleSidebar();
          }
        }}
      >
        <SidebarDocumentLinkButton document={document} />
      </Link>
    </li>
  );
}

function SidebarFolderItem({ folder }: { folder: FolderNode }) {
  const isMobile = useIsMobile();
  const {
    activeDropdownFolderId,
    expandedFolderIds,
    folderIdBeingRemoved,
    folderIdInteractedWith,
    folders,
    handleFolderDropdownOpenChange,
    initiateFolderRemoval,
    openDocumentDialog,
    openFolderDialog,
    openMoveDialog,
    setFolderIdInteractedWith,
    toggleFolderExpansion,
  } = useDocument();

  const isExpanded = expandedFolderIds.has(folder.id);
  const isBeingRemoved = folderIdBeingRemoved === folder.id;
  const hasChildren = folder.subfolders.length > 0 || folder.documents.length > 0;
  const subtreeIds = getFolderSubtreeIds(folders, folder.id);
  const canBeMoved =
    !!folder.parentId ||
    folders.some((item) => {
      return !subtreeIds.has(item.id);
    });

  return (
    <li className="relative rounded-md">
      <Collapsible
        open={isExpanded}
        onOpenChange={() => {
          toggleFolderExpansion(folder.id);
        }}
      >
        <div
          className="flex items-center"
          onMouseLeave={() => {
            setFolderIdInteractedWith('');
          }}
          onMouseEnter={() => {
            setFolderIdInteractedWith(folder.id);
          }}
        >
          <CollapsibleTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              disabled={isBeingRemoved}
              className={cn(
                'flex-1 justify-start overflow-hidden rounded-r-none pl-4! transition-none hover:bg-transparent dark:hover:bg-transparent',
                isBeingRemoved && 'justify-between pr-0',
                (folder.id === folderIdInteractedWith || folder.id === activeDropdownFolderId) &&
                  'bg-secondary/50 hover:bg-secondary/50 dark:hover:bg-secondary/50 text-secondary-foreground'
              )}
            >
              {isExpanded ? <FolderOpenIcon className="size-4 shrink-0" /> : <FolderIcon className="size-4 shrink-0" />}
              <p className="flex-1 overflow-hidden text-left text-sm font-medium text-ellipsis">{folder.name}</p>
              {isBeingRemoved && <LoaderCircleIcon className="size-4 min-w-4 animate-spin" />}
            </Button>
          </CollapsibleTrigger>

          <DropdownMenu
            open={activeDropdownFolderId === folder.id}
            onOpenChange={(isOpen) => {
              handleFolderDropdownOpenChange(isOpen, folder.id);
            }}
          >
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                disabled={isBeingRemoved}
                className={cn(
                  'focus:bg-accent rounded-l-none opacity-0 transition-none focus:opacity-100 focus:ring-0! focus:outline-none',
                  isBeingRemoved && 'hidden',
                  (isMobile || folder.id === activeDropdownFolderId || folder.id === folderIdInteractedWith) &&
                    'opacity-100',
                  (folderIdInteractedWith === folder.id || activeDropdownFolderId === folder.id) &&
                    'bg-secondary/50 text-secondary-foreground hover:bg-secondary/75'
                )}
              >
                <EllipsisVerticalIcon className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" sideOffset={16}>
              <DropdownMenuItem
                className="space-x-2"
                onClick={() => {
                  openFolderDialog();
                }}
              >
                <Settings2Icon />
                Edit details
              </DropdownMenuItem>
              <DropdownMenuItem
                className="space-x-2"
                disabled={!canBeMoved}
                onClick={() => {
                  openMoveDialog({ id: folder.id, kind: 'folder' });
                }}
              >
                <FolderInputIcon />
                Move to folder
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="space-x-2"
                onClick={() => {
                  openDocumentDialog({ parentFolderId: folder.id });
                }}
              >
                <FilePlusIcon />
                New document inside
              </DropdownMenuItem>
              <DropdownMenuItem
                className="space-x-2"
                onClick={() => {
                  openFolderDialog({ parentFolderId: folder.id });
                }}
              >
                <FolderPlusIcon />
                New folder inside
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                className="space-x-2"
                onClick={() => {
                  void initiateFolderRemoval(folder.id);
                }}
              >
                <TrashIcon />
                Remove folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <CollapsibleContent>
          {hasChildren ? (
            <div className="border-border mt-1 ml-4 border-l pl-1">
              <SidebarDirectoryTree folders={folder.subfolders} documents={folder.documents} />
            </div>
          ) : (
            <p className="text-muted-foreground mt-1 ml-6 py-1 pl-4 text-xs">Empty folder</p>
          )}
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}
