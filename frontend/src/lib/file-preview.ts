import type { Dispatch, SetStateAction } from "react"

import type { FileResponse } from "@/lib/api"
import { isPreviewSupportedFile } from "@/lib/file-display"

type PreviewUrlState = Record<string, string>

export function readBlobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export function readFileAsDataUrl(file: File) {
  return readBlobAsDataUrl(file)
}

export async function loadPreviewUrls(
  filesToPreview: FileResponse[],
  fetchPreview: (file: FileResponse) => Promise<string>,
  setPreviewUrls: Dispatch<SetStateAction<PreviewUrlState>>,
  isCurrent: () => boolean = () => true
) {
  const previewFiles = filesToPreview.filter((file) =>
    isPreviewSupportedFile(file.content_type)
  )

  await Promise.all(
    previewFiles.map((file) =>
      fetchPreview(file)
        .then((dataUrl) => {
          if (!isCurrent()) return

          setPreviewUrls((currentUrls) => ({
            ...currentUrls,
            [file.id]: dataUrl,
          }))
        })
        .catch(() => {})
    )
  )
}
