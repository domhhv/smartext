'use client';

import {
  useSensor,
  DndContext,
  useSensors,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  FileIcon,
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
import type { FolderItem } from '@/lib/models/folder.model';
import type { FolderNode } from '@/lib/utils/build-directory-tree';
import cn from '@/lib/utils/cn';
import getFolderSubtreeIds from '@/lib/utils/get-folder-subtree-ids';

const HOVER_EXPAND_DELAY = 500;

type SidebarDirectoryTreeProps = {
  documents: DocumentItem[];
  folders: FolderNode[];
};

type DirectoryDragData = {
  id: string;
  kind: 'document' | 'folder';
  label: string;
  parentId: string | null;
};

type FolderDropData = {
  id: string;
  kind: 'folder';
};

type SelfDropData = {
  id: string;
  itemKind: DirectoryDragData['kind'];
  kind: 'self';
};

type DirectoryDropData = FolderDropData | SelfDropData;

export default function SidebarDirectoryTree({ documents, folders }: SidebarDirectoryTreeProps) {
  const { expandedFolderIds, expandFolderAndAncestors, folders: allFolders, moveDirectoryItem } = useDocument();
  const [activeDragItem, setActiveDragItem] = React.useState<DirectoryDragData | null>(null);
  const hoverExpandTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoveredFolderIdRef = React.useRef<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 6,
      },
    })
  );

  const clearHoverExpandTimeout = React.useCallback(() => {
    if (hoverExpandTimeoutRef.current) {
      clearTimeout(hoverExpandTimeoutRef.current);
      hoverExpandTimeoutRef.current = null;
    }
  }, []);

  const resetDragState = React.useCallback(() => {
    clearHoverExpandTimeout();
    hoveredFolderIdRef.current = null;
    setActiveDragItem(null);
  }, [clearHoverExpandTimeout]);

  React.useEffect(() => {
    return clearHoverExpandTimeout;
  }, [clearHoverExpandTimeout]);

  function handleDragStart(event: DragStartEvent) {
    const dragData = getDirectoryDragData(event.active.data.current);

    if (dragData) {
      setActiveDragItem(dragData);
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const dropData = getFolderDropData(event.over?.data.current);

    if (!dropData || expandedFolderIds.has(dropData.id)) {
      hoveredFolderIdRef.current = null;
      clearHoverExpandTimeout();

      return;
    }

    if (hoveredFolderIdRef.current === dropData.id) {
      return;
    }

    clearHoverExpandTimeout();
    hoveredFolderIdRef.current = dropData.id;
    hoverExpandTimeoutRef.current = setTimeout(() => {
      expandFolderAndAncestors(dropData.id);
      hoverExpandTimeoutRef.current = null;
    }, HOVER_EXPAND_DELAY);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const dragData = getDirectoryDragData(event.active.data.current);
    const dropData = getDirectoryDropData(event.over?.data.current);

    resetDragState();

    if (!dragData || !dropData || dropData.kind === 'self' || !canDropIntoFolder(dragData, dropData.id, allFolders)) {
      return;
    }

    await moveDirectoryItem({
      destinationFolderId: dropData.id,
      id: dragData.id,
      kind: dragData.kind,
    });
  }

  return (
    <DndContext
      sensors={sensors}
      onDragOver={handleDragOver}
      onDragCancel={resetDragState}
      onDragStart={handleDragStart}
      collisionDetection={closestCenter}
      onDragEnd={(event) => {
        void handleDragEnd(event);
      }}
    >
      <SidebarDirectoryTreeList folders={folders} documents={documents} />
      <DragOverlay>
        {activeDragItem && (
          <div className="bg-popover text-popover-foreground border-border flex h-8 max-w-64 items-center gap-2 rounded-md border px-3 text-sm font-medium shadow-lg">
            {activeDragItem.kind === 'folder' ? (
              <FolderIcon className="size-4 shrink-0" />
            ) : (
              <FileIcon className="size-4 shrink-0" />
            )}
            <span className="overflow-hidden text-ellipsis whitespace-nowrap">{activeDragItem.label}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function SidebarDirectoryTreeList({ documents, folders }: SidebarDirectoryTreeProps) {
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
  const {
    active,
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef: setDraggableNodeRef,
  } = useDraggable({
    disabled: documentIdBeingRemoved === document.id,
    id: getDraggableId('document', document.id),
    attributes: {
      role: 'link',
      roleDescription: 'draggable document',
    },
    data: {
      id: document.id,
      kind: 'document',
      label: document.title || 'Untitled',
      parentId: document.folderId ?? null,
    } satisfies DirectoryDragData,
  });
  const activeDragData = getDirectoryDragData(active?.data.current);
  const { isOver: isSelfOver, setNodeRef: setSelfDropNodeRef } = useDroppable({
    disabled: !isSameDirectoryItem(activeDragData, 'document', document.id),
    id: getSelfDropId('document', document.id),
    data: {
      id: document.id,
      itemKind: 'document',
      kind: 'self',
    } satisfies SelfDropData,
  });
  const setDocumentNodeRef = React.useCallback(
    (node: HTMLLIElement | null) => {
      setDraggableNodeRef(node);
      setSelfDropNodeRef(node);
    },
    [setDraggableNodeRef, setSelfDropNodeRef]
  );

  return (
    <li
      ref={setDocumentNodeRef}
      onMouseLeave={() => {
        setDocumentIdInteractedWith('');
      }}
      onMouseEnter={() => {
        setDocumentIdInteractedWith(document.id);
      }}
      className={cn(
        'relative flex items-center rounded-md',
        isDragging && 'opacity-40',
        isSelfOver && 'ring-primary/30 ring-1'
      )}
    >
      <Link
        prefetch={false}
        ref={setActivatorNodeRef}
        href={{ pathname: '/', query: { document: document.id } }}
        className={cn(
          'focus:ring-accent flex-1 touch-none overflow-hidden focus:ring-2 focus:ring-offset-2 has-[.pending]:cursor-wait',
          documentIdBeingRemoved === document.id && 'pointer-events-none cursor-wait',
          document.id === activeDocument?.id && 'cursor-default'
        )}
        {...listeners}
        {...attributes}
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
  const {
    active,
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef: setDraggableNodeRef,
  } = useDraggable({
    disabled: isBeingRemoved,
    id: getDraggableId('folder', folder.id),
    attributes: {
      roleDescription: 'draggable folder',
    },
    data: {
      id: folder.id,
      kind: 'folder',
      label: folder.name || 'Untitled',
      parentId: folder.parentId ?? null,
    } satisfies DirectoryDragData,
  });
  const activeDragData = getDirectoryDragData(active?.data.current);
  const isDropDisabled = !activeDragData || isBeingRemoved || !canDropIntoFolder(activeDragData, folder.id, folders);
  const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({
    disabled: isDropDisabled,
    id: getDroppableId(folder.id),
    data: {
      id: folder.id,
      kind: 'folder',
    } satisfies FolderDropData,
  });
  const { isOver: isSelfOver, setNodeRef: setSelfDropNodeRef } = useDroppable({
    disabled: !isSameDirectoryItem(activeDragData, 'folder', folder.id),
    id: getSelfDropId('folder', folder.id),
    data: {
      id: folder.id,
      itemKind: 'folder',
      kind: 'self',
    } satisfies SelfDropData,
  });
  const setFolderNodeRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      setDraggableNodeRef(node);
      setDroppableNodeRef(node);
      setSelfDropNodeRef(node);
    },
    [setDraggableNodeRef, setDroppableNodeRef, setSelfDropNodeRef]
  );
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
          ref={setFolderNodeRef}
          onMouseLeave={() => {
            setFolderIdInteractedWith('');
          }}
          onMouseEnter={() => {
            setFolderIdInteractedWith(folder.id);
          }}
          className={cn(
            'flex items-center rounded-md',
            isDragging && 'opacity-40',
            isSelfOver && 'ring-primary/30 ring-1'
          )}
        >
          <CollapsibleTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              disabled={isBeingRemoved}
              ref={setActivatorNodeRef}
              className={cn(
                'flex-1 touch-none justify-start overflow-hidden rounded-r-none pl-4! transition-none hover:bg-transparent dark:hover:bg-transparent',
                isBeingRemoved && 'justify-between pr-0',
                (folder.id === folderIdInteractedWith || folder.id === activeDropdownFolderId) &&
                  'bg-secondary/50 hover:bg-secondary/50 dark:hover:bg-secondary/50 text-secondary-foreground',
                isOver && 'bg-primary/10 text-primary hover:bg-primary/10 dark:hover:bg-primary/10'
              )}
              {...listeners}
              {...attributes}
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
              <SidebarDirectoryTreeList folders={folder.subfolders} documents={folder.documents} />
            </div>
          ) : (
            <p className="text-muted-foreground mt-1 ml-6 py-1 pl-4 text-xs">Empty folder</p>
          )}
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}

function getDraggableId(kind: DirectoryDragData['kind'], id: string) {
  return `${kind}:${id}`;
}

function getDroppableId(id: string) {
  return `folder-drop:${id}`;
}

function getSelfDropId(kind: DirectoryDragData['kind'], id: string) {
  return `self:${kind}:${id}`;
}

function getDirectoryDragData(data: unknown): DirectoryDragData | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const value = data as Partial<DirectoryDragData>;

  if (
    typeof value.id === 'string' &&
    (value.kind === 'document' || value.kind === 'folder') &&
    typeof value.label === 'string'
  ) {
    return {
      id: value.id,
      kind: value.kind,
      label: value.label,
      parentId: typeof value.parentId === 'string' ? value.parentId : null,
    };
  }

  return null;
}

