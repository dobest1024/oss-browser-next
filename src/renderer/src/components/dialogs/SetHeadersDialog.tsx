import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  open: boolean
  onClose: () => void
  accountId: string
  bucket: string
  objKey: string
  onDone: () => void
}

interface HeadersForm {
  'Content-Type': string
  'Cache-Control': string
  'Content-Encoding': string
  'Content-Disposition': string
}

export function SetHeadersDialog({ open, onClose, accountId, bucket, objKey, onDone }: Props) {
  const [form, setForm] = useState<HeadersForm>({
    'Content-Type': '',
    'Cache-Control': '',
    'Content-Encoding': '',
    'Content-Disposition': ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    window.api.oss.headObject(accountId, bucket, objKey)
      .then((meta) => {
        setForm({
          'Content-Type': meta.contentType,
          'Cache-Control': meta.cacheControl,
          'Content-Encoding': meta.contentEncoding,
          'Content-Disposition': meta.contentDisposition
        })
      })
      .catch(() => {})
  }, [open, accountId, bucket, objKey])

  const set = (k: keyof HeadersForm, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await window.api.oss.setObjectMeta(accountId, bucket, objKey, form)
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
          <DialogTitle>设置 HTTP 请求头</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-xs text-muted-foreground truncate">{objKey}</p>
          <Field label="Content-Type" placeholder="image/jpeg" value={form['Content-Type']} onChange={(v) => set('Content-Type', v)} />
          <Field label="Cache-Control" placeholder="max-age=86400, public" value={form['Cache-Control']} onChange={(v) => set('Cache-Control', v)} />
          <Field label="Content-Encoding" placeholder="gzip" value={form['Content-Encoding']} onChange={(v) => set('Content-Encoding', v)} />
          <Field label="Content-Disposition" placeholder="attachment; filename=file.txt" value={form['Content-Disposition']} onChange={(v) => set('Content-Disposition', v)} />
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

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-muted-foreground">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="text-xs" />
    </div>
  )
}
