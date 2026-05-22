import React, { useEffect, useState } from 'react'
import { useAccountStore } from '@/stores/accounts'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Account } from '../../../../preload/index.d'

interface Props {
  open: boolean
  onClose: () => void
  editing?: Account | null
}

const REGIONS = [
  { id: 'oss-cn-hangzhou', label: '华东1 (杭州)' },
  { id: 'oss-cn-shanghai', label: '华东2 (上海)' },
  { id: 'oss-cn-beijing', label: '华北2 (北京)' },
  { id: 'oss-cn-shenzhen', label: '华南1 (深圳)' },
  { id: 'oss-cn-hongkong', label: '中国香港' },
  { id: 'oss-us-west-1', label: '美国西部 (硅谷)' },
  { id: 'oss-us-east-1', label: '美国东部 (弗吉尼亚)' },
  { id: 'oss-ap-southeast-1', label: '亚太东南 (新加坡)' }
]

export function AddAccountDialog({ open, onClose, editing }: Props) {
  const { add, update } = useAccountStore()
  const [form, setForm] = useState({
    name: '',
    accessKeyId: '',
    accessKeySecret: '',
    endpoint: '',
    region: 'oss-cn-hangzhou',
    defaultBucket: '',
    cname: '',
    proxy: '',
    insecureTLS: false
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm({
      name: editing?.name ?? '',
      accessKeyId: editing?.accessKeyId ?? '',
      accessKeySecret: editing?.accessKeySecret ?? '',
      endpoint: editing?.endpoint ?? '',
      region: editing?.region ?? 'oss-cn-hangzhou',
      defaultBucket: editing?.defaultBucket ?? '',
      cname: editing?.cname ?? '',
      proxy: editing?.proxy ?? '',
      insecureTLS: editing?.insecureTLS ?? false
    })
  }, [open, editing?.id])

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (editing) {
        const updates = { ...form }
        if (!updates.accessKeySecret) delete (updates as any).accessKeySecret
        await update(editing.id, updates)
      } else {
        await add(form)
      }
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? '编辑账号' : '添加账号'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="名称" placeholder="我的阿里云" value={form.name} onChange={(v) => set('name', v)} required />
          <Field label="AccessKey ID" placeholder="LTAI..." value={form.accessKeyId} onChange={(v) => set('accessKeyId', v)} required />
          <Field
            label={editing ? 'AccessKey Secret（留空保持不变）' : 'AccessKey Secret'}
            placeholder="..."
            value={form.accessKeySecret}
            onChange={(v) => set('accessKeySecret', v)}
            required={!editing}
            type="password"
          />
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">地域</label>
            <select
              className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={form.region}
              onChange={(e) => set('region', e.target.value)}
            >
              {REGIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
          <Field label="自定义 Endpoint（可选）" placeholder="https://oss-cn-hangzhou.aliyuncs.com" value={form.endpoint} onChange={(v) => set('endpoint', v)} />
          <Field label="默认 Bucket（可选，无 ListBuckets 权限时必填）" placeholder="my-bucket-name" value={form.defaultBucket} onChange={(v) => set('defaultBucket', v)} />
          <Field label="自定义域名 CNAME（可选）" placeholder="https://cdn.example.com" value={form.cname} onChange={(v) => set('cname', v)} />
          <Field label="代理（可选，支持 HTTP / SOCKS5）" placeholder="http://127.0.0.1:7890 或 socks5://127.0.0.1:1080" value={form.proxy} onChange={(v) => set('proxy', v)} />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={form.insecureTLS}
              onChange={(e) => set('insecureTLS', e.target.checked)}
            />
            忽略 SSL 证书校验（代理做 MITM 抓包时使用，不安全）
          </label>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>取消</Button>
            <Button type="submit" disabled={loading}>{loading ? '保存中...' : '保存'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, value, onChange, ...props }: {
  label: string; value: string; onChange: (v: string) => void
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <div>
      <label className="mb-1 block text-xs text-muted-foreground">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} {...props} />
    </div>
  )
}
