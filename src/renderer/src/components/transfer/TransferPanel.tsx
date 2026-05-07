import { X, Upload, Download, CheckCircle, AlertCircle, XCircle } from 'lucide-react'
import { useTransferStore } from '@/stores/transfer'
import { cn } from '@/lib/utils'

export function TransferPanel() {
  const { jobs, visible, toggle, clear, remove } = useTransferStore()
  const running = jobs.filter((j) => j.status === 'running').length

  const handleCancel = async (key: string) => {
    await window.api.transfer.cancel(key)
    remove(key)
  }

  if (!visible) {
    return (
      <button onClick={toggle}
        className={cn(
          'fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full px-3 py-2 text-xs shadow-lg transition-colors',
          running > 0 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
        )}>
        {running > 0 ? <Upload className="h-3.5 w-3.5 animate-pulse" /> : <Upload className="h-3.5 w-3.5" />}
        传输{running > 0 ? ` (${running})` : ''}
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 w-72 rounded-lg border bg-background shadow-xl">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-medium">传输队列 {running > 0 && <span className="text-xs text-muted-foreground">({running} 进行中)</span>}</span>
        <div className="flex gap-1">
          <button onClick={clear} className="text-xs text-muted-foreground hover:text-foreground px-1">清空</button>
          <button onClick={toggle} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {jobs.length === 0 && (
          <div className="py-8 text-center text-xs text-muted-foreground">暂无传输任务</div>
        )}
        {jobs.map((job) => (
          <div key={job.key} className="flex items-center gap-2 border-b border-border/50 px-3 py-2">
            {job.type === 'upload' ? <Upload className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" /> : <Download className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />}
            <div className="flex-1 min-w-0">
              <div className="truncate text-xs">{job.key.split('/').pop()}</div>
              {job.status === 'running' && (
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary transition-all duration-300" style={{ width: `${job.progress}%` }} />
                </div>
              )}
              {job.status === 'error' && <div className="text-xs text-destructive truncate">{job.message}</div>}
            </div>
            {job.status === 'done' && <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-green-500" />}
            {job.status === 'error' && (
              <button onClick={() => remove(job.key)} className="text-muted-foreground hover:text-foreground flex-shrink-0" title="移除">
                <AlertCircle className="h-3.5 w-3.5 text-destructive" />
              </button>
            )}
            {job.status === 'running' && (
              <button onClick={() => handleCancel(job.key)} className="text-muted-foreground hover:text-destructive flex-shrink-0 transition-colors" title="取消">
                <XCircle className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
