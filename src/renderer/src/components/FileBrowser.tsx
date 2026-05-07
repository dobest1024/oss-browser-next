import { useEffect, useRef, useState } from 'react'
import {
  RefreshCw, Upload, Download, Trash2, FolderPlus, FolderUp,
  Search, X, ChevronRight, Home, Link2,
  LayoutGrid, LayoutList, RotateCcw, RotateCw, ZoomIn, ZoomOut,
  Pencil, Copy, MoveRight, Info, Shield, FileText as FileTextIcon,
  Plus, Music, Film
} from 'lucide-react'
import { useAccountStore } from '@/stores/accounts'
import { useBrowserStore } from '@/stores/browser'
import { useTransferStore } from '@/stores/transfer'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { FileIcon } from './FileIcon'
import { formatBytes, formatDate, cn, getFileCategory } from '@/lib/utils'
import type { OSSObject, OSSBucket } from '../../../preload/index.d'
import { RenameDialog } from './dialogs/RenameDialog'
import { CopyMoveDialog } from './dialogs/CopyMoveDialog'
import { FileDetailsDialog } from './dialogs/FileDetailsDialog'
import { SetAclDialog } from './dialogs/SetAclDialog'
import { SetHeadersDialog } from './dialogs/SetHeadersDialog'
import { CreateBucketDialog } from './dialogs/CreateBucketDialog'

type PreviewState =
  | { type: 'image'; url: string; name: string }
  | { type: 'text'; content: string; name: string; isCode: boolean }
  | { type: 'video'; url: string; name: string }
  | { type: 'audio'; url: string; name: string }
  | null

