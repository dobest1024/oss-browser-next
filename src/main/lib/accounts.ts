import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { encrypt, decrypt } from './crypto'

export interface Account {
  id: string
  name: string
  accessKeyId: string
  accessKeySecret: string
  endpoint: string
  region: string
  proxy?: string
  defaultBucket?: string
  cname?: string
  createdAt: number
}

interface AccountsStore {
  accounts: Account[]
  activeId: string | null
}

function getStorePath(): string {
  return path.join(app.getPath('userData'), 'accounts.json')
}

function read(): AccountsStore {
  try {
    const raw = fs.readFileSync(getStorePath(), 'utf-8')
    return JSON.parse(decrypt(raw))
  } catch {
    return { accounts: [], activeId: null }
  }
}

function write(store: AccountsStore): void {
  fs.writeFileSync(getStorePath(), encrypt(JSON.stringify(store)), 'utf-8')
}

export function listAccounts(): Account[] {
  return read().accounts
}

export function getActiveId(): string | null {
  return read().activeId
}

export function addAccount(account: Omit<Account, 'id' | 'createdAt'>): Account {
  const store = read()
  const newAccount: Account = { ...account, id: crypto.randomUUID(), createdAt: Date.now() }
  store.accounts.push(newAccount)
  if (!store.activeId) store.activeId = newAccount.id
  write(store)
  return newAccount
}

export function updateAccount(id: string, updates: Partial<Omit<Account, 'id' | 'createdAt'>>): Account {
  const store = read()
  const idx = store.accounts.findIndex((a) => a.id === id)
  if (idx === -1) throw new Error('Account not found')
  store.accounts[idx] = { ...store.accounts[idx], ...updates }
  write(store)
  return store.accounts[idx]
}

export function deleteAccount(id: string): void {
  const store = read()
  store.accounts = store.accounts.filter((a) => a.id !== id)
  if (store.activeId === id) store.activeId = store.accounts[0]?.id ?? null
  write(store)
}

export function setActiveAccount(id: string): void {
  const store = read()
  if (!store.accounts.find((a) => a.id === id)) throw new Error('Account not found')
  store.activeId = id
  write(store)
}

export function exportConfig(): string {
  const store = read()
  return JSON.stringify(store, null, 2)
}

export function importConfig(json: string): void {
  const data = JSON.parse(json) as AccountsStore
  if (!Array.isArray(data.accounts)) throw new Error('Invalid config format')
  write(data)
}
