'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import * as Sentry from '@sentry/nextjs';
import { $getRoot, type EditorState } from 'lexical';
import { FolderIcon, FolderTreeIcon, LoaderCircleIcon } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import * as React from 'react';
import type { PropsWithChildren } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { useConfirm } from '@/components/providers/confirm-provider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogTitle,
  DialogFooter,
  DialogHeader,
  DialogContent,
  DialogDescription,
} from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectItem, SelectValue, SelectContent, SelectTrigger } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createDocument, removeDocument, updateDocument } from '@/lib/actions/document.actions';
import { createFolder, removeFolder, updateFolder } from '@/lib/actions/folder.actions';
import type { DocumentItem } from '@/lib/models/document.model';
import type { FolderItem } from '@/lib/models/folder.model';
import buildDirectoryTree, { type FolderNode } from '@/lib/utils/build-directory-tree';
import getErrorMessage from '@/lib/utils/get-error-message';
import getFolderSubtreeIds from '@/lib/utils/get-folder-subtree-ids';
import $getNextEditorState from '@/lib/utils/get-next-editor-state';

const ROOT_MOVE_DESTINATION = 'root';

type DirectoryDialogOptions = {
  parentFolderId?: string;
};

type MoveDialogTarget = {
  id: string;
  kind: 'document' | 'folder';
};

type MoveDirectoryItemOptions = MoveDialogTarget & {
  destinationFolderId: string;
};

type DocumentContextType = {
  activeDocument: DocumentItem | null;
  activeDropdownDocumentId: string | null;
  activeDropdownFolderId: string | null;
  documentIdBeingRemoved: string | null;
  documentIdInteractedWith: string;
  expandedFolderIds: ReadonlySet<string>;
  folderIdBeingRemoved: string | null;
  folderIdInteractedWith: string;
  folders: FolderItem[];
  hasUnsavedEditorChanges: boolean;
  isEditorEmpty: boolean;
  closeActiveDocument: () => void;
  expandFolderAndAncestors: (folderId: string) => void;
  handleDropdownOpenChange: (isOpen: boolean, documentId: string) => void;
  handleEditorChange: (editorState: EditorState) => void;
  handleFolderDropdownOpenChange: (isOpen: boolean, folderId: string) => void;
  initiateDocumentRemoval: (documentId: string) => Promise<void>;
  initiateFolderRemoval: (folderId: string) => Promise<void>;
  moveDirectoryItem: (options: MoveDirectoryItemOptions) => Promise<void>;
  openDocumentDialog: (options?: DirectoryDialogOptions) => void;
  openFolderDialog: (options?: DirectoryDialogOptions) => void;
  openMoveDialog: (target: MoveDialogTarget) => void;
  setDocumentIdInteractedWith: (documentId: string) => void;
  setFolderIdInteractedWith: (folderId: string) => void;
  toggleFolderExpansion: (folderId: string) => void;
};

const DocumentContext = React.createContext<DocumentContextType | null>(null);

export function useDocument(): DocumentContextType {
  const context = React.useContext(DocumentContext);

  if (!context) {
    throw new Error('useDocument must be used within a DocumentProvider');
  }

  return context;
}

const documentFormSchema = z.object({
  description: z.string().max(1000, 'Description is too long').optional(),
  title: z.string().max(255, 'Title is too long').optional(),
});

type DocumentProviderProps = PropsWithChildren<{
  documents: DocumentItem[];
  folders: FolderItem[];
  isAuthenticated: boolean;
}>;

