import { ipcMain, dialog, BrowserWindow, shell } from 'electron'
import fs from 'fs'
import path from 'path'
import OSS from 'ali-oss'
import {
  listAccounts, addAccount, updateAccount, deleteAccount,
  setActiveAccount, getActiveId, exportConfig, importConfig
} from '../lib/accounts'
import { getClient, invalidateClient } from '../lib/oss-factory'

// Keys that should be cancelled on next progress tick
const cancelledKeys = new Set<string>()

function walkDir(dir: string): string[] {
  const results: string[] = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath))
    } else {
      results.push(fullPath)
    }
  }
  return results
}

function getClientForAccount(accountId: string) {
  const accounts = listAccounts()
  const account = accounts.find((a) => a.id === accountId)
  if (!account) throw new Error('Account not found')
  return getClient(account)
}

// ─── Accounts ────────────────────────────────────────────────────────────────

ipcMain.handle('accounts:list', () => listAccounts())
ipcMain.handle('accounts:getActiveId', () => getActiveId())
ipcMain.handle('accounts:add', (_, account) => addAccount(account))
ipcMain.handle('accounts:update', (_, id, updates) => {
  invalidateClient(id)
  return updateAccount(id, updates)
})
ipcMain.handle('accounts:delete', (_, id) => {
  invalidateClient(id)
  deleteAccount(id)
})
ipcMain.handle('accounts:setActive', (_, id) => setActiveAccount(id))

// ─── Config export/import ────────────────────────────────────────────────────

