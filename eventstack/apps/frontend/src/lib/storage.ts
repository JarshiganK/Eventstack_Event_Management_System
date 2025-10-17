const KEY = 'local_bookmarks'

export type Bookmark = { id: string }

export function getLocalBookmarks(): Bookmark[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function addLocalBookmark(id: string) {
  const list = getLocalBookmarks()
  if (!list.find(b => b.id === id)) {
    list.push({ id })
    localStorage.setItem(KEY, JSON.stringify(list))
  }
}

export function removeLocalBookmark(id: string) {
  const list = getLocalBookmarks().filter(b => b.id !== id)
  localStorage.setItem(KEY, JSON.stringify(list))
}


