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

export interface OSSObject {
  key: string
  size: number
  isFolder: boolean
  lastModified: string | null
  storageClass: string
  etag?: string
}

export interface OSSBucket {
  name: string
  region: string
  createdAt: string
  storageClass: string
}

export interface ListObjectsResult {
  items: OSSObject[]
  nextToken: string | null
  isTruncated: boolean
}

export interface ObjectMeta {
  contentType: string
  size: number
  etag: string
  lastModified: string
  storageClass: string
  objectAcl: string
  cacheControl: string
  contentEncoding: string
  contentDisposition: string
}

declare global {
  interface Window {
    api: {
      accounts: {
        list: () => Promise<Account[]>
        getActiveId: () => Promise<string | null>
        add: (account: Omit<Account, 'id' | 'createdAt'>) => Promise<Account>
        update: (id: string, updates: Partial<Omit<Account, 'id' | 'createdAt'>>) => Promise<Account>
        delete: (id: string) => Promise<void>
        setActive: (id: string) => Promise<void>
      }
      config: {
        export: () => Promise<boolean>
        import: () => Promise<boolean>
      }
      oss: {
        listBuckets: (accountId: string) => Promise<OSSBucket[]>
        createBucket: (accountId: string, bucket: string, storageClass: string) => Promise<void>
        deleteBucket: (accountId: string, bucket: string) => Promise<void>
        listObjects: (accountId: string, bucket: string, prefix: string, token?: string) => Promise<ListObjectsResult>
        searchObjects: (accountId: string, bucket: string, keyword: string) => Promise<OSSObject[]>
        getSignedUrl: (accountId: string, bucket: string, key: string) => Promise<string>
        getObjectDataUrl: (accountId: string, bucket: string, key: string) => Promise<string>
        getObjectText: (accountId: string, bucket: string, key: string) => Promise<string>
        headObject: (accountId: string, bucket: string, key: string) => Promise<ObjectMeta>
        deleteObjects: (accountId: string, bucket: string, keys: string[]) => Promise<void>
        createFolder: (accountId: string, bucket: string, key: string) => Promise<void>
        copyObject: (accountId: string, bucket: string, src: string, dest: string) => Promise<void>
        renameObject: (accountId: string, bucket: string, src: string, dest: string) => Promise<void>
        setObjectAcl: (accountId: string, bucket: string, key: string, acl: string) => Promise<void>
        setObjectMeta: (accountId: string, bucket: string, key: string, headers: Record<string, string>) => Promise<void>
      }
      transfer: {
        chooseFiles: () => Promise<string[]>
        chooseFolder: () => Promise<string | null>
        chooseSaveDir: () => Promise<string | null>
        upload: (accountId: string, bucket: string, prefix: string, filePaths: string[]) => Promise<void>
        uploadFolder: (accountId: string, bucket: string, prefix: string, folderPath: string) => Promise<string[]>
        download: (accountId: string, bucket: string, key: string, savePath: string) => Promise<void>
        downloadMultiple: (accountId: string, bucket: string, keys: string[], savePath: string) => Promise<void>
        cancel: (key: string) => Promise<void>
        onProgress: (cb: (data: { key: string; progress: number }) => void) => () => void
        onDone: (cb: (data: { key: string }) => void) => () => void
        onError: (cb: (data: { key: string; message: string }) => void) => () => void
      }
      shell: {
        openExternal: (url: string) => Promise<void>
      }
      window: {
        minimize: () => Promise<void>
        maximize: () => Promise<void>
        close: () => Promise<void>
        platform: string
      }
    }
  }
}
