export type DownloadingItem = {
  id: string
  name: string
  done: boolean
  error: boolean
  message?: string
}

export function updateDownloadingItem(
  items: DownloadingItem[],
  itemId: string,
  patch: Partial<DownloadingItem>
) {
  return items.map((item) =>
    item.id === itemId ? { ...item, ...patch } : item
  )
}
