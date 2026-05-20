import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useFileSelection } from "@/hooks/use-file-selection"

describe("useFileSelection", () => {
  it("starts with empty selection", () => {
    const { result } = renderHook(() => useFileSelection())
    expect(result.current.selectedFileIds.size).toBe(0)
    expect(result.current.selectedFolderIds.size).toBe(0)
  })

  it("toggleFileSelection adds a file id", () => {
    const { result } = renderHook(() => useFileSelection())
    act(() => {
      result.current.toggleFileSelection("file-1")
    })
    expect(result.current.selectedFileIds.has("file-1")).toBe(true)
  })

  it("toggleFileSelection removes a file id when toggled again", () => {
    const { result } = renderHook(() => useFileSelection())
    act(() => {
      result.current.toggleFileSelection("file-1")
    })
    act(() => {
      result.current.toggleFileSelection("file-1")
    })
    expect(result.current.selectedFileIds.has("file-1")).toBe(false)
  })

  it("toggleFolderSelection adds and removes folder ids", () => {
    const { result } = renderHook(() => useFileSelection())
    act(() => {
      result.current.toggleFolderSelection("folder-1")
      result.current.toggleFolderSelection("folder-2")
    })
    expect(result.current.selectedFolderIds.size).toBe(2)

    act(() => {
      result.current.toggleFolderSelection("folder-1")
    })
    expect(result.current.selectedFolderIds.has("folder-1")).toBe(false)
    expect(result.current.selectedFolderIds.has("folder-2")).toBe(true)
  })

  it("toggleFolderFileSelection selects all file ids when none selected", () => {
    const { result } = renderHook(() => useFileSelection())
    act(() => {
      result.current.toggleFolderFileSelection(["file-1", "file-2"])
    })
    expect(result.current.selectedFileIds.has("file-1")).toBe(true)
    expect(result.current.selectedFileIds.has("file-2")).toBe(true)
  })

  it("toggleFolderFileSelection deselects all when all are already selected", () => {
    const { result } = renderHook(() => useFileSelection())
    act(() => {
      result.current.toggleFolderFileSelection(["file-1", "file-2"])
    })
    act(() => {
      result.current.toggleFolderFileSelection(["file-1", "file-2"])
    })
    expect(result.current.selectedFileIds.size).toBe(0)
  })

  it("toggleFolderFileSelection adds folder ids", () => {
    const { result } = renderHook(() => useFileSelection())
    act(() => {
      result.current.toggleFolderFileSelection(["file-1"], ["folder-1"])
    })
    expect(result.current.selectedFolderIds.has("folder-1")).toBe(true)
  })

  it("toggleFolderFileSelection does not add folder ids when empty", () => {
    const { result } = renderHook(() => useFileSelection())
    act(() => {
      result.current.toggleFolderFileSelection(["file-1"], [])
    })
    expect(result.current.selectedFolderIds.size).toBe(0)
  })

  it("clearSelection empties all selections", () => {
    const { result } = renderHook(() => useFileSelection())
    act(() => {
      result.current.toggleFileSelection("file-1")
      result.current.toggleFolderSelection("folder-1")
    })
    act(() => {
      result.current.clearSelection()
    })
    expect(result.current.selectedFileIds.size).toBe(0)
    expect(result.current.selectedFolderIds.size).toBe(0)
  })

  it("setSelectedFileIds replaces the file selection", () => {
    const { result } = renderHook(() => useFileSelection())
    act(() => {
      result.current.setSelectedFileIds(new Set(["a", "b"]))
    })
    expect(result.current.selectedFileIds.has("a")).toBe(true)
    expect(result.current.selectedFileIds.has("b")).toBe(true)
    expect(result.current.selectedFileIds.size).toBe(2)
  })

  it("setSelectedFolderIds replaces the folder selection", () => {
    const { result } = renderHook(() => useFileSelection())
    act(() => {
      result.current.setSelectedFolderIds(new Set(["x", "y"]))
    })
    expect(result.current.selectedFolderIds.has("x")).toBe(true)
    expect(result.current.selectedFolderIds.has("y")).toBe(true)
  })
})
