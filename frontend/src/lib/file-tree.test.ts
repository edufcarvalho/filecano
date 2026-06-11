import { describe, it, expect } from "vitest"
import {
  collectFolderFiles,
  collectFolderFileIds,
  collectFolderIds,
  collectEmptyFolderIds,
  countFolderFiles,
  isFolderAllDeleted,
  flattenFolderFileIds,
  collectSelectedFiles,
  removeFileFromFolders,
  updateFileInFolders,
  findFileInFolders,
  addFileToFolder,
  findFolderInTree,
  collectDescendantIds,
  excludeSelectedFolderContents,
  isDescendantOf,
  buildParentMap,
  removeFolderFromTree,
  addFolderToParent,
} from "@/lib/file-tree"
import type { FileResponse, FolderResponse } from "@/lib/api"

function makeFile(overrides: Partial<FileResponse> = {}): FileResponse {
  return {
    id: "file-1",
    user_id: "user-1",
    original_name: "test.txt",
    display_name: "test.txt",
    content_type: "text/plain",
    size_bytes: 1024,
    checksum: null,
    folder_id: null,
    created_at: "2025-01-01T00:00:00Z",
    deleted_at: null,
    ...overrides,
  }
}

function makeFolder(
  id: string,
  overrides: Partial<FolderResponse> = {}
): FolderResponse {
  return {
    id,
    name: `folder-${id}`,
    files: [],
    children: null,
    parent_id: null,
    ...overrides,
  }
}

describe("collectFolderFiles", () => {
  it("collects files from flat folders", () => {
    const folders: FolderResponse[] = [
      makeFolder("f1", { files: [makeFile({ id: "a" })] }),
      makeFolder("f2", { files: [makeFile({ id: "b" })] }),
    ]
    const result = collectFolderFiles(folders)
    expect(result).toHaveLength(2)
    expect(result.map((f) => f.id)).toEqual(["a", "b"])
  })

  it("collects files from nested folders", () => {
    const folders: FolderResponse[] = [
      makeFolder("root", {
        files: [makeFile({ id: "a" })],
        children: [
          makeFolder("child", {
            files: [makeFile({ id: "b" })],
            children: [
              makeFolder("grandchild", { files: [makeFile({ id: "c" })] }),
            ],
          }),
        ],
      }),
    ]
    const result = collectFolderFiles(folders)
    expect(result.map((f) => f.id)).toEqual(["a", "b", "c"])
  })

  it("handles folders with undefined files", () => {
    const folder = makeFolder("f1")
    delete (folder as Record<string, unknown>).files
    const result = collectFolderFiles([folder as FolderResponse])
    expect(result).toEqual([])
  })

  it("handles folders with undefined files in children", () => {
    const child = makeFolder("child")
    delete (child as Record<string, unknown>).files
    const root = makeFolder("root", {
      files: [makeFile({ id: "a" })],
      children: [child as FolderResponse],
    })
    const result = collectFolderFiles([root])
    expect(result.map((f) => f.id)).toEqual(["a"])
  })

  it("returns empty array for empty folders", () => {
    expect(collectFolderFiles([])).toEqual([])
  })
})

describe("collectFolderFileIds", () => {
  it("collects file ids recursively", () => {
    const folder = makeFolder("root", {
      files: [makeFile({ id: "a" })],
      children: [makeFolder("child", { files: [makeFile({ id: "b" })] })],
    })
    expect(collectFolderFileIds(folder)).toEqual(["a", "b"])
  })

  it("returns empty array when no files", () => {
    expect(collectFolderFileIds(makeFolder("empty"))).toEqual([])
  })

  it("returns empty array when files is undefined", () => {
    const folder = makeFolder("f1")
    delete (folder as Record<string, unknown>).files
    expect(collectFolderFileIds(folder as FolderResponse)).toEqual([])
  })
})

describe("collectFolderIds", () => {
  it("collects all folder ids", () => {
    const folders: FolderResponse[] = [
      makeFolder("root", {
        children: [makeFolder("child"), makeFolder("child2")],
      }),
    ]
    expect(collectFolderIds(folders)).toEqual(["root", "child", "child2"])
  })

  it("returns empty array for empty input", () => {
    expect(collectFolderIds([])).toEqual([])
  })
})

describe("collectEmptyFolderIds", () => {
  it("returns ids of empty folders only", () => {
    const folders: FolderResponse[] = [
      makeFolder("root", {
        files: [makeFile({ id: "a" })],
        children: [makeFolder("empty-child")],
      }),
    ]
    expect(collectEmptyFolderIds(folders)).toEqual(["empty-child"])
  })

  it("returns nested empty folders only", () => {
    const folders: FolderResponse[] = [
      makeFolder("root", {
        files: [],
        children: [makeFolder("empty", { files: [] })],
      }),
    ]
    const result = collectEmptyFolderIds(folders)
    expect(result.sort()).toEqual(["empty", "root"])
  })
})

