import type { FolderItem } from '@/lib/models/folder.model';

export default function getFolderSubtreeIds(folders: FolderItem[], rootFolderId: string) {
  const childIdsByParentId = new Map<string, string[]>();

  for (const folder of folders) {
    if (!folder.parentId) {
      continue;
    }

    const siblingIds = childIdsByParentId.get(folder.parentId);

    if (siblingIds) {
      siblingIds.push(folder.id);
    } else {
      childIdsByParentId.set(folder.parentId, [folder.id]);
    }
  }

  const subtreeIds = new Set([rootFolderId]);
  const queue = [rootFolderId];

  while (queue.length > 0) {
    const currentId = queue.pop();

    if (!currentId) {
      break;
    }

    for (const childId of childIdsByParentId.get(currentId) ?? []) {
      if (!subtreeIds.has(childId)) {
        subtreeIds.add(childId);
        queue.push(childId);
      }
    }
  }

  return subtreeIds;
}
