import { useState } from 'react'
import { Plus, Settings, Upload, Download, Trash2, LogOut, MoreHorizontal, Minus, Square, X } from 'lucide-react'
import { useAccountStore } from '@/stores/accounts'
import { useBrowserStore } from '@/stores/browser'
import { AddAccountDialog } from './dialogs/AddAccountDialog'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'
import type { Account } from '../../../preload/index.d'

export function Sidebar() {
  const { accounts, activeId, setActive, remove } = useAccountStore()
  const { loadBuckets, setBucket, loadObjects } = useBrowserStore()
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)

  const isMac = window.api.window.platform === 'darwin'

  const handleSelectAccount = async (id: string) => {
    await setActive(id)
    setBucket(null)
    const account = accounts.find((a) => a.id === id)!
    try {
      await loadBuckets(id)
    } catch {
      // ListBuckets 无权限时，若配了默认 bucket 则直接进入
      if (account.defaultBucket) {
        setBucket(account.defaultBucket)
        loadObjects(id, account.defaultBucket, '')
      }
    }
  }

  const handleExport = () => window.api.config.export()
  const handleImport = async () => {
    const ok = await window.api.config.import()
    if (ok) window.location.reload()
  }

  return (
    <div className="flex h-full w-56 flex-col border-r border-border bg-muted/30">
      {/* Title bar area */}
      {isMac ? (
        <div className="drag-region h-10 flex-shrink-0" />
      ) : (
        <div className="drag-region flex h-9 flex-shrink-0 items-center justify-between px-3">
          <span className="no-drag text-xs font-semibold text-muted-foreground select-none">OSS Browser Next</span>
          <div className="no-drag flex items-center gap-0.5">
            <button onClick={() => window.api.window.minimize()} className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="最小化">
              <Minus className="h-3 w-3" />
            </button>
            <button onClick={() => window.api.window.maximize()} className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="最大化">
              <Square className="h-3 w-3" />
            </button>
            <button onClick={() => window.api.window.close()} className="rounded p-1 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors" title="关闭">
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Account list */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        <div className="mb-1 flex items-center justify-between px-2">
          <span className="text-xs font-medium text-muted-foreground">账号</span>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowAdd(true)}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {accounts.map((account) => (
          <div key={account.id} className="relative group">
            <button
              onClick={() => handleSelectAccount(account.id)}
              className={cn(
                'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                activeId === account.id
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'hover:bg-accent text-foreground'
              )}
            >
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                {account.name[0]?.toUpperCase()}
              </div>
              <span className="truncate text-xs">{account.name}</span>
            </button>
            <button
              className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 rounded p-0.5 hover:bg-accent"
              onClick={(e) => { e.stopPropagation(); setMenuId(menuId === account.id ? null : account.id) }}
            >
              <MoreHorizontal className="h-3 w-3" />
            </button>
            {menuId === account.id && (
              <AccountMenu
                account={account}
                onEdit={() => { setEditing(account); setMenuId(null) }}
                onDelete={() => { remove(account.id); setMenuId(null) }}
                onClose={() => setMenuId(null)}
              />
            )}
          </div>
        ))}

        {accounts.length === 0 && (
          <div className="px-2 py-4 text-center text-xs text-muted-foreground">
            点击 + 添加账号
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="border-t border-border p-2 space-y-0.5">
        <SidebarAction icon={<Upload className="h-3.5 w-3.5" />} label="导出配置" onClick={handleExport} />
        <SidebarAction icon={<Download className="h-3.5 w-3.5" />} label="导入配置" onClick={handleImport} />
      </div>

      <AddAccountDialog
        open={showAdd || !!editing}
        onClose={() => { setShowAdd(false); setEditing(null) }}
        editing={editing}
      />
    </div>
  )
}

function AccountMenu({ account, onEdit, onDelete, onClose }: {
  account: Account; onEdit: () => void; onDelete: () => void; onClose: () => void
}) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 top-full z-20 mt-1 w-28 rounded-md border bg-background shadow-lg py-1">
        <button onClick={onEdit} className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent">
          <Settings className="h-3 w-3" /> 编辑
        </button>
        <button onClick={onDelete} className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10">
          <Trash2 className="h-3 w-3" /> 删除
        </button>
      </div>
    </>
  )
}

function SidebarAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
      {icon} {label}
    </button>
  )
}
