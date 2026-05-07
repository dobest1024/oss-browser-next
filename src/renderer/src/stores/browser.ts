import { create } from 'zustand'
import type { OSSBucket, OSSObject } from '../../../preload/index.d'

export type SortField = 'name' | 'size' | 'lastModified'
export type SortDir = 'asc' | 'desc'

interface BrowserStore {
  // Navigation
  bucket: string | null
  prefix: string
  buckets: OSSBucket[]
  objects: OSSObject[]
  nextToken: string | null
  isTruncated: boolean
  loading: boolean
  error: string | null

  // Selection
  selected: Set<string>

  // Search
  searchKeyword: string
  isSearching: boolean

  // Sort
  sortField: SortField
  sortDir: SortDir

  setBucket: (bucket: string | null) => void
  setPrefix: (prefix: string) => void
  setSort: (field: SortField) => void
  sortedObjects: () => OSSObject[]
  loadBuckets: (accountId: string) => Promise<void>
  loadObjects: (accountId: string, bucket: string, prefix: string) => Promise<void>
  loadMore: (accountId: string) => Promise<void>
  search: (accountId: string, keyword: string) => Promise<void>
  clearSearch: () => void
  toggleSelect: (key: string) => void
  selectAll: () => void
  clearSelection: () => void
  refresh: (accountId: string) => Promise<void>
}

function compareObjects(a: OSSObject, b: OSSObject, field: SortField, dir: SortDir): number {
  // Folders always first
  if (a.isFolder && !b.isFolder) return -1
  if (!a.isFolder && b.isFolder) return 1

  let cmp = 0
  switch (field) {
    case 'name':
      cmp = a.key.localeCompare(b.key)
      break
    case 'size':
      cmp = a.size - b.size
      break
    case 'lastModified':
      cmp = new Date(a.lastModified || 0).getTime() - new Date(b.lastModified || 0).getTime()
      break
  }
  return dir === 'asc' ? cmp : -cmp
}

export const useBrowserStore = create<BrowserStore>((set, get) => ({
  bucket: null,
  prefix: '',
  buckets: [],
  objects: [],
  nextToken: null,
  isTruncated: false,
  loading: false,
  error: null,
  selected: new Set(),
  searchKeyword: '',
  isSearching: false,
  sortField: 'lastModified',
  sortDir: 'desc',

  setBucket: (bucket) => set({ bucket, prefix: '', objects: [], selected: new Set(), error: null }),

  setPrefix: (prefix) => set({ prefix, objects: [], selected: new Set() }),

  setSort: (field) => set((s) => {
    if (s.sortField === field) {
      return { sortDir: s.sortDir === 'asc' ? 'desc' : 'asc' }
    }
    return { sortField: field, sortDir: field === 'name' ? 'asc' : 'desc' }
  }),

  sortedObjects: () => {
    const { objects, sortField, sortDir } = get()
    return [...objects].sort((a, b) => compareObjects(a, b, sortField, sortDir))
  },

  loadBuckets: async (accountId) => {
    set({ loading: true, error: null })
    try {
      const buckets = await window.api.oss.listBuckets(accountId)
      set({ buckets, loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
      throw err
    }
  },

  loadObjects: async (accountId, bucket, prefix) => {
    set({ loading: true, error: null, objects: [] })
    try {
      const result = await window.api.oss.listObjects(accountId, bucket, prefix)
      set({ objects: result.items, nextToken: result.nextToken, isTruncated: result.isTruncated, loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },

  loadMore: async (accountId) => {
    const { bucket, prefix, nextToken, objects } = get()
    if (!bucket || !nextToken) return
    set({ loading: true })
    try {
      const result = await window.api.oss.listObjects(accountId, bucket, prefix, nextToken)
      set({ objects: [...objects, ...result.items], nextToken: result.nextToken, isTruncated: result.isTruncated, loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },

  search: async (accountId, keyword) => {
    const { bucket } = get()
    if (!bucket) return
    set({ loading: true, isSearching: true, searchKeyword: keyword, error: null })
    try {
      const items = await window.api.oss.searchObjects(accountId, bucket, keyword)
      set({ objects: items, loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },

  clearSearch: () => {
    set({ isSearching: false, searchKeyword: '' })
  },

  toggleSelect: (key) => {
    set((s) => {
      const next = new Set(s.selected)
      next.has(key) ? next.delete(key) : next.add(key)
      return { selected: next }
    })
  },

  selectAll: () => set((s) => {
    if (s.selected.size === s.objects.length && s.objects.length > 0) {
      return { selected: new Set() }
    }
    return { selected: new Set(s.objects.map((o) => o.key)) }
  }),

  clearSelection: () => set({ selected: new Set() }),

  refresh: async (accountId) => {
    const { bucket, prefix } = get()
    if (!bucket) {
      await get().loadBuckets(accountId)
    } else {
      await get().loadObjects(accountId, bucket, prefix)
    }
  }
}))