describe("countFolderFiles", () => {
  it("counts files in a folder including children", () => {
    const folder = makeFolder("root", {
      files: [makeFile({ id: "a" }), makeFile({ id: "b" })],
      children: [makeFolder("child", { files: [makeFile({ id: "c" })] })],
    })
    expect(countFolderFiles(folder)).toBe(3)
  })

  it("returns 0 for empty folder", () => {
    expect(countFolderFiles(makeFolder("empty"))).toBe(0)
  })
})

describe("isFolderAllDeleted", () => {
  it("returns true when all files are deleted", () => {
    const folder = makeFolder("root", {
      files: [
        makeFile({ id: "a", deleted_at: "2025-01-01" }),
        makeFile({ id: "b", deleted_at: "2025-01-02" }),
      ],
    })
    expect(isFolderAllDeleted(folder)).toBe(true)
  })

  it("returns false when some files are not deleted", () => {
    const folder = makeFolder("root", {
      files: [
        makeFile({ id: "a", deleted_at: null }),
        makeFile({ id: "b", deleted_at: "2025-01-01" }),
      ],
    })
    expect(isFolderAllDeleted(folder)).toBe(false)
  })

  it("returns true when all files including nested children are deleted", () => {
    const folder = makeFolder("root", {
      files: [makeFile({ id: "a", deleted_at: "2025-01-01" })],
      children: [
        makeFolder("child", {
          files: [makeFile({ id: "b", deleted_at: "2025-01-02" })],
        }),
      ],
    })
    expect(isFolderAllDeleted(folder)).toBe(true)
  })

  it("returns false for empty folder", () => {
    expect(isFolderAllDeleted(makeFolder("empty"))).toBe(false)
  })

  it("returns false when files is undefined", () => {
    const folder = makeFolder("f1")
    delete (folder as Record<string, unknown>).files
    expect(isFolderAllDeleted(folder as FolderResponse)).toBe(false)
  })
})

describe("flattenFolderFileIds", () => {
  it("returns all file ids from folders", () => {
    const folders: FolderResponse[] = [
      makeFolder("f1", { files: [makeFile({ id: "a" })] }),
      makeFolder("f2", {
        files: [makeFile({ id: "b" })],
        children: [makeFolder("f3", { files: [makeFile({ id: "c" })] })],
      }),
    ]
    expect(flattenFolderFileIds(folders).sort()).toEqual(["a", "b", "c"])
  })
})

describe("collectSelectedFiles", () => {
  it("maps selected ids to FileReferences", () => {
    const files: FileResponse[] = [makeFile({ id: "a", folder_id: "f1" })]
    const result = collectSelectedFiles(files, [], ["a"])
    expect(result).toEqual([{ file_id: "a", folder_id: "f1" }])
  })

  it("returns null folder_id for unknown files", () => {
    const result = collectSelectedFiles([], [], ["unknown"])
    expect(result).toEqual([{ file_id: "unknown", folder_id: undefined }])
  })
})

describe("removeFileFromFolders", () => {
  it("removes a file from the specified folder", () => {
    const folders: FolderResponse[] = [
      makeFolder("f1", {
        files: [makeFile({ id: "a" }), makeFile({ id: "b" })],
      }),
    ]
    const result = removeFileFromFolders(folders, "a")
    expect(result[0].files.map((f) => f.id)).toEqual(["b"])
  })

  it("removes file from nested folder", () => {
    const folders: FolderResponse[] = [
      makeFolder("root", {
        files: [makeFile({ id: "a" })],
        children: [makeFolder("child", { files: [makeFile({ id: "b" })] })],
      }),
    ]
    const result = removeFileFromFolders(folders, "b")
    expect(result[0].children![0].files).toHaveLength(0)
  })
})

