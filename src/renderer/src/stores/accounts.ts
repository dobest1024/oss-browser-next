import { create } from 'zustand'
import type { Account } from '../../../preload/index.d'

interface AccountStore {
  accounts: Account[]
  activeId: string | null
  load: () => Promise<void>
  add: (account: Omit<Account, 'id' | 'createdAt'>) => Promise<void>
  update: (id: string, updates: Partial<Omit<Account, 'id' | 'createdAt'>>) => Promise<void>
  remove: (id: string) => Promise<void>
  setActive: (id: string) => Promise<void>
}

export const useAccountStore = create<AccountStore>((set) => ({
  accounts: [],
  activeId: null,

  load: async () => {
    const [accounts, activeId] = await Promise.all([
      window.api.accounts.list(),
      window.api.accounts.getActiveId()
    ])
    set({ accounts, activeId })
  },

  add: async (account) => {
    const newAccount = await window.api.accounts.add(account)
    set((s) => ({
      accounts: [...s.accounts, newAccount],
      activeId: s.activeId ?? newAccount.id
    }))
  },

  update: async (id, updates) => {
    const updated = await window.api.accounts.update(id, updates)
    set((s) => ({ accounts: s.accounts.map((a) => (a.id === id ? updated : a)) }))
  },

  remove: async (id) => {
    await window.api.accounts.delete(id)
    set((s) => {
      const accounts = s.accounts.filter((a) => a.id !== id)
      const activeId = s.activeId === id ? (accounts[0]?.id ?? null) : s.activeId
      return { accounts, activeId }
    })
  },

  setActive: async (id) => {
    await window.api.accounts.setActive(id)
    set({ activeId: id })
  }
}))