export function FileBrowser() {
  const { activeId, accounts } = useAccountStore()
  const browser = useBrowserStore()
  const transfer = useTransferStore()

  const [searchInput, setSearchInput] = useState('')
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [preview, setPreview] = useState<PreviewState>(null)
  const [dragOver, setDragOver] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  // Dialog targets
  const [renameTarget, setRenameTarget] = useState<OSSObject | null>(null)
  const [copyMoveTarget, setCopyMoveTarget] = useState<OSSObject | null>(null)
  const [detailsTarget, setDetailsTarget] = useState<OSSObject | null>(null)
  const [aclTarget, setAclTarget] = useState<OSSObject | null>(null)
  const [headersTarget, setHeadersTarget] = useState<OSSObject | null>(null)
  const [showCreateBucket, setShowCreateBucket] = useState(false)

  // Context menu
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; obj: OSSObject } | null>(null)

  // Register transfer event listeners once
  useEffect(() => {
    const offProgress = window.api.transfer.onProgress(({ key, progress }) => transfer.setProgress(key, progress))
    const offDone = window.api.transfer.onDone(({ key }) => transfer.setDone(key))
    const offError = window.api.transfer.onError(({ key, message }) => transfer.setError(key, message))
    return () => { offProgress(); offDone(); offError() }
  }, [])

  // Load buckets on account change
  useEffect(() => {
    if (!activeId) return
    const account = accounts.find((a) => a.id === activeId)
    browser.loadBuckets(activeId).catch(() => {
      if (account?.defaultBucket) {
        browser.setBucket(account.defaultBucket)
        browser.loadObjects(activeId, account.defaultBucket, '')
      }
    })
  }, [activeId])

  const goIntoBucket = (name: string) => {
    browser.setBucket(name)
    browser.loadObjects(activeId!, name, '')
  }

  const goIntoFolder = (key: string) => {
    browser.setPrefix(key)
    browser.loadObjects(activeId!, browser.bucket!, key)
  }

  const goHome = () => {
    browser.setBucket(null)
    const account = accounts.find((a) => a.id === activeId)
    browser.loadBuckets(activeId!).catch(() => {
      if (account?.defaultBucket) {
        browser.setBucket(account.defaultBucket)
        browser.loadObjects(activeId!, account.defaultBucket, '')
      }
    })
  }

  const handleUpload = async () => {
    const files = await window.api.transfer.chooseFiles()
    if (!files.length) return
    for (const f of files) transfer.add(browser.prefix + f.split('/').pop()!, 'upload')
    await window.api.transfer.upload(activeId!, browser.bucket!, browser.prefix, files)
    browser.refresh(activeId!)
  }

  const handleFolderUpload = async () => {
    const folderPath = await window.api.transfer.chooseFolder()
    if (!folderPath) return
    const keys = await window.api.transfer.uploadFolder(activeId!, browser.bucket!, browser.prefix, folderPath)
    for (const key of keys) transfer.add(key, 'upload')
    browser.refresh(activeId!)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (!browser.bucket || !activeId) return
    const paths = Array.from(e.dataTransfer.files).map((f) => (f as any).path as string).filter(Boolean)
    if (!paths.length) return
    for (const p of paths) transfer.add(browser.prefix + p.split('/').pop()!, 'upload')
    await window.api.transfer.upload(activeId, browser.bucket, browser.prefix, paths)
    browser.refresh(activeId)
  }

  const handleDownload = async (key: string) => {
    const dir = await window.api.transfer.chooseSaveDir()
    if (!dir) return
    transfer.add(key, 'download')
    await window.api.transfer.download(activeId!, browser.bucket!, key, dir)
  }

  const handleBatchDownload = async () => {
    const fileKeys = Array.from(browser.selected).filter((k) => !k.endsWith('/'))
    if (!fileKeys.length) return
    const dir = await window.api.transfer.chooseSaveDir()
    if (!dir) return
    for (const key of fileKeys) transfer.add(key, 'download')
    await window.api.transfer.downloadMultiple(activeId!, browser.bucket!, fileKeys, dir)
  }

  const handleDelete = async (keys: string[]) => {
    if (!confirm(`确认删除 ${keys.length} 个对象？`)) return
    await window.api.oss.deleteObjects(activeId!, browser.bucket!, keys)
    browser.refresh(activeId!)
    browser.clearSelection()
  }

  const handleDeleteBucket = async (name: string) => {
    if (!confirm(`确认删除 Bucket "${name}"？\n注意：Bucket 必须为空才能删除。`)) return
    try {
      await window.api.oss.deleteBucket(activeId!, name)
      browser.refresh(activeId!)
    } catch (err: any) {
      alert(`删除失败：${err.message}`)
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    await window.api.oss.createFolder(activeId!, browser.bucket!, browser.prefix + newFolderName.trim() + '/')
    setNewFolderName(''); setShowNewFolder(false)
    browser.refresh(activeId!)
  }

  const handleSearch = async () => {
    if (!searchInput.trim()) { browser.clearSearch(); browser.refresh(activeId!); return }
    await browser.search(activeId!, searchInput)
  }

  const handlePreview = async (key: string) => {
    const name = key.split('/').pop() || key
    const cat = getFileCategory(key, false)
    try {
      if (cat === 'image') {
        const url = await window.api.oss.getObjectDataUrl(activeId!, browser.bucket!, key)
        setPreview({ type: 'image', url, name })
      } else if (cat === 'video') {
        const url = await window.api.oss.getSignedUrl(activeId!, browser.bucket!, key)
        setPreview({ type: 'video', url, name })
      } else if (cat === 'audio') {
        const url = await window.api.oss.getSignedUrl(activeId!, browser.bucket!, key)
        setPreview({ type: 'audio', url, name })
      } else if (cat === 'text' || cat === 'code') {
        const content = await window.api.oss.getObjectText(activeId!, browser.bucket!, key)
        setPreview({ type: 'text', content, name, isCode: cat === 'code' })
      }
    } catch (err: any) {
      alert(`预览失败：${err.message}`)
    }
  }

  const handleCopyLink = async (key: string) => {
    const url = await window.api.oss.getSignedUrl(activeId!, browser.bucket!, key)
    await navigator.clipboard.writeText(url)
  }

  const openContextMenu = (e: React.MouseEvent, obj: OSSObject) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, obj })
  }

  const isBucketView = !browser.bucket
  const selectedArr = Array.from(browser.selected)
  const selectedFiles = selectedArr.filter((k) => !k.endsWith('/'))
  const isPreviewable = (key: string) =>
    ['image', 'video', 'audio', 'text', 'code'].includes(getFileCategory(key, false))

  return (
    <div
      className="relative flex h-full flex-col"
      onDragOver={(e) => { e.preventDefault(); if (browser.bucket) setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Toolbar */}
      <div className="drag-region flex h-10 flex-shrink-0 items-center gap-1.5 border-b px-3">
        <div className="no-drag flex items-center gap-1.5 flex-1">
          {/* Breadcrumb */}
          <button onClick={goHome} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Home className="h-3.5 w-3.5" />
          </button>
          {browser.bucket && (
            <>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <button onClick={() => { browser.setPrefix(''); browser.loadObjects(activeId!, browser.bucket!, '') }}
                className="text-xs text-muted-foreground hover:text-foreground truncate max-w-[120px]">
                {browser.bucket}
              </button>
            </>
          )}
          {browser.prefix && browser.prefix.replace(/\/$/, '').split('/').map((part, i, arr) => {
            const prefix = arr.slice(0, i + 1).join('/') + '/'
            return (
              <span key={prefix} className="flex items-center gap-1">
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                <button onClick={() => goIntoFolder(prefix)}
                  className="text-xs text-muted-foreground hover:text-foreground truncate max-w-[80px]">
                  {part}
                </button>
              </span>
            )
          })}
        </div>

        {/* Actions */}
        <div className="no-drag flex items-center gap-1">
          {isBucketView && (
            <Button variant="ghost" size="sm" onClick={() => setShowCreateBucket(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> 新建 Bucket
            </Button>
          )}
          {!isBucketView && (
            <>
              <Button variant="ghost" size="sm" onClick={handleUpload} className="gap-1.5">
                <Upload className="h-3.5 w-3.5" /> 上传文件
              </Button>
              <Button variant="ghost" size="sm" onClick={handleFolderUpload} className="gap-1.5">
                <FolderUp className="h-3.5 w-3.5" /> 上传文件夹
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowNewFolder(!showNewFolder)} className="gap-1.5">
                <FolderPlus className="h-3.5 w-3.5" /> 新建目录
              </Button>
              {selectedArr.length > 0 && (
                <>
                  {selectedFiles.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={handleBatchDownload} className="gap-1.5">
                      <Download className="h-3.5 w-3.5" /> 下载({selectedFiles.length})
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(selectedArr)} className="gap-1.5 text-destructive">
                    <Trash2 className="h-3.5 w-3.5" /> 删除({selectedArr.length})
                  </Button>
                </>
              )}
            </>
          )}
          <Button variant="ghost" size="icon" onClick={() => browser.refresh(activeId!)} className="h-7 w-7">
            <RefreshCw className={cn('h-3.5 w-3.5', browser.loading && 'animate-spin')} />
          </Button>
          {!isBucketView && (
            <div className="flex items-center border-l border-border ml-1 pl-1">
              <Button variant="ghost" size="icon" className={cn('h-7 w-7', viewMode === 'list' && 'bg-accent')} onClick={() => setViewMode('list')}>
                <LayoutList className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className={cn('h-7 w-7', viewMode === 'grid' && 'bg-accent')} onClick={() => setViewMode('grid')}>
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* Search */}
        {!isBucketView && (
          <div className="no-drag flex items-center gap-1">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-7 w-48 pl-7 pr-6 text-xs"
                placeholder="搜索文件名..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              {searchInput && (
                <button onClick={() => { setSearchInput(''); browser.clearSearch(); browser.refresh(activeId!) }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* New folder input */}
      {showNewFolder && (
        <div className="flex items-center gap-2 border-b px-3 py-1.5">
          <FolderPlus className="h-4 w-4 text-muted-foreground" />
          <Input
            autoFocus className="h-7 w-48 text-xs" placeholder="目录名称"
            value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setShowNewFolder(false) }}
          />
          <Button size="sm" onClick={handleCreateFolder}>确定</Button>
          <Button size="sm" variant="ghost" onClick={() => setShowNewFolder(false)}>取消</Button>
        </div>
      )}

      {/* Error */}
      {browser.error && (
        <div className="mx-3 mt-2 rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {browser.error}
        </div>
      )}

      {/* File list */}
      <div className="flex-1 overflow-y-auto">
        {isBucketView ? (
          <BucketList
            buckets={browser.buckets}
            onSelect={goIntoBucket}
            onDelete={handleDeleteBucket}
            loading={browser.loading}
          />
        ) : viewMode === 'list' ? (
          <ObjectList
            objects={browser.sortedObjects()}
            selected={browser.selected}
            loading={browser.loading}
            sortField={browser.sortField}
            sortDir={browser.sortDir}
            onSort={browser.setSort}
            onToggleSelect={browser.toggleSelect}
            onSelectAll={browser.selectAll}
            onNavigate={goIntoFolder}
            onDownload={handleDownload}
            onDelete={(key) => handleDelete([key])}
            onPreview={handlePreview}
            onCopyLink={handleCopyLink}
            onRename={setRenameTarget}
            onCopyMove={setCopyMoveTarget}
            onDetails={setDetailsTarget}
            onSetAcl={setAclTarget}
            onSetHeaders={setHeadersTarget}
            onContextMenu={openContextMenu}
            isPreviewable={isPreviewable}
          />
        ) : (
          <ObjectGrid
            objects={browser.sortedObjects()}
            selected={browser.selected}
            loading={browser.loading}
            onToggleSelect={browser.toggleSelect}
            onNavigate={goIntoFolder}
            onDownload={handleDownload}
            onDelete={(key) => handleDelete([key])}
            onPreview={handlePreview}
            onCopyLink={handleCopyLink}
            onContextMenu={openContextMenu}
            isPreviewable={isPreviewable}
            accountId={activeId!}
            bucket={browser.bucket!}
          />
        )}

        {browser.isTruncated && (
          <div className="flex justify-center py-4">
            <Button variant="ghost" size="sm" onClick={() => browser.loadMore(activeId!)}>
              加载更多
            </Button>
          </div>
        )}
      </div>

      {/* Preview overlay */}
      {preview && <PreviewOverlay preview={preview} onClose={() => setPreview(null)} />}

      {/* Drag overlay */}
      {dragOver && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-primary/5 border-2 border-dashed border-primary/40 rounded-lg pointer-events-none">
          <span className="text-sm text-primary font-medium">拖放文件到此处上传</span>
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            obj={contextMenu.obj}
            isPreviewable={isPreviewable}
            onClose={() => setContextMenu(null)}
            onDownload={handleDownload}
            onCopyLink={handleCopyLink}
            onPreview={handlePreview}
            onRename={(obj) => setRenameTarget(obj)}
            onCopyMove={(obj) => setCopyMoveTarget(obj)}
            onDetails={(obj) => setDetailsTarget(obj)}
            onSetAcl={(obj) => setAclTarget(obj)}
            onSetHeaders={(obj) => setHeadersTarget(obj)}
            onDelete={(key) => handleDelete([key])}
          />
        </>
      )}

      {/* Dialogs */}
      {renameTarget && (
        <RenameDialog
          open
          onClose={() => setRenameTarget(null)}
          accountId={activeId!}
          bucket={browser.bucket!}
          srcKey={renameTarget.key}
          prefix={browser.prefix}
          onDone={() => browser.refresh(activeId!)}
        />
      )}
      {copyMoveTarget && (
        <CopyMoveDialog
          open
          onClose={() => setCopyMoveTarget(null)}
          accountId={activeId!}
          bucket={browser.bucket!}
          srcKey={copyMoveTarget.key}
          onDone={() => browser.refresh(activeId!)}
        />
      )}
      {detailsTarget && !detailsTarget.isFolder && (
        <FileDetailsDialog
          open
          onClose={() => setDetailsTarget(null)}
          accountId={activeId!}
          bucket={browser.bucket!}
          objKey={detailsTarget.key}
        />
      )}
      {aclTarget && !aclTarget.isFolder && (
        <SetAclDialog
          open
          onClose={() => setAclTarget(null)}
          accountId={activeId!}
          bucket={browser.bucket!}
          objKey={aclTarget.key}
          onDone={() => {}}
        />
      )}
      {headersTarget && !headersTarget.isFolder && (
        <SetHeadersDialog
          open
          onClose={() => setHeadersTarget(null)}
          accountId={activeId!}
          bucket={browser.bucket!}
          objKey={headersTarget.key}
          onDone={() => {}}
        />
      )}
      <CreateBucketDialog
        open={showCreateBucket}
        onClose={() => setShowCreateBucket(false)}
        accountId={activeId!}
        onDone={() => browser.refresh(activeId!)}
      />
    </div>
  )
}

// ─── Context Menu ─────────────────────────────────────────────────────────────

function ContextMenu({ x, y, obj, isPreviewable, onClose, onDownload, onCopyLink, onPreview, onRename, onCopyMove, onDetails, onSetAcl, onSetHeaders, onDelete }: {
  x: number; y: number; obj: OSSObject; isPreviewable: (key: string) => boolean; onClose: () => void
  onDownload: (key: string) => void; onCopyLink: (key: string) => void; onPreview: (key: string) => void
  onRename: (obj: OSSObject) => void; onCopyMove: (obj: OSSObject) => void
  onDetails: (obj: OSSObject) => void; onSetAcl: (obj: OSSObject) => void; onSetHeaders: (obj: OSSObject) => void
  onDelete: (key: string) => void
}) {
  const menuRef = useRef<HTMLDivElement>(null)

  const item = (icon: React.ReactNode, label: string, action: () => void, danger = false) => (
    <button
      onClick={() => { action(); onClose() }}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-muted transition-colors',
        danger && 'text-destructive hover:bg-destructive/10'
      )}
    >
      {icon}
      {label}
    </button>
  )

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] rounded-lg border bg-background py-1 shadow-lg"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      {!obj.isFolder && isPreviewable(obj.key) && item(<Film className="h-3.5 w-3.5" />, '预览', () => onPreview(obj.key))}
      {!obj.isFolder && item(<Download className="h-3.5 w-3.5" />, '下载', () => onDownload(obj.key))}
      {!obj.isFolder && item(<Link2 className="h-3.5 w-3.5" />, '复制链接', () => onCopyLink(obj.key))}
      <div className="my-1 border-t" />
      {item(<Pencil className="h-3.5 w-3.5" />, '重命名', () => onRename(obj))}
      {item(<Copy className="h-3.5 w-3.5" />, '复制 / 移动', () => onCopyMove(obj))}
      {!obj.isFolder && (
        <>
          <div className="my-1 border-t" />
          {item(<Info className="h-3.5 w-3.5" />, '文件详情', () => onDetails(obj))}
          {item(<Shield className="h-3.5 w-3.5" />, '设置 ACL', () => onSetAcl(obj))}
          {item(<FileTextIcon className="h-3.5 w-3.5" />, '设置请求头', () => onSetHeaders(obj))}
        </>
      )}
      <div className="my-1 border-t" />
      {item(<Trash2 className="h-3.5 w-3.5" />, '删除', () => onDelete(obj.key), true)}
    </div>
  )
}