describe("updateFileInFolders", () => {
  it("updates a file by id", () => {
    const folders: FolderResponse[] = [
      makeFolder("f1", { files: [makeFile({ id: "a", display_name: "old" })] }),
    ]
    const updated = makeFile({ id: "a", display_name: "new" })
    const result = updateFileInFolders(folders, "a", updated)
    expect(result[0].files[0].display_name).toBe("new")
  })

  it("does not change unrelated files", () => {
    const folders: FolderResponse[] = [
      makeFolder("f1", {
        files: [makeFile({ id: "a" }), makeFile({ id: "b" })],
      }),
    ]
    const updated = makeFile({ id: "a", display_name: "new" })
    const result = updateFileInFolders(folders, "a", updated)
    expect(result[0].files[1].display_name).toBe("test.txt")
  })

  it("handles folders with undefined children", () => {
    const folders: FolderResponse[] = [
      makeFolder("f1", { children: undefined }),
    ]
    const result = updateFileInFolders(folders, "x", makeFile({ id: "x" }))
    expect(result[0].children).toBeUndefined()
  })

  it("updates a file in nested folder", () => {
    const folders: FolderResponse[] = [
      makeFolder("root", {
        children: [
          makeFolder("child", {
            files: [makeFile({ id: "deep", display_name: "old" })],
          }),
        ],
      }),
    ]
    const updated = makeFile({ id: "deep", display_name: "new" })
    const result = updateFileInFolders(folders, "deep", updated)
    expect(result[0].children![0].files[0].display_name).toBe("new")
  })
})

describe("findFileInFolders", () => {
  it("finds a file in root folders", () => {
    const file = makeFile({ id: "a" })
    const folders: FolderResponse[] = [makeFolder("f1", { files: [file] })]
    expect(findFileInFolders(folders, "a")).toBe(file)
  })

  it("finds a file in nested folders", () => {
    const file = makeFile({ id: "deep" })
    const folders: FolderResponse[] = [
      makeFolder("root", {
        children: [makeFolder("child", { files: [file] })],
      }),
    ]
    expect(findFileInFolders(folders, "deep")).toBe(file)
  })

  it("returns undefined for missing file", () => {
    expect(findFileInFolders([], "missing")).toBeUndefined()
  })

  it("returns undefined when file not found in children", () => {
    const folders: FolderResponse[] = [
      makeFolder("root", {
        files: [makeFile({ id: "a" })],
        children: [makeFolder("child", { files: [makeFile({ id: "b" })] })],
      }),
    ]
    expect(findFileInFolders(folders, "c")).toBeUndefined()
  })

  it("returns undefined when folder has no children and file not found", () => {
    const folders: FolderResponse[] = [makeFolder("f1", { files: [] })]
    expect(findFileInFolders(folders, "x")).toBeUndefined()
  })
})

describe("addFileToFolder", () => {
  it("adds a file to the specified folder", () => {
    const file = makeFile({ id: "new" })
    const folders: FolderResponse[] = [makeFolder("f1")]
    const result = addFileToFolder(folders, "f1", file)
    expect(result[0].files).toHaveLength(1)
    expect(result[0].files[0].id).toBe("new")
  })

  it("adds to nested folder", () => {
    const file = makeFile({ id: "new" })
    const folders: FolderResponse[] = [
      makeFolder("root", { children: [makeFolder("child")] }),
    ]
    const result = addFileToFolder(folders, "child", file)
    expect(result[0].children![0].files).toHaveLength(1)
  })

  it("returns folders unchanged when target not found and no children", () => {
    const file = makeFile({ id: "new" })
    const folders: FolderResponse[] = [makeFolder("a"), makeFolder("b")]
    const result = addFileToFolder(folders, "c", file)
    expect(result).toEqual(folders)
  })
})

describe("findFolderInTree", () => {
  it("finds a folder at root level", () => {
    const folder = makeFolder("target")
    expect(findFolderInTree([folder], "target")).toBe(folder)
  })

  it("finds a nested folder", () => {
    const child = makeFolder("child")
    const root = makeFolder("root", { children: [child] })
    expect(findFolderInTree([root], "child")).toBe(child)
  })

  it("returns undefined for missing folder", () => {
    expect(findFolderInTree([], "missing")).toBeUndefined()
  })

  it("returns undefined when folder not found in children", () => {
    const folders: FolderResponse[] = [
      makeFolder("root", {
        children: [makeFolder("child")],
      }),
    ]
    expect(findFolderInTree(folders, "ghost")).toBeUndefined()
  })

  it("returns undefined when folder has no children and not matched", () => {
    const folders: FolderResponse[] = [makeFolder("a")]
    expect(findFolderInTree(folders, "b")).toBeUndefined()
  })
})

describe("collectDescendantIds", () => {
  it("collects file and folder ids from descendants", () => {
    const folders: FolderResponse[] = [
      makeFolder("root", {
        files: [makeFile({ id: "f1" })],
        children: [
          makeFolder("child", {
            files: [makeFile({ id: "f2" })],
            children: [
              makeFolder("grandchild", { files: [makeFile({ id: "f3" })] }),
            ],
          }),
        ],
      }),
    ]
    const result = collectDescendantIds(folders, "root")
    expect(result.fileIds.sort()).toEqual(["f1", "f2", "f3"])
    expect(result.folderIds.sort()).toEqual(["child", "grandchild"])
  })

  it("returns empty arrays for missing folder", () => {
    expect(collectDescendantIds([], "missing")).toEqual({
      fileIds: [],
      folderIds: [],
    })
  })
})