function getFolderDropData(data: unknown): FolderDropData | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const value = data as Partial<FolderDropData>;

  if (typeof value.id === 'string' && value.kind === 'folder') {
    return {
      id: value.id,
      kind: value.kind,
    };
  }

  return null;
}

function getDirectoryDropData(data: unknown): DirectoryDropData | null {
  return getSelfDropData(data) ?? getFolderDropData(data);
}

function getSelfDropData(data: unknown): SelfDropData | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const value = data as Partial<SelfDropData>;

  if (
    typeof value.id === 'string' &&
    value.kind === 'self' &&
    (value.itemKind === 'document' || value.itemKind === 'folder')
  ) {
    return {
      id: value.id,
      itemKind: value.itemKind,
      kind: 'self',
    };
  }

  return null;
}

function isSameDirectoryItem(data: DirectoryDragData | null, kind: DirectoryDragData['kind'], id: string) {
  return data?.kind === kind && data.id === id;
}

function canDropIntoFolder(dragData: DirectoryDragData, destinationFolderId: string, folders: FolderItem[]) {
  if (dragData.parentId === destinationFolderId) {
    return false;
  }

  if (dragData.kind === 'document') {
    return true;
  }

  return !getFolderSubtreeIds(folders, dragData.id).has(destinationFolderId);
}
