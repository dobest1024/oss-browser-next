import { contextBridge, ipcRenderer } from 'electron'
import { version } from '../../package.json'

const api = {
  accounts: {
    list: () => ipcRenderer.invoke('accounts:list'),
    getActiveId: () => ipcRenderer.invoke('accounts:getActiveId'),
    add: (account: unknown) => ipcRenderer.invoke('accounts:add', account),
    update: (id: string, updates: unknown) => ipcRenderer.invoke('accounts:update', id, updates),
    delete: (id: string) => ipcRenderer.invoke('accounts:delete', id),
    setActive: (id: string) => ipcRenderer.invoke('accounts:setActive', id)
  },
  config: {
    export: () => ipcRenderer.invoke('config:export'),
    import: () => ipcRenderer.invoke('config:import')
  },
  oss: {
    listBuckets: (accountId: string) => ipcRenderer.invoke('oss:listBuckets', accountId),
    createBucket: (accountId: string, bucket: string, storageClass: string) =>
      ipcRenderer.invoke('oss:createBucket', accountId, bucket, storageClass),
    deleteBucket: (accountId: string, bucket: string) =>
      ipcRenderer.invoke('oss:deleteBucket', accountId, bucket),
    listObjects: (accountId: string, bucket: string, prefix: string, token?: string) =>
      ipcRenderer.invoke('oss:listObjects', accountId, bucket, prefix, token),
    searchObjects: (accountId: string, bucket: string, keyword: string) =>
      ipcRenderer.invoke('oss:searchObjects', accountId, bucket, keyword),
    getSignedUrl: (accountId: string, bucket: string, key: string) =>
      ipcRenderer.invoke('oss:getSignedUrl', accountId, bucket, key),
    getObjectDataUrl: (accountId: string, bucket: string, key: string) =>
      ipcRenderer.invoke('oss:getObjectDataUrl', accountId, bucket, key),
    getObjectText: (accountId: string, bucket: string, key: string) =>
      ipcRenderer.invoke('oss:getObjectText', accountId, bucket, key),
    headObject: (accountId: string, bucket: string, key: string) =>
      ipcRenderer.invoke('oss:headObject', accountId, bucket, key),
    deleteObjects: (accountId: string, bucket: string, keys: string[]) =>
      ipcRenderer.invoke('oss:deleteObjects', accountId, bucket, keys),
    createFolder: (accountId: string, bucket: string, key: string) =>
      ipcRenderer.invoke('oss:createFolder', accountId, bucket, key),
    copyObject: (accountId: string, bucket: string, src: string, dest: string) =>
      ipcRenderer.invoke('oss:copyObject', accountId, bucket, src, dest),
    renameObject: (accountId: string, bucket: string, src: string, dest: string) =>
      ipcRenderer.invoke('oss:renameObject', accountId, bucket, src, dest),
    setObjectAcl: (accountId: string, bucket: string, key: string, acl: string) =>
      ipcRenderer.invoke('oss:setObjectAcl', accountId, bucket, key, acl),
    setObjectMeta: (accountId: string, bucket: string, key: string, headers: Record<string, string>) =>
      ipcRenderer.invoke('oss:setObjectMeta', accountId, bucket, key, headers)
  },
  transfer: {
    chooseFiles: () => ipcRenderer.invoke('transfer:chooseFiles'),
    chooseFolder: () => ipcRenderer.invoke('transfer:chooseFolder'),
    chooseSaveDir: () => ipcRenderer.invoke('transfer:chooseSaveDir'),
    upload: (accountId: string, bucket: string, prefix: string, filePaths: string[]) =>
      ipcRenderer.invoke('transfer:upload', accountId, bucket, prefix, filePaths),
    uploadFolder: (accountId: string, bucket: string, prefix: string, folderPath: string): Promise<string[]> =>
      ipcRenderer.invoke('transfer:uploadFolder', accountId, bucket, prefix, folderPath),
    download: (accountId: string, bucket: string, key: string, savePath: string) =>
      ipcRenderer.invoke('transfer:download', accountId, bucket, key, savePath),
    downloadMultiple: (accountId: string, bucket: string, keys: string[], savePath: string) =>
      ipcRenderer.invoke('transfer:downloadMultiple', accountId, bucket, keys, savePath),
    cancel: (key: string) => ipcRenderer.invoke('transfer:cancel', key),
    onProgress: (cb: (data: { key: string; progress: number }) => void) => {
      ipcRenderer.on('transfer:progress', (_, data) => cb(data))
      return () => ipcRenderer.removeAllListeners('transfer:progress')
    },
    onDone: (cb: (data: { key: string }) => void) => {
      ipcRenderer.on('transfer:done', (_, data) => cb(data))
      return () => ipcRenderer.removeAllListeners('transfer:done')
    },
    onError: (cb: (data: { key: string; message: string }) => void) => {
      ipcRenderer.on('transfer:error', (_, data) => cb(data))
      return () => ipcRenderer.removeAllListeners('transfer:error')
    }
  },
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url)
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    platform: process.platform
  },
  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    currentVersion: version
  }
}

contextBridge.exposeInMainWorld('api', api)
