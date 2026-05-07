import { create } from 'zustand'

export interface TransferJob {
  key: string
  type: 'upload' | 'download'
  progress: number
  status: 'running' | 'done' | 'error'
  message?: string
}

interface TransferStore {
  jobs: TransferJob[]
  visible: boolean
  add: (key: string, type: 'upload' | 'download') => void
  setProgress: (key: string, progress: number) => void
  setDone: (key: string) => void
  setError: (key: string, message: string) => void
  remove: (key: string) => void
  toggle: () => void
  clear: () => void
}

export const useTransferStore = create<TransferStore>((set) => ({
  jobs: [],
  visible: false,

  add: (key, type) =>
    set((s) => ({
      jobs: [{ key, type, progress: 0, status: 'running' }, ...s.jobs.filter((j) => j.key !== key)]
    })),

  setProgress: (key, progress) =>
    set((s) => ({ jobs: s.jobs.map((j) => (j.key === key ? { ...j, progress } : j)) })),

  setDone: (key) =>
    set((s) => ({ jobs: s.jobs.map((j) => (j.key === key ? { ...j, status: 'done', progress: 100 } : j)) })),

  setError: (key, message) =>
    set((s) => ({ jobs: s.jobs.map((j) => (j.key === key ? { ...j, status: 'error', message } : j)) })),

  remove: (key) =>
    set((s) => ({ jobs: s.jobs.filter((j) => j.key !== key) })),

  toggle: () => set((s) => ({ visible: !s.visible })),

  clear: () => set({ jobs: [] })
}))
