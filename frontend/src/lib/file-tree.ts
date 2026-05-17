import type { FileResponse, FolderResponse } from "@/lib/api"

export function collectFolderFiles(folders: FolderResponse[]): FileResponse[] {
  const files: FileResponse[] = []

  for (const folder of folders) {
    files.push(...(folder.files ?? []))

    if (folder.children) {
      files.push(...collectFolderFiles(folder.children))
    }
  }

  return files
}

export function collectFolderFileIds(folder: FolderResponse): string[] {
  const ids = folder.files?.map((file) => file.id) || []

  if (folder.children) {
    for (const child of folder.children) {
      ids.push(...collectFolderFileIds(child))
    }
  }

  return ids
}

export function collectFolderIds(folders: FolderResponse[]): string[] {
  return folders.flatMap((folder): string[] => [
    folder.id,
    ...collectFolderIds(folder.children ?? []),
  ])
}

export function countFolderFiles(folder: FolderResponse): number {
  let count = folder.files?.length || 0

  if (folder.children) {
    for (const child of folder.children) {
      count += countFolderFiles(child)
    }
  }

  return count
}

export function isFolderAllDeleted(folder: FolderResponse): boolean {
  const files = [...(folder.files || [])]

  if (folder.children) {
    files.push(...collectFolderFiles(folder.children))
  }

  return files.length > 0 && files.every((file) => file.deleted_at !== null)
}

export function flattenFolderFileIds(folders: FolderResponse[]): string[] {
  return collectFolderFiles(folders).map((file) => file.id)
}

export function removeFileFromFolders(
  folders: FolderResponse[],
  fileId: string
): FolderResponse[] {
  return folders
    .map((folder) => ({
      ...folder,
      files: folder.files.filter((file) => file.id !== fileId),
      children: folder.children
        ? removeFileFromFolders(folder.children, fileId)
        : undefined,
    }))
    .filter(
      (folder) =>
        folder.files.length > 0 ||
        (folder.children && folder.children.length > 0)
    )
}

export function updateFileInFolders(
  folders: FolderResponse[],
  fileId: string,
  updatedFile: FileResponse
): FolderResponse[] {
  return folders.map((folder) => ({
    ...folder,
    files: folder.files.map((file) =>
      file.id === fileId ? updatedFile : file
    ),
    children: folder.children
      ? updateFileInFolders(folder.children, fileId, updatedFile)
      : undefined,
  }))
}

export function findFileInFolders(
  folders: FolderResponse[],
  fileId: string
): FileResponse | undefined {
  for (const folder of folders) {
    const found = folder.files.find((file) => file.id === fileId)
    if (found) return found

    if (folder.children) {
      const childFound = findFileInFolders(folder.children, fileId)
      if (childFound) return childFound
    }
  }

  return undefined
}

export function addFileToFolder(
  folders: FolderResponse[],
  folderId: string,
  file: FileResponse
): FolderResponse[] {
  return folders.map((folder) => {
    if (folder.id === folderId) {
      return { ...folder, files: [...folder.files, file] }
    }

    if (folder.children) {
      return {
        ...folder,
        children: addFileToFolder(folder.children, folderId, file),
      }
    }

    return folder
  })
}

export function findFolderInTree(
  folders: FolderResponse[],
  folderId: string
): FolderResponse | undefined {
  for (const folder of folders) {
    if (folder.id === folderId) return folder

    if (folder.children) {
      const found = findFolderInTree(folder.children, folderId)
      if (found) return found
    }
  }

  return undefined
}

export function collectDescendantIds(
  folders: FolderResponse[],
  folderId: string
): { fileIds: string[]; folderIds: string[] } {
  const folder = findFolderInTree(folders, folderId)
  if (!folder) return { fileIds: [], folderIds: [] }

  const result: { fileIds: string[]; folderIds: string[] } = {
    fileIds: [...folder.files.map((file) => file.id)],
    folderIds: [],
  }

  if (folder.children) {
    for (const child of folder.children) {
      result.folderIds.push(child.id)
      const childResult = collectDescendantIds(folders, child.id)
      result.fileIds.push(...childResult.fileIds)
      result.folderIds.push(...childResult.folderIds)
    }
  }

  return result
}

export function isDescendantOf(
  folders: FolderResponse[],
  folderId: string,
  ancestorId: string
): boolean {
  const ancestor = findFolderInTree(folders, ancestorId)
  if (!ancestor || !ancestor.children) return false

  return ancestor.children.some(
    (child) =>
      child.id === folderId || isDescendantOf(folders, folderId, child.id)
  )
}

export function buildParentMap(
  folders: FolderResponse[],
  parentId = ""
): Map<string, string> {
  const map = new Map<string, string>()

  for (const folder of folders) {
    map.set(folder.id, parentId)

    if (folder.children) {
      const childMap = buildParentMap(folder.children, folder.id)
      childMap.forEach((value, key) => map.set(key, value))
    }
  }

  return map
}

export function removeFolderFromTree(
  folders: FolderResponse[],
  folderId: string
): FolderResponse[] {
  return folders
    .filter((folder) => folder.id !== folderId)
    .map((folder) => ({
      ...folder,
      children: folder.children
        ? removeFolderFromTree(folder.children, folderId)
        : undefined,
    }))
    .filter(
      (folder) =>
        folder.files.length > 0 ||
        (folder.children && folder.children.length > 0)
    )
}

export function addFolderToParent(
  folders: FolderResponse[],
  parentId: string,
  childFolder: FolderResponse
): FolderResponse[] {
  return folders.map((folder) => {
    if (folder.id === parentId) {
      return { ...folder, children: [...(folder.children || []), childFolder] }
    }

    if (folder.children) {
      return {
        ...folder,
        children: addFolderToParent(folder.children, parentId, childFolder),
      }
    }

    return folder
  })
}
