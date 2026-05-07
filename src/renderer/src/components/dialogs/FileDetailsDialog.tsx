import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatBytes, formatDate } from '@/lib/utils'
import type { ObjectMeta } from '../../../../preload/index.d'

interface Props {
  open: boolean
  onClose: () => void
  accountId: string
  bucket: string
  objKey: string
}

const ACL_LABELS: Record<string, string> = {
  private: '私有',
  'public-read': '公共读',
  'public-read-write': '公共读写',
  default: '继承 Bucket',
  '': '继承 Bucket'
}

export function FileDetailsDialog({ open, onClose, accountId, bucket, objKey }: Props) {
  const [meta, setMeta] = useState<ObjectMeta | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError('')
    window.api.oss.headObject(accountId, bucket, objKey)
      .then(setMeta)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [open, accountId, bucket, objKey])

  const rows: [string, string][] = meta ? [
    ['文件名', objKey.split('/').pop() || objKey],
    ['完整路径', objKey],
    ['文件大小', formatBytes(meta.size)],
    ['ETag', meta.etag || '-'],
    ['Content-Type', meta.contentType || '-'],
    ['存储类型', meta.storageClass || '-'],
    ['最后修改', meta.lastModified ? formatDate(meta.lastModified) : '-'],
    ['ACL', ACL_LABELS[meta.objectAcl] || meta.objectAcl || '-'],
    ['Cache-Control', meta.cacheControl || '-'],
    ['Content-Encoding', meta.contentEncoding || '-'],
    ['Content-Disposition', meta.contentDisposition || '-']
  ] : []

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>文件详情</DialogTitle>
        </DialogHeader>
        {loading && <p className="text-xs text-muted-foreground">加载中...</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
        {meta && (
          <dl className="divide-y text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[140px_1fr] gap-2 py-1.5">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="text-xs font-mono break-all">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </DialogContent>
    </Dialog>
  )
}
