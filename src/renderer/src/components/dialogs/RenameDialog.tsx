import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  open: boolean
  onClose: () => void
  accountId: string
  bucket: string
  srcKey: string
  prefix: string
  onDone: () => void
}

export function RenameDialog({ open, onClose, accountId, bucket, srcKey, prefix, onDone }: Props) {
  const isFolder = srcKey.endsWith('/')
  const currentName = srcKey.replace(/\/$/, '').split('/').pop() || srcKey
  const [name, setName] = useState(currentName)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || trimmed === currentName) return
    setLoading(true)
    setError('')
    try {
      const dest = prefix + trimmed + (isFolder ? '/' : '')
      await window.api.oss.renameObject(accountId, bucket, srcKey, dest)
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
          <DialogTitle>重命名</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={(e) => {
              // Select without extension for files
              if (!isFolder) {
                const dotIdx = e.target.value.lastIndexOf('.')
                if (dotIdx > 0) e.target.setSelectionRange(0, dotIdx)
              }
            }}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>取消</Button>
            <Button type="submit" disabled={loading || !name.trim() || name.trim() === currentName}>
              {loading ? '重命名中...' : '确定'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
