import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  open: boolean
  onClose: () => void
  accountId: string
  onDone: () => void
}

const STORAGE_CLASSES = [
  { value: 'Standard', label: '标准存储' },
  { value: 'IA', label: '低频访问' },
  { value: 'Archive', label: '归档存储' }
]

export function CreateBucketDialog({ open, onClose, accountId, onDone }: Props) {
  const [name, setName] = useState('')
  const [storageClass, setStorageClass] = useState('Standard')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim().toLowerCase()
    if (!trimmed) return
    setLoading(true)
    setError('')
    try {
      await window.api.oss.createBucket(accountId, trimmed, storageClass)
      setName('')
      onDone()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>新建 Bucket</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Bucket 名称</label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-bucket-name"
            />
            <p className="mt-1 text-xs text-muted-foreground">只能包含小写字母、数字和连字符，长度 3-63</p>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">存储类型</label>
            <select
              className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={storageClass}
              onChange={(e) => setStorageClass(e.target.value)}
            >
              {STORAGE_CLASSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>取消</Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