// ─── Bucket List ─────────────────────────────────────────────────────────────

function BucketList({ buckets, onSelect, onDelete, loading }: {
  buckets: OSSBucket[]; onSelect: (name: string) => void; onDelete: (name: string) => void; loading: boolean
}) {
  if (loading) return <LoadingState />
  if (!buckets.length) return <EmptyState text="暂无 Bucket" />
  return (
    <table className="w-full text-sm">
      <thead className="sticky top-0 bg-background border-b">
        <tr>
          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">名称</th>
          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">地域</th>
          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">存储类型</th>
          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">创建时间</th>
          <th className="w-16 px-4 py-2" />
        </tr>
      </thead>
      <tbody>
        {buckets.map((b) => (
          <tr key={b.name} onDoubleClick={() => onSelect(b.name)} className="group hover:bg-muted/50 cursor-pointer border-b border-border/50">
            <td className="px-4 py-2 flex items-center gap-2 text-xs">
              <span>🪣</span> {b.name}
            </td>
            <td className="px-4 py-2 text-xs text-muted-foreground">{b.region}</td>
            <td className="px-4 py-2 text-xs text-muted-foreground">{b.storageClass}</td>
            <td className="px-4 py-2 text-xs text-muted-foreground">{formatDate(b.createdAt)}</td>
            <td className="px-4 py-2">
              <div className="opacity-0 group-hover:opacity-100 flex justify-end" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => onDelete(b.name)} className="rounded p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive" title="删除 Bucket">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ─── Object List ──────────────────────────────────────────────────────────────

function ObjectList({ objects, selected, loading, sortField, sortDir, onSort, onToggleSelect, onSelectAll, onNavigate, onDownload, onDelete, onPreview, onCopyLink, onRename, onCopyMove, onDetails, onSetAcl, onSetHeaders, onContextMenu, isPreviewable }: {
  objects: OSSObject[]; selected: Set<string>; loading: boolean
  sortField: string; sortDir: string; onSort: (field: any) => void
  onToggleSelect: (key: string) => void; onSelectAll: () => void
  onNavigate: (key: string) => void; onDownload: (key: string) => void
  onDelete: (key: string) => void; onPreview: (key: string) => void
  onCopyLink: (key: string) => void; onRename: (obj: OSSObject) => void
  onCopyMove: (obj: OSSObject) => void; onDetails: (obj: OSSObject) => void
  onSetAcl: (obj: OSSObject) => void; onSetHeaders: (obj: OSSObject) => void
  onContextMenu: (e: React.MouseEvent, obj: OSSObject) => void
  isPreviewable: (key: string) => boolean
}) {
  if (loading && !objects.length) return <LoadingState />
  if (!objects.length) return <EmptyState text="此目录为空" />

  const SortHeader = ({ field, label }: { field: string; label: string }) => (
    <th
      className="px-4 py-2 text-left text-xs font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortField === field && (
          <span className="text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>
        )}
      </span>
    </th>
  )

  return (
    <table className="w-full text-sm">
      <thead className="sticky top-0 bg-background border-b">
        <tr>
          <th className="w-8 px-4 py-2">
            <input type="checkbox" className="rounded" onChange={onSelectAll} checked={selected.size === objects.length && objects.length > 0} />
          </th>
          <SortHeader field="name" label="名称" />
          <SortHeader field="size" label="大小" />
          <SortHeader field="lastModified" label="修改时间" />
          <th className="w-32 px-4 py-2 text-left text-xs font-medium text-muted-foreground">操作</th>
        </tr>
      </thead>
      <tbody>
        {objects.map((obj) => {
          const name = obj.key.replace(/\/$/, '').split('/').pop() || obj.key
          return (
            <tr
              key={obj.key}
              onClick={() => onToggleSelect(obj.key)}
              onDoubleClick={() => obj.isFolder ? onNavigate(obj.key) : isPreviewable(obj.key) ? onPreview(obj.key) : null}
              onContextMenu={(e) => onContextMenu(e, obj)}
              className={cn('group border-b border-border/50 cursor-pointer', selected.has(obj.key) ? 'bg-primary/5' : 'hover:bg-muted/50')}
            >
              <td className="px-4 py-2">
                <input type="checkbox" className="rounded" checked={selected.has(obj.key)} onChange={() => onToggleSelect(obj.key)} onClick={(e) => e.stopPropagation()} />
              </td>
              <td className="px-4 py-2">
                <div className="flex items-center gap-2 text-xs">
                  <FileIcon name={obj.key} isFolder={obj.isFolder} size="sm" />
                  <span className="truncate max-w-xs">{name}</span>
                </div>
              </td>
              <td className="px-4 py-2 text-xs text-muted-foreground">{obj.isFolder ? '-' : formatBytes(obj.size)}</td>
              <td className="px-4 py-2 text-xs text-muted-foreground">{formatDate(obj.lastModified)}</td>
              <td className="px-4 py-2">
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => onRename(obj)} className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-foreground" title="重命名">
                    <Pencil className="h-3 w-3" />
                  </button>
                  {!obj.isFolder && (
                    <>
                      <button onClick={() => onCopyLink(obj.key)} className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-foreground" title="复制链接">
                        <Link2 className="h-3 w-3" />
                      </button>
                      <button onClick={() => onDownload(obj.key)} className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-foreground" title="下载">
                        <Download className="h-3 w-3" />
                      </button>
                      <button onClick={() => onDetails(obj)} className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-foreground" title="详情">
                        <Info className="h-3 w-3" />
                      </button>
                    </>
                  )}
                  <button onClick={() => onDelete(obj.key)} className="rounded p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive" title="删除">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ─── Object Grid ─────────────────────────────────────────────────────────────

function ObjectGrid({ objects, selected, loading, onToggleSelect, onNavigate, onDownload, onDelete, onPreview, onCopyLink, onContextMenu, isPreviewable, accountId, bucket }: {
  objects: OSSObject[]; selected: Set<string>; loading: boolean
  onToggleSelect: (key: string) => void
  onNavigate: (key: string) => void; onDownload: (key: string) => void
  onDelete: (key: string) => void; onPreview: (key: string) => void
  onCopyLink: (key: string) => void
  onContextMenu: (e: React.MouseEvent, obj: OSSObject) => void
  isPreviewable: (key: string) => boolean
  accountId: string; bucket: string
}) {
  const isImage = (key: string) => getFileCategory(key, false) === 'image'
  const [thumbs, setThumbs] = useState<Record<string, string>>({})

  useEffect(() => {
    const loadThumbs = async () => {
      const imageObjects = objects.filter((o) => !o.isFolder && isImage(o.key))
      const entries: Record<string, string> = {}
      for (const obj of imageObjects.slice(0, 50)) {
        try {
          const url = await window.api.oss.getObjectDataUrl(accountId, bucket, obj.key)
          entries[obj.key] = url
        } catch { /* skip */ }
      }
      setThumbs(entries)
    }
    loadThumbs()
  }, [objects, accountId, bucket])

  if (loading && !objects.length) return <LoadingState />
  if (!objects.length) return <EmptyState text="此目录为空" />

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2 p-3">
      {objects.map((obj) => {
        const name = obj.key.replace(/\/$/, '').split('/').pop() || obj.key
        const img = isImage(obj.key)
        return (
          <div
            key={obj.key}
            onClick={() => onToggleSelect(obj.key)}
            onDoubleClick={() => obj.isFolder ? onNavigate(obj.key) : isPreviewable(obj.key) ? onPreview(obj.key) : null}
            onContextMenu={(e) => onContextMenu(e, obj)}
            className={cn(
              'group relative flex flex-col items-center rounded-lg border p-2 cursor-pointer transition-colors',
              selected.has(obj.key) ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/50'
            )}
          >
            <div className="flex h-24 w-full items-center justify-center overflow-hidden rounded bg-muted/30">
              {img && thumbs[obj.key] ? (
                <img src={thumbs[obj.key]} className="h-full w-full object-cover rounded" />
              ) : (
                <FileIcon name={obj.key} isFolder={obj.isFolder} size="lg" />
              )}
            </div>
            <span className="mt-1.5 w-full truncate text-center text-xs">{name}</span>
            {!obj.isFolder && (
              <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => onCopyLink(obj.key)} className="rounded p-1 bg-background/80 hover:bg-accent text-muted-foreground hover:text-foreground" title="复制链接">
                  <Link2 className="h-3 w-3" />
                </button>
                <button onClick={() => onDownload(obj.key)} className="rounded p-1 bg-background/80 hover:bg-accent text-muted-foreground hover:text-foreground" title="下载">
                  <Download className="h-3 w-3" />
                </button>
                <button onClick={() => onDelete(obj.key)} className="rounded p-1 bg-background/80 hover:bg-destructive/10 text-muted-foreground hover:text-destructive" title="删除">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Preview Components ───────────────────────────────────────────────────────

function PreviewOverlay({ preview, onClose }: { preview: NonNullable<PreviewState>; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (preview.type === 'image') return <ImagePreview url={preview.url} name={preview.name} onClose={onClose} />
  if (preview.type === 'text') return <TextPreview content={preview.content} name={preview.name} isCode={preview.isCode} onClose={onClose} />
  if (preview.type === 'video') return <VideoPreview url={preview.url} name={preview.name} onClose={onClose} />
  if (preview.type === 'audio') return <AudioPreview url={preview.url} name={preview.name} onClose={onClose} />
  return null
}

function ImagePreview({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
  const [rotation, setRotation] = useState(0)
  const [scale, setScale] = useState(1)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        <img
          src={url}
          style={{ transform: `rotate(${rotation}deg) scale(${scale})`, maxHeight: '85vh', maxWidth: '85vw' }}
          className="rounded-lg object-contain transition-transform duration-200"
        />
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-xl bg-black/70 px-2 py-1.5 shadow-xl border border-white/10">
          <button onClick={() => setScale((s) => Math.max(0.25, s - 0.25))} className="rounded-lg p-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors" title="缩小">
            <ZoomOut className="h-4 w-4" />
          </button>
          <button onClick={() => setScale((s) => Math.min(4, s + 0.25))} className="rounded-lg p-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors" title="放大">
            <ZoomIn className="h-4 w-4" />
          </button>
          <div className="mx-1 h-4 w-px bg-white/20" />
          <button onClick={() => setRotation((r) => r - 90)} className="rounded-lg p-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors" title="左转 90°">
            <RotateCcw className="h-4 w-4" />
          </button>
          <button onClick={() => setRotation((r) => r + 90)} className="rounded-lg p-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors" title="右转 90°">
            <RotateCw className="h-4 w-4" />
          </button>
          <div className="mx-1 h-4 w-px bg-white/20" />
          <button onClick={onClose} className="rounded-lg p-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors" title="关闭">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function TextPreview({ content, name, isCode, onClose }: { content: string; name: string; isCode: boolean; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/98 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <span className="text-sm font-medium">{name}</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <pre className={cn('text-xs leading-relaxed whitespace-pre-wrap break-all', isCode && 'font-mono')}>{content}</pre>
      </div>
    </div>
  )
}

function VideoPreview({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={onClose}>
      <div className="relative w-full max-w-4xl mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2 text-white/80 text-sm">
            <Film className="h-4 w-4" />
            <span>{name}</span>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <video controls autoPlay className="w-full max-h-[80vh] rounded-lg" src={url} />
      </div>
    </div>
  )
}

function AudioPreview({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div className="bg-background rounded-xl p-6 w-80 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium truncate max-w-[200px]">{name}</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <audio controls autoPlay className="w-full" src={url} />
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
      <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> 加载中...
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">{text}</div>
}
