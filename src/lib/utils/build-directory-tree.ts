import type { DocumentItem } from '@/lib/models/document.model';
import type { FolderItem } from '@/lib/models/folder.model';

export type FolderNode = FolderItem & {
  documents: DocumentItem[];
  subfolders: FolderNode[];
};

export type DirectoryTree = {
  documents: DocumentItem[];
  folders: FolderNode[];
};

export default function buildDirectoryTree(folders: FolderItem[], documents: DocumentItem[]): DirectoryTree {
  const nodesById = new Map<string, FolderNode>(
    folders.map((folder) => {
      return [folder.id, { ...folder, documents: [], subfolders: [] }];
    })
  );

  const rootFolders: FolderNode[] = [];

  for (const node of nodesById.values()) {
    const parent = node.parentId ? nodesById.get(node.parentId) : undefined;

    if (parent) {
      parent.subfolders.push(node);
    } else {
      rootFolders.push(node);
    }
  }

  const rootDocuments: DocumentItem[] = [];

  for (const document of documents) {
    const parent = document.folderId ? nodesById.get(document.folderId) : undefined;

    if (parent) {
      parent.documents.push(document);
    } else {
      rootDocuments.push(document);
    }
  }

  return { documents: rootDocuments, folders: rootFolders };
}