export default function DocumentProvider({ children, documents, folders, isAuthenticated }: DocumentProviderProps) {
  const { confirm } = useConfirm();
  const [editor] = useLexicalComposerContext();
  const searchParams = useSearchParams();
  const router = useRouter();
  const form = useForm<z.infer<typeof documentFormSchema>>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: {
      description: '',
      title: '',
    },
  });

  const [isSavingDialog, setIsSavingDialog] = React.useState(false);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [dialogEntity, setDialogEntity] = React.useState<'document' | 'folder'>('document');
  const [dialogParentFolderId, setDialogParentFolderId] = React.useState<string | null>(null);
  const [folderIdBeingEdited, setFolderIdBeingEdited] = React.useState('');
  const [documentIdBeingRemoved, setDocumentIdBeingRemoved] = React.useState('');
  const [folderIdBeingRemoved, setFolderIdBeingRemoved] = React.useState('');
  const [activeDocument, setActiveDocument] = React.useState<DocumentItem | null>(null);
  const [activeDropdownDocumentId, setActiveDropdownDocumentId] = React.useState('');
  const [activeDropdownFolderId, setActiveDropdownFolderId] = React.useState('');
  const [documentIdInteractedWith, setDocumentIdInteractedWith] = React.useState('');
  const [folderIdInteractedWith, setFolderIdInteractedWith] = React.useState('');
  const [expandedFolderIds, setExpandedFolderIds] = React.useState<ReadonlySet<string>>(new Set());
  const [moveDialogTarget, setMoveDialogTarget] = React.useState<MoveDialogTarget | null>(null);
  const [moveDestinationId, setMoveDestinationId] = React.useState(ROOT_MOVE_DESTINATION);
  const [isMovingToFolder, setIsMovingToFolder] = React.useState(false);
  const [isEditorEmpty, setIsEditorEmpty] = React.useState(true);
  const [hasUnsavedEditorChanges, setHasUnsavedEditorChanges] = React.useState(false);
  const loadedDocumentIdRef = React.useRef<string | null | undefined>(undefined);
  const pendingCreatedDocumentIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const activeDocumentId = activeDocument?.id ?? null;

    if (loadedDocumentIdRef.current === activeDocumentId) {
      return;
    }

    loadedDocumentIdRef.current = activeDocumentId;

    if (!activeDocument) {
      return editor.update(() => {
        const root = $getRoot();

        if (!root.isEmpty()) {
          $getRoot().clear();
        }
      });
    }

    if (typeof activeDocument.content !== 'string') {
      return editor.update(() => {
        $getRoot().clear();
      });
    }

    editor.setEditorState(editor.parseEditorState(activeDocument.content || ''));
  }, [editor, activeDocument]);

  React.useEffect(() => {
    setHasUnsavedEditorChanges(false);
    setIsEditorEmpty(!activeDocument);
  }, [activeDocument]);

  React.useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, router]);

  React.useEffect(() => {
    const documentId = searchParams.get('document');

    if (!documentId) {
      pendingCreatedDocumentIdRef.current = null;

      return setActiveDocument(null);
    }

    const document = documents.find((doc) => {
      return doc.id === documentId;
    });

    if (!document) {
      /*
       * A freshly created document reaches the URL before the revalidated
       * documents list arrives, so hold off until the list catches up.
       */
      if (pendingCreatedDocumentIdRef.current === documentId) {
        return;
      }

      router.replace('/');
      toast.error('The requested document does not exist or is not accessible.');

      return setActiveDocument(null);
    }

    pendingCreatedDocumentIdRef.current = null;
    setActiveDocument(document || null);
  }, [searchParams, documents, router]);

  const expandFolderAndAncestors = React.useCallback(
    (folderId: string) => {
      setExpandedFolderIds((previous) => {
        const next = new Set(previous);
        const visitedIds = new Set<string>();
        let currentFolderId: string | null = folderId;

        while (currentFolderId && !visitedIds.has(currentFolderId)) {
          visitedIds.add(currentFolderId);
          next.add(currentFolderId);

          const currentId: string = currentFolderId;

          currentFolderId =
            folders.find((folder) => {
              return folder.id === currentId;
            })?.parentId ?? null;
        }

        return next.size === previous.size ? previous : next;
      });
    },
    [folders]
  );

  React.useEffect(() => {
    if (activeDocument?.folderId) {
      expandFolderAndAncestors(activeDocument.folderId);
    }
  }, [activeDocument, expandFolderAndAncestors]);

  const toggleFolderExpansion = React.useCallback((folderId: string) => {
    setExpandedFolderIds((previous) => {
      const next = new Set(previous);

      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }

      return next;
    });
  }, []);

  const handleEditorChange = React.useCallback(
    (editorState: EditorState) => {
      editorState.read(() => {
        const children = JSON.parse($getNextEditorState().nextEditorRootChildren);
        const currentEditorState = JSON.stringify(editorState);
        const hasTextContent = !!$getRoot().getTextContent();
        const isEmpty = !activeDocument && !hasTextContent;
        setIsEditorEmpty(isEmpty);
        setHasUnsavedEditorChanges(
          (hasTextContent || !!activeDocument?.content) && currentEditorState !== activeDocument?.content
        );

        console.info('Editor State Updated: ', {
          children,
          currentEditorState,
          editorState,
          textContent: $getRoot().getTextContent(),
        });
      });
    },
    [activeDocument]
  );

  const openDocumentDialog = React.useCallback(
    (options?: DirectoryDialogOptions) => {
      setTimeout(() => {
        setDocumentIdInteractedWith(documentIdInteractedWith);
        setFolderIdInteractedWith(folderIdInteractedWith);
      });
      posthog.capture(documentIdInteractedWith ? 'open_document_details_dialog' : 'open_new_document_dialog');
      setDialogEntity('document');
      setFolderIdBeingEdited('');
      setDialogParentFolderId(options?.parentFolderId ?? null);
      setIsDialogOpen(true);

      if (!documentIdInteractedWith) {
        form.setValue('title', '');
        form.setValue('description', '');
      } else {
        const document = documents.find((doc) => {
          return doc.id === documentIdInteractedWith;
        });

        if (document) {
          form.setValue('title', document.title || '');
          form.setValue('description', document.description || '');
        }
      }
    },
    [documentIdInteractedWith, folderIdInteractedWith, form, documents]
  );

  const openFolderDialog = React.useCallback(
    (options?: DirectoryDialogOptions) => {
      const folderIdToEdit = options?.parentFolderId === undefined ? folderIdInteractedWith : '';

      setTimeout(() => {
        setFolderIdInteractedWith(folderIdInteractedWith);
      });
      posthog.capture(folderIdToEdit ? 'open_folder_details_dialog' : 'open_new_folder_dialog');
      setDialogEntity('folder');
      setFolderIdBeingEdited(folderIdToEdit);
      setDialogParentFolderId(options?.parentFolderId ?? null);
      setIsDialogOpen(true);

      const folderBeingEdited = folders.find((folder) => {
        return folder.id === folderIdToEdit;
      });

      form.setValue('title', folderBeingEdited?.name || '');
      form.setValue('description', '');
    },
    [folderIdInteractedWith, form, folders]
  );

  const openMoveDialog = React.useCallback(
    (target: MoveDialogTarget) => {
      setTimeout(() => {
        setDocumentIdInteractedWith(documentIdInteractedWith);
        setFolderIdInteractedWith(folderIdInteractedWith);
      });
      posthog.capture('open_move_to_folder_dialog', { kind: target.kind });

      const currentParentId =
        target.kind === 'document'
          ? documents.find((document) => {
              return document.id === target.id;
            })?.folderId
          : folders.find((folder) => {
              return folder.id === target.id;
            })?.parentId;

      setMoveDestinationId(currentParentId ?? ROOT_MOVE_DESTINATION);
      setMoveDialogTarget(target);
    },
    [documentIdInteractedWith, folderIdInteractedWith, documents, folders]
  );

  async function onDialogFormSubmit(values: z.infer<typeof documentFormSchema>) {
    if (dialogEntity === 'folder') {
      const name = values.title?.trim();

      if (!name) {
        return form.setError('title', { message: 'Folder name is required' });
      }

      try {
        setIsSavingDialog(true);

        if (folderIdBeingEdited) {
          await updateFolder(folderIdBeingEdited, { name });
          posthog.capture('folder_updated', {
            folderId: folderIdBeingEdited,
          });
        } else {
          const { id } = await createFolder({ name, parentId: dialogParentFolderId });
          posthog.capture('folder_created', {
            folderId: id,
          });

          if (dialogParentFolderId) {
            expandFolderAndAncestors(dialogParentFolderId);
          }
        }

        toast.success(`Folder ${folderIdBeingEdited ? 'updated' : 'created'} successfully`);
        setIsDialogOpen(false);
        setTimeout(() => {
          setFolderIdInteractedWith('');
          setFolderIdBeingEdited('');
          setDialogParentFolderId(null);
          form.reset();
        });
      } catch (error) {
        Sentry.captureException(error);
        console.error(`Error ${folderIdBeingEdited ? 'updating' : 'creating'} folder: `, error);
        toast.error(`Error ${folderIdBeingEdited ? 'updating' : 'creating'} folder`, {
          description: getErrorMessage(error),
        });
      } finally {
        setIsSavingDialog(false);
      }

      return;
    }

    try {
      setIsSavingDialog(true);

      if (documentIdInteractedWith) {
        await updateDocument(documentIdInteractedWith, values);
        posthog.capture('document_updated', {
          documentId: documentIdInteractedWith,
        });
      } else {
        await editor.read(async () => {
          const hasTextContent = !activeDocument && !!$getRoot().getTextContent();
          const { id } = await createDocument({
            ...values,
            content: hasTextContent ? JSON.stringify(editor.getEditorState()) : null,
            folderId: dialogParentFolderId,
          });
          posthog.capture('document_created', {
            documentId: id,
          });

          if (dialogParentFolderId) {
            expandFolderAndAncestors(dialogParentFolderId);
          }

          pendingCreatedDocumentIdRef.current = id;
          router.replace(`/?document=${id}`);
        });
      }

      toast.success(`Document ${documentIdInteractedWith ? 'updated' : 'created'} successfully`);
      setIsDialogOpen(false);
      setTimeout(() => {
        setDocumentIdInteractedWith('');
        setDialogParentFolderId(null);
        form.reset();
      });
    } catch (error) {
      Sentry.captureException(error);
      console.error(`Error ${documentIdInteractedWith ? 'updating' : 'creating'} document: `, error);
      toast.error(`Error ${documentIdInteractedWith ? 'updating' : 'creating'} document`, {
        description: getErrorMessage(error),
      });
    } finally {
      setIsSavingDialog(false);
    }
  }

  function handleDialogOpenChange(isOpen: boolean) {
    if (!isOpen) {
      form.reset();
      setDocumentIdInteractedWith('');
      setFolderIdInteractedWith('');
      setFolderIdBeingEdited('');
      setDialogParentFolderId(null);
    }

    setIsDialogOpen(isOpen);
  }

  function handleMoveDialogOpenChange(isOpen: boolean) {
    if (!isOpen) {
      setMoveDialogTarget(null);
      setDocumentIdInteractedWith('');
      setFolderIdInteractedWith('');
    }
  }

  async function onMoveDialogConfirm() {
    if (!moveDialogTarget) {
      return;
    }

    const destinationId = moveDestinationId === ROOT_MOVE_DESTINATION ? null : moveDestinationId;
    const targetLabel = moveDialogTarget.kind === 'document' ? 'Document' : 'Folder';

    try {
      setIsMovingToFolder(true);

      if (moveDialogTarget.kind === 'document') {
        await updateDocument(moveDialogTarget.id, { folderId: destinationId });
        posthog.capture('document_moved_to_folder', {
          documentId: moveDialogTarget.id,
          folderId: destinationId,
        });
      } else {
        await updateFolder(moveDialogTarget.id, { parentId: destinationId });
        posthog.capture('folder_moved_to_folder', {
          folderId: moveDialogTarget.id,
          parentId: destinationId,
        });
      }

      if (destinationId) {
        expandFolderAndAncestors(destinationId);
      }

      toast.success(`${targetLabel} moved successfully`);
      handleMoveDialogOpenChange(false);
    } catch (error) {
      Sentry.captureException(error);
      console.error(`Error moving ${targetLabel.toLowerCase()}: `, error);
      toast.error(`Error moving ${targetLabel.toLowerCase()}`, {
        description: getErrorMessage(error),
      });
    } finally {
      setIsMovingToFolder(false);
    }
  }

  const handleDropdownOpenChange = React.useCallback((isOpen: boolean, documentId: string) => {
    if (isOpen) {
      setDocumentIdInteractedWith(documentId);

      return setActiveDropdownDocumentId(documentId);
    }

    setActiveDropdownDocumentId('');
    setDocumentIdInteractedWith('');
  }, []);

  const handleFolderDropdownOpenChange = React.useCallback((isOpen: boolean, folderId: string) => {
    if (isOpen) {
      setFolderIdInteractedWith(folderId);

      return setActiveDropdownFolderId(folderId);
    }

    setActiveDropdownFolderId('');
    setFolderIdInteractedWith('');
  }, []);

  const closeActiveDocument = React.useCallback(() => {
    setActiveDocument(null);
    setIsEditorEmpty(true);
    void router.replace('/');
  }, [router]);

  const initiateDocumentRemoval = React.useCallback(
    async (documentId: string) => {
      setTimeout(() => {
        setDocumentIdInteractedWith(documentId);
      });

      const confirmed = await confirm({
        cancelText: 'Cancel',
        confirmText: 'Remove',
        description: 'Are you sure you want to remove this document? This action cannot be undone.',
        title: 'Remove Document',
        variant: 'destructive',
      });

      if (!confirmed) {
        setDocumentIdInteractedWith('');

        return;
      }

      setActiveDropdownDocumentId('');
      setDocumentIdBeingRemoved(documentId);

      try {
        if (activeDocument?.id === documentId) {
          closeActiveDocument();
        }

        await removeDocument(documentId);
        posthog.capture('document_removed', { documentId });
        toast.success('Document removed successfully');

        if (documentIdInteractedWith === documentId) {
          setDocumentIdInteractedWith('');
        }
      } catch (error) {
        Sentry.captureException(error);
        console.error('Error removing document: ', error);
        toast.error('Error removing document', {
          description: getErrorMessage(error),
        });
      } finally {
        setDocumentIdBeingRemoved('');
      }
    },
    [confirm, activeDocument, closeActiveDocument, documentIdInteractedWith]
  );

  const initiateFolderRemoval = React.useCallback(
    async (folderId: string) => {
      setTimeout(() => {
        setFolderIdInteractedWith(folderId);
      });

      const confirmed = await confirm({
        cancelText: 'Cancel',
        confirmText: 'Remove',
        title: 'Remove Folder',
        variant: 'destructive',
        description:
          'Are you sure you want to remove this folder? All folders and documents inside it will also be removed. This action cannot be undone.',
      });

      if (!confirmed) {
        setFolderIdInteractedWith('');

        return;
      }

      setActiveDropdownFolderId('');
      setFolderIdBeingRemoved(folderId);

      try {
        const removedFolderIds = getFolderSubtreeIds(folders, folderId);

        if (activeDocument?.folderId && removedFolderIds.has(activeDocument.folderId)) {
          closeActiveDocument();
        }

        await removeFolder(folderId);
        posthog.capture('folder_removed', { folderId });
        toast.success('Folder removed successfully');

        if (folderIdInteractedWith === folderId) {
          setFolderIdInteractedWith('');
        }
      } catch (error) {
        Sentry.captureException(error);
        console.error('Error removing folder: ', error);
        toast.error('Error removing folder', {
          description: getErrorMessage(error),
        });
      } finally {
        setFolderIdBeingRemoved('');
      }
    },
    [confirm, activeDocument, closeActiveDocument, folderIdInteractedWith, folders]
  );

  const moveDirectoryItem = React.useCallback(
    async ({ destinationFolderId, id, kind }: MoveDirectoryItemOptions) => {
      const destination = folders.find((folder) => {
        return folder.id === destinationFolderId;
      });

      if (!destination) {
        return;
      }

      const targetLabel = kind === 'document' ? 'Document' : 'Folder';

      try {
        if (kind === 'document') {
          const document = documents.find((item) => {
            return item.id === id;
          });

          if (!document || document.folderId === destinationFolderId) {
            return;
          }

          await updateDocument(id, { folderId: destinationFolderId });
          posthog.capture('document_moved_to_folder', {
            documentId: id,
            folderId: destinationFolderId,
          });
        } else {
          const folder = folders.find((item) => {
            return item.id === id;
          });
          const excludedFolderIds = getFolderSubtreeIds(folders, id);

          if (!folder || folder.parentId === destinationFolderId || excludedFolderIds.has(destinationFolderId)) {
            return;
          }

          await updateFolder(id, { parentId: destinationFolderId });
          posthog.capture('folder_moved_to_folder', {
            folderId: id,
            parentId: destinationFolderId,
          });
        }

        expandFolderAndAncestors(destinationFolderId);
        toast.success(`${targetLabel} moved successfully`);
      } catch (error) {
        Sentry.captureException(error);
        console.error(`Error moving ${targetLabel.toLowerCase()}: `, error);
        toast.error(`Error moving ${targetLabel.toLowerCase()}`, {
          description: getErrorMessage(error),
        });
      }
    },
    [documents, expandFolderAndAncestors, folders]
  );

  const moveDialogFolderOptions = React.useMemo(() => {
    if (!moveDialogTarget) {
      return [];
    }

    const excludedFolderIds =
      moveDialogTarget.kind === 'folder' ? getFolderSubtreeIds(folders, moveDialogTarget.id) : new Set<string>();
    const options: { depth: number; id: string; name: string }[] = [];

    function visit(nodes: FolderNode[], depth: number) {
      for (const node of nodes) {
        if (excludedFolderIds.has(node.id)) {
          continue;
        }

        options.push({ depth, id: node.id, name: node.name });
        visit(node.subfolders, depth + 1);
      }
    }

    visit(buildDirectoryTree(folders, []).folders, 0);

    return options;
  }, [folders, moveDialogTarget]);

  const moveTargetDetails = React.useMemo(() => {
    if (!moveDialogTarget) {
      return null;
    }

    if (moveDialogTarget.kind === 'document') {
      const document = documents.find((doc) => {
        return doc.id === moveDialogTarget.id;
      });

      return {
        currentParentId: document?.folderId ?? null,
        name: document?.title || 'Untitled',
      };
    }

    const folder = folders.find((item) => {
      return item.id === moveDialogTarget.id;
    });

    return {
      currentParentId: folder?.parentId ?? null,
      name: folder?.name || 'Untitled',
    };
  }, [moveDialogTarget, documents, folders]);

  const isFolderDialog = dialogEntity === 'folder';
  const isEditingInDialog = isFolderDialog ? !!folderIdBeingEdited : !!documentIdInteractedWith;
  const hasUnchangedMoveDestination =
    moveDestinationId === (moveTargetDetails?.currentParentId ?? ROOT_MOVE_DESTINATION);

  const value = React.useMemo(() => {
    return {
      activeDocument,
      activeDropdownDocumentId,
      activeDropdownFolderId,
      closeActiveDocument,
      documentIdBeingRemoved,
      documentIdInteractedWith,
      expandedFolderIds,
      expandFolderAndAncestors,
      folderIdBeingRemoved,
      folderIdInteractedWith,
      folders,
      handleDropdownOpenChange,
      handleEditorChange,
      handleFolderDropdownOpenChange,
      hasUnsavedEditorChanges,
      initiateDocumentRemoval,
      initiateFolderRemoval,
      isEditorEmpty,
      moveDirectoryItem,
      openDocumentDialog,
      openFolderDialog,
      openMoveDialog,
      setDocumentIdInteractedWith,
      setFolderIdInteractedWith,
      toggleFolderExpansion,
    };
  }, [
    closeActiveDocument,
    documentIdInteractedWith,
    expandFolderAndAncestors,
    expandedFolderIds,
    folderIdInteractedWith,
    folders,
    openDocumentDialog,
    openFolderDialog,
    openMoveDialog,
    moveDirectoryItem,
    handleDropdownOpenChange,
    handleFolderDropdownOpenChange,
    activeDropdownDocumentId,
    activeDropdownFolderId,
    documentIdBeingRemoved,
    folderIdBeingRemoved,
    initiateDocumentRemoval,
    initiateFolderRemoval,
    activeDocument,
    handleEditorChange,
    isEditorEmpty,
    hasUnsavedEditorChanges,
    toggleFolderExpansion,
  ]);

  return (
    <DocumentContext.Provider value={value}>
      {children}

      {/*
        The dialog contents are unmounted as soon as the dialogs close: the exit
        animation would otherwise restart when the post-action revalidation
        re-renders the tree mid-animation, making the dialog flash back in.
      */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
        {isDialogOpen && (
          <DialogContent className="sm:max-w-[425px]">
            <Form {...form}>
              <form className="space-y-4" onSubmit={form.handleSubmit(onDialogFormSubmit)}>
                <DialogHeader>
                  <DialogTitle>
                    {isFolderDialog
                      ? isEditingInDialog
                        ? 'Edit Folder Details'
                        : 'Create a New Folder'
                      : isEditingInDialog
                        ? 'Edit Document Details'
                        : 'Start a New Document'}
                  </DialogTitle>
                </DialogHeader>
                <FormField
                  name="title"
                  control={form.control}
                  render={({ field }) => {
                    return (
                      <FormItem>
                        <FormLabel>{isFolderDialog ? 'Name' : 'Title'}</FormLabel>
                        <FormControl>
                          <Input placeholder={isFolderDialog ? 'New Folder' : 'Untitled'} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                {!isFolderDialog && (
                  <FormField
                    name="description"
                    control={form.control}
                    render={({ field }) => {
                      return (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                )}
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button type="submit" disabled={isSavingDialog}>
                    {isSavingDialog && <LoaderCircleIcon className="mr-2 animate-spin" />}
                    {isEditingInDialog ? 'Save Changes' : isFolderDialog ? 'Create Folder' : 'Create Document'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={!!moveDialogTarget} onOpenChange={handleMoveDialogOpenChange}>
        {!!moveDialogTarget && (
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Move to Folder</DialogTitle>
              <DialogDescription>Choose a new location for &ldquo;{moveTargetDetails?.name}&rdquo;.</DialogDescription>
            </DialogHeader>
            <Select value={moveDestinationId} onValueChange={setMoveDestinationId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a folder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ROOT_MOVE_DESTINATION}>
                  <FolderTreeIcon />
                  Top level
                </SelectItem>
                {moveDialogFolderOptions.map((option) => {
                  return (
                    <SelectItem
                      key={option.id}
                      value={option.id}
                      style={{ paddingInlineStart: `${0.5 + option.depth}rem` }}
                    >
                      <FolderIcon />
                      {option.name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                disabled={isMovingToFolder || hasUnchangedMoveDestination}
                onClick={() => {
                  void onMoveDialogConfirm();
                }}
              >
                {isMovingToFolder && <LoaderCircleIcon className="mr-2 animate-spin" />}
                Move
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </DocumentContext.Provider>
  );
}
