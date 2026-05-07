import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Props {
  open: boolean
  onClose: () => void
  accountId: string
  bucket: string
  objKey: string
  onDone: () => void
}

const ACL_OPTIONS = [
  { value: 'default', label: '继承 Bucket（default）' },
  { value: 'private', label: '私有（private）' },
  { value: 'public-read', label: '公共读（public-read）' },
  { value: 'public-read-write', label: '公共读写（public-read-write）' }
]

export function SetAclDialog({ open, onClose, accountId, bucket, objKey, onDone }: Props) {
  const [acl, setAcl] = useState('default')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await window.api.oss.setObjectAcl(accountId, bucket, objKey, acl)
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
          <DialogTitle>设置 ACL</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-xs text-muted-foreground truncate">{objKey}</p>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">访问控制</label>
            <select
              className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={acl}
              onChange={(e) => setAcl(e.target.value)}
            >
              {ACL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>取消</Button>
            <Button type="submit" disabled={loading}>{loading ? '保存中...' : '保存'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
