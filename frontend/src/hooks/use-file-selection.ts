import { useCallback, useState } from "react"

function toggleSetValue(currentSelection: Set<string>, id: string) {
  const nextSelection = new Set(currentSelection)

  if (nextSelection.has(id)) {
    nextSelection.delete(id)
  } else {
    nextSelection.add(id)
  }

  return nextSelection
}

export function useFileSelection() {
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set())
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(
    new Set()
  )

  const toggleFileSelection = useCallback((fileId: string) => {
    setSelectedFileIds((currentSelection) =>
      toggleSetValue(currentSelection, fileId)
    )
  }, [])

  const toggleFolderSelection = useCallback((folderId: string) => {
    setSelectedFolderIds((currentSelection) =>
      toggleSetValue(currentSelection, folderId)
    )
  }, [])

  const toggleFolderFileSelection = useCallback(
    (fileIds: string[], folderIds: string[] = []) => {
      setSelectedFileIds((currentSelection) => {
        const allSelected = fileIds.every((id) => currentSelection.has(id))
        const nextSelection = new Set(currentSelection)

        if (allSelected) {
          fileIds.forEach((id) => nextSelection.delete(id))
        } else {
          fileIds.forEach((id) => nextSelection.add(id))
        }

        return nextSelection
      })

      if (folderIds.length === 0) return

      setSelectedFolderIds((currentSelection) => {
        const nextSelection = new Set(currentSelection)
        folderIds.forEach((id) => nextSelection.add(id))
        return nextSelection
      })
    },
    []
  )

  const clearSelection = useCallback(() => {
    setSelectedFileIds(new Set())
    setSelectedFolderIds(new Set())
  }, [])

  return {
    selectedFileIds,
    selectedFolderIds,
    setSelectedFileIds,
    setSelectedFolderIds,
    toggleFileSelection,
    toggleFolderSelection,
    toggleFolderFileSelection,
    clearSelection,
  }
}