describe("excludeSelectedFolderContents", () => {
  it("excludes files inside selected folders", () => {
    const folders: FolderResponse[] = [
      makeFolder("root", {
        files: [makeFile({ id: "inner-file", folder_id: "root" })],
      }),
    ]
    const selectedFiles = [
      { file_id: "inner-file", folder_id: "root" },
      { file_id: "outer-file", folder_id: null },
    ]
    const result = excludeSelectedFolderContents(folders, selectedFiles, [
      "root",
    ])
    expect(result.files.map((f) => f.file_id)).toEqual(["outer-file"])
    expect(result.folderIds).toEqual(["root"])
  })

  it("excludes child folders of selected parent folders", () => {
    const folders: FolderResponse[] = [
      makeFolder("parent", { children: [makeFolder("child")] }),
    ]
    const result = excludeSelectedFolderContents(
      folders,
      [],
      ["parent", "child"]
    )
    expect(result.folderIds).toEqual(["parent"])
  })
})

describe("isDescendantOf", () => {
  it("returns true for direct child", () => {
    const folders: FolderResponse[] = [
      makeFolder("parent", { children: [makeFolder("child")] }),
    ]
    expect(isDescendantOf(folders, "child", "parent")).toBe(true)
  })

  it("returns true for grandchild", () => {
    const folders: FolderResponse[] = [
      makeFolder("parent", {
        children: [
          makeFolder("child", { children: [makeFolder("grandchild")] }),
        ],
      }),
    ]
    expect(isDescendantOf(folders, "grandchild", "parent")).toBe(true)
  })

  it("returns false when not a descendant", () => {
    const folders: FolderResponse[] = [
      makeFolder("a"),
      makeFolder("b", { children: [makeFolder("c")] }),
    ]
    expect(isDescendantOf(folders, "c", "a")).toBe(false)
  })

  it("returns false when ancestor has children but folder is not among them", () => {
    const folders: FolderResponse[] = [
      makeFolder("parent", {
        children: [makeFolder("child1"), makeFolder("child2")],
      }),
      makeFolder("sibling"),
    ]
    expect(isDescendantOf(folders, "sibling", "parent")).toBe(false)
  })

  it("returns false when ancestor not found", () => {
    expect(isDescendantOf([], "anything", "missing")).toBe(false)
  })
})

describe("buildParentMap", () => {
  it("maps each folder to its parent", () => {
    const folders: FolderResponse[] = [
      makeFolder("root", {
        children: [
          makeFolder("child", { children: [makeFolder("grandchild")] }),
        ],
      }),
    ]
    const map = buildParentMap(folders)
    expect(map.get("root")).toBe("")
    expect(map.get("child")).toBe("root")
    expect(map.get("grandchild")).toBe("child")
  })
})

describe("removeFolderFromTree", () => {
  it("removes a root folder", () => {
    const folders: FolderResponse[] = [makeFolder("a"), makeFolder("b")]
    const result = removeFolderFromTree(folders, "a")
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("b")
  })

  it("removes a nested folder", () => {
    const folders: FolderResponse[] = [
      makeFolder("root", {
        children: [makeFolder("a"), makeFolder("b")],
      }),
    ]
    const result = removeFolderFromTree(folders, "a")
    expect(result[0].children).toHaveLength(1)
    expect(result[0].children![0].id).toBe("b")
  })
})

describe("addFolderToParent", () => {
  it("adds a child folder to a parent", () => {
    const folders: FolderResponse[] = [makeFolder("root")]
    const child = makeFolder("new-child")
    const result = addFolderToParent(folders, "root", child)
    expect(result[0].children).toHaveLength(1)
    expect(result[0].children![0].id).toBe("new-child")
  })

  it("adds to nested parent", () => {
    const folders: FolderResponse[] = [
      makeFolder("root", { children: [makeFolder("target")] }),
    ]
    const child = makeFolder("new-child")
    const result = addFolderToParent(folders, "target", child)
    expect(result[0].children![0].children).toHaveLength(1)
  })

  it("preserves existing children", () => {
    const existing = makeFolder("existing")
    const folders: FolderResponse[] = [
      makeFolder("root", { children: [existing] }),
    ]
    const child = makeFolder("new-child")
    const result = addFolderToParent(folders, "root", child)
    expect(result[0].children).toHaveLength(2)
  })

  it("returns folders unchanged when parent not found and no children", () => {
    const folders: FolderResponse[] = [makeFolder("a"), makeFolder("b")]
    const child = makeFolder("new-child")
    const result = addFolderToParent(folders, "c", child)
    expect(result).toEqual(folders)
  })
})