ipcMain.handle('config:export', async () => {
  const win = BrowserWindow.getFocusedWindow()!
  const { filePath } = await dialog.showSaveDialog(win, {
    defaultPath: 'oss-browser-accounts.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })
  if (!filePath) return false
  fs.writeFileSync(filePath, exportConfig(), 'utf-8')
  return true
})

ipcMain.handle('config:import', async () => {
  const win = BrowserWindow.getFocusedWindow()!
  const { filePaths } = await dialog.showOpenDialog(win, {
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  })
  if (!filePaths.length) return false
  importConfig(fs.readFileSync(filePaths[0], 'utf-8'))
  return true
})

// ─── OSS – Buckets ───────────────────────────────────────────────────────────

ipcMain.handle('oss:listBuckets', async (_, accountId: string) => {
  const accounts = listAccounts()
  const account = accounts.find((a) => a.id === accountId)
  if (!account) throw new Error('Account not found')
  const client = getClient(account)
  const result = await client.listBuckets({})
  return (result.buckets || []).map((b) => ({
    name: b.name,
    region: b.region,
    createdAt: b.creationDate,
    storageClass: b.storageClass
  }))
})

ipcMain.handle('oss:createBucket', async (_, accountId: string, bucket: string, storageClass: string) => {
  const client = getClientForAccount(accountId)
  await client.putBucket(bucket, { StorageClass: storageClass as any })
})

ipcMain.handle('oss:deleteBucket', async (_, accountId: string, bucket: string) => {
  const client = getClientForAccount(accountId)
  await client.deleteBucket(bucket)
})

// ─── OSS – Objects ───────────────────────────────────────────────────────────

ipcMain.handle('oss:listObjects', async (_, accountId: string, bucket: string, prefix: string, continuationToken?: string) => {
  const accounts = listAccounts()
  const account = accounts.find((a) => a.id === accountId)
  if (!account) throw new Error('Account not found')
  const client = getClient(account)
  client.useBucket(bucket)
  const result = await (client as any).listV2({
    prefix,
    delimiter: '/',
    'max-keys': 200,
    'continuation-token': continuationToken
  })
  const folders = (result.prefixes || []).map((p: string) => ({
    key: p, size: 0, isFolder: true, lastModified: null, storageClass: ''
  }))
  const files = (result.objects || [])
    .filter((o: OSS.ObjectMeta) => o.name !== prefix)
    .map((o: OSS.ObjectMeta) => ({
      key: o.name,
      size: o.size,
      isFolder: false,
      lastModified: o.lastModified,
      storageClass: o.storageClass,
      etag: o.etag
    }))
  return {
    items: [...folders, ...files],
    nextToken: result.nextContinuationToken || null,
    isTruncated: result.isTruncated
  }
})

ipcMain.handle('oss:searchObjects', async (_, accountId: string, bucket: string, keyword: string) => {
  const accounts = listAccounts()
  const account = accounts.find((a) => a.id === accountId)
  if (!account) throw new Error('Account not found')
  const client = getClient(account)
  client.useBucket(bucket)
  const result = await (client as any).listV2({ prefix: keyword, 'max-keys': 100 })
  return (result.objects || []).map((o: OSS.ObjectMeta) => ({
    key: o.name, size: o.size, isFolder: false,
    lastModified: o.lastModified, storageClass: o.storageClass, etag: o.etag
  }))
})

ipcMain.handle('oss:getSignedUrl', async (_, accountId: string, bucket: string, key: string) => {
  const accounts = listAccounts()
  const account = accounts.find((a) => a.id === accountId)
  if (!account) throw new Error('Account not found')
  const client = getClient(account)
  client.useBucket(bucket)
  const url = client.signatureUrl(key, { expires: 3600 })
  if (url.startsWith('//')) return 'https:' + url
  return url.replace(/^http:\/\//, 'https://')
})

ipcMain.handle('oss:getObjectDataUrl', async (_, accountId: string, bucket: string, key: string) => {
  const accounts = listAccounts()
  const account = accounts.find((a) => a.id === accountId)
  if (!account) throw new Error('Account not found')
  const client = getClient(account)
  client.useBucket(bucket)
  const result = await client.get(key)
  const buf = result.content as Buffer
  const ext = key.split('.').pop()?.toLowerCase() || ''
  const mimeMap: Record<string, string> = { png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp' }
  const mime = mimeMap[ext] || 'image/jpeg'
  return `data:${mime};base64,${buf.toString('base64')}`
})

ipcMain.handle('oss:getObjectText', async (_, accountId: string, bucket: string, key: string) => {
  const client = getClientForAccount(accountId)
  client.useBucket(bucket)
  const result = await client.get(key)
  return (result.content as Buffer).toString('utf-8')
})

ipcMain.handle('oss:headObject', async (_, accountId: string, bucket: string, key: string) => {
  const client = getClientForAccount(accountId)
  client.useBucket(bucket)
  const result = await client.head(key)
  const h = result.res.headers as Record<string, string>
  return {
    contentType: h['content-type'] || '',
    size: parseInt(h['content-length'] || '0'),
    etag: (h['etag'] || '').replace(/"/g, ''),
    lastModified: h['last-modified'] || '',
    storageClass: h['x-oss-storage-class'] || '',
    objectAcl: h['x-oss-object-acl'] || '',
    cacheControl: h['cache-control'] || '',
    contentEncoding: h['content-encoding'] || '',
    contentDisposition: h['content-disposition'] || ''
  }
})

ipcMain.handle('oss:deleteObjects', async (_, accountId: string, bucket: string, keys: string[]) => {
  const accounts = listAccounts()
  const account = accounts.find((a) => a.id === accountId)
  if (!account) throw new Error('Account not found')
  const client = getClient(account)
  client.useBucket(bucket)
  await client.deleteMulti(keys)
})

ipcMain.handle('oss:createFolder', async (_, accountId: string, bucket: string, key: string) => {
  const accounts = listAccounts()
  const account = accounts.find((a) => a.id === accountId)
  if (!account) throw new Error('Account not found')
  const client = getClient(account)
  client.useBucket(bucket)
  await client.put(key.endsWith('/') ? key : key + '/', Buffer.from(''))
})

ipcMain.handle('oss:copyObject', async (_, accountId: string, bucket: string, src: string, dest: string) => {
  const accounts = listAccounts()
  const account = accounts.find((a) => a.id === accountId)
  if (!account) throw new Error('Account not found')
  const client = getClient(account)
  client.useBucket(bucket)
  await client.copy(dest, src)
})

ipcMain.handle('oss:renameObject', async (_, accountId: string, bucket: string, src: string, dest: string) => {
  const client = getClientForAccount(accountId)
  client.useBucket(bucket)
  if (src.endsWith('/')) {
    // Folder: list all objects, copy to new prefix, delete old ones
    const oldKeys: string[] = []
    let continuationToken: string | undefined
    do {
      const result = await (client as any).listV2({
        prefix: src, 'max-keys': 1000,
        'continuation-token': continuationToken
      })
      for (const obj of result.objects || []) {
        const newKey = dest + (obj.name as string).slice(src.length)
        await client.copy(newKey, obj.name)
        oldKeys.push(obj.name)
      }
      continuationToken = result.nextContinuationToken
    } while (continuationToken)
    if (oldKeys.length > 0) await client.deleteMulti(oldKeys)
  } else {
    await client.copy(dest, src)
    await (client as any).delete(src)
  }
})

ipcMain.handle('oss:setObjectAcl', async (_, accountId: string, bucket: string, key: string, acl: string) => {
  const client = getClientForAccount(accountId)
  client.useBucket(bucket)
  await (client as any).putACL(key, acl)
})

ipcMain.handle('oss:setObjectMeta', async (_, accountId: string, bucket: string, key: string, headers: Record<string, string>) => {
  const client = getClientForAccount(accountId)
  client.useBucket(bucket)
  const validHeaders: Record<string, string> = { 'x-oss-metadata-directive': 'REPLACE' }
  for (const [k, v] of Object.entries(headers)) {
    if (v) validHeaders[k] = v
  }
  await (client as any).copy(key, key, { headers: validHeaders })
})

// ─── Transfer ────────────────────────────────────────────────────────────────

ipcMain.handle('transfer:chooseFiles', async () => {
  const win = BrowserWindow.getFocusedWindow()!
  const { filePaths } = await dialog.showOpenDialog(win, {
    properties: ['openFile', 'multiSelections']
  })
  return filePaths
})

ipcMain.handle('transfer:chooseFolder', async () => {
  const win = BrowserWindow.getFocusedWindow()!
  const { filePaths } = await dialog.showOpenDialog(win, {
    properties: ['openDirectory']
  })
  return filePaths[0] || null
})

ipcMain.handle('transfer:chooseSaveDir', async () => {
  const win = BrowserWindow.getFocusedWindow()!
  const { filePaths } = await dialog.showOpenDialog(win, {
    properties: ['openDirectory', 'createDirectory']
  })
  return filePaths[0] || null
})

ipcMain.handle('transfer:cancel', (_, key: string) => {
  cancelledKeys.add(key)
})

ipcMain.handle('transfer:upload', async (event, accountId: string, bucket: string, prefix: string, filePaths: string[]) => {
  const accounts = listAccounts()
  const account = accounts.find((a) => a.id === accountId)
  if (!account) throw new Error('Account not found')
  const client = getClient(account)
  client.useBucket(bucket)

  for (const filePath of filePaths) {
    const name = path.basename(filePath)
    const key = prefix + name
    if (cancelledKeys.has(key)) {
      cancelledKeys.delete(key)
      event.sender.send('transfer:error', { key, message: 'Cancelled' })
      continue
    }
    try {
      const stat = fs.statSync(filePath)
      if (stat.size < 1024 * 1024) {
        event.sender.send('transfer:progress', { key, progress: 50 })
        await client.put(key, filePath)
      } else {
        await (client as any).multipartUpload(key, filePath, {
          progress: (p: number) => {
            if (cancelledKeys.has(key)) {
              cancelledKeys.delete(key)
              throw new Error('Cancelled')
            }
            event.sender.send('transfer:progress', { key, progress: Math.round(p * 100) })
          }
        })
      }
      event.sender.send('transfer:done', { key })
    } catch (err: any) {
      event.sender.send('transfer:error', { key, message: err.message })
    }
  }
})

ipcMain.handle('transfer:uploadFolder', (event, accountId: string, bucket: string, prefix: string, folderPath: string) => {
  const files = walkDir(folderPath)
  const keys = files.map((f) => prefix + path.relative(folderPath, f).replace(/\\/g, '/'))

  setImmediate(async () => {
    const accounts = listAccounts()
    const account = accounts.find((a) => a.id === accountId)
    if (!account) return
    const client = getClient(account)
    client.useBucket(bucket)

    for (let i = 0; i < files.length; i++) {
      const filePath = files[i]
      const key = keys[i]
      if (cancelledKeys.has(key)) {
        cancelledKeys.delete(key)
        event.sender.send('transfer:error', { key, message: 'Cancelled' })
        continue
      }
      try {
        const stat = fs.statSync(filePath)
        if (stat.size < 1024 * 1024) {
          event.sender.send('transfer:progress', { key, progress: 50 })
          await client.put(key, filePath)
        } else {
          await (client as any).multipartUpload(key, filePath, {
            progress: (p: number) => {
              if (cancelledKeys.has(key)) {
                cancelledKeys.delete(key)
                throw new Error('Cancelled')
              }
              event.sender.send('transfer:progress', { key, progress: Math.round(p * 100) })
            }
          })
        }
        event.sender.send('transfer:done', { key })
      } catch (err: any) {
        event.sender.send('transfer:error', { key, message: err.message })
      }
    }
  })

  return keys
})

ipcMain.handle('transfer:download', async (event, accountId: string, bucket: string, key: string, savePath: string) => {
  const accounts = listAccounts()
  const account = accounts.find((a) => a.id === accountId)
  if (!account) throw new Error('Account not found')
  const client = getClient(account)
  client.useBucket(bucket)

  const dest = path.join(savePath, path.basename(key))
  try {
    await (client as any).get(key, dest, {
      progress: (p: number) => {
        event.sender.send('transfer:progress', { key, progress: Math.round(p * 100) })
      }
    })
    event.sender.send('transfer:done', { key })
    shell.showItemInFolder(dest)
  } catch (err: any) {
    event.sender.send('transfer:error', { key, message: err.message })
  }
})

ipcMain.handle('transfer:downloadMultiple', (event, accountId: string, bucket: string, keys: string[], savePath: string) => {
  setImmediate(async () => {
    const accounts = listAccounts()
    const account = accounts.find((a) => a.id === accountId)
    if (!account) return
    const client = getClient(account)
    client.useBucket(bucket)

    for (const key of keys) {
      if (cancelledKeys.has(key)) {
        cancelledKeys.delete(key)
        event.sender.send('transfer:error', { key, message: 'Cancelled' })
        continue
      }
      const dest = path.join(savePath, path.basename(key))
      try {
        await (client as any).get(key, dest, {
          progress: (p: number) => {
            event.sender.send('transfer:progress', { key, progress: Math.round(p * 100) })
          }
        })
        event.sender.send('transfer:done', { key })
        shell.showItemInFolder(dest)
      } catch (err: any) {
        event.sender.send('transfer:error', { key, message: err.message })
      }
    }
  })
})

ipcMain.handle('shell:openExternal', (_, url: string) => shell.openExternal(url))

// ─── Window controls (Windows / Linux) ──────────────────────────────────────

ipcMain.handle('window:minimize', () => BrowserWindow.getFocusedWindow()?.minimize())
ipcMain.handle('window:maximize', () => {
  const win = BrowserWindow.getFocusedWindow()
  if (!win) return
  win.isMaximized() ? win.unmaximize() : win.maximize()
})
ipcMain.handle('window:close', () => BrowserWindow.getFocusedWindow()?.close())
