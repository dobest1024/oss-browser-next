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
  onDone: () => void
}

export function CopyMoveDialog({ open, onClose, accountId, bucket, srcKey, onDone }: Props) {
  const [destKey, setDestKey] = useState(srcKey)
  const [mode, setMode] = useState<'copy' | 'move'>('copy')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const dest = destKey.trim()
    if (!dest || dest === srcKey) return
    setLoading(true)
    setError('')
    try {
      if (mode === 'move') {
        // Use renameObject which handles folder recursion
        await window.api.oss.renameObject(accountId, bucket, srcKey, dest)
      } else {
        await window.api.oss.copyObject(accountId, bucket, srcKey, dest)
      }
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
          <DialogTitle>复制 / 移动</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">源文件</label>
            <p className="rounded bg-muted px-2 py-1.5 text-xs font-mono truncate">{srcKey}</p>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">目标路径（Bucket 内完整路径）</label>
            <Input
              autoFocus
              value={destKey}
              onChange={(e) => setDestKey(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
          <div className="flex gap-3">
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="radio" value="copy" checked={mode === 'copy'} onChange={() => setMode('copy')} />
              复制
            </label>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="radio" value="move" checked={mode === 'move'} onChange={() => setMode('move')} />
              移动
            </label>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>取消</Button>
            <Button type="submit" disabled={loading || !destKey.trim() || destKey.trim() === srcKey}>
              {loading ? '处理中...' : mode === 'copy' ? '复制' : '移动'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
