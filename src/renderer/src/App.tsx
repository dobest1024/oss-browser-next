import { useEffect, useState } from 'react'
import { Toaster } from 'sonner'
import { ExternalLink, X } from 'lucide-react'
import { Sidebar } from './components/Sidebar'
import { FileBrowser } from './components/FileBrowser'
import { TransferPanel } from './components/transfer/TransferPanel'
import { useAccountStore } from './stores/accounts'

interface UpdateInfo {
  version: string
  url: string
}

export function App() {
  const { load, activeId } = useAccountStore()
  const [update, setUpdate] = useState<UpdateInfo | null>(null)

  useEffect(() => {
    load()
    // Check for updates after a short delay to not block startup
    setTimeout(async () => {
      try {
        const info = await window.api.updater.check()
        if (info) setUpdate({ version: info.version, url: info.url })
      } catch { /* ignore */ }
    }, 3000)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
        {update && (
          <div className="flex items-center gap-2 border-b border-blue-200 bg-blue-50 px-4 py-2 text-xs text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
            <span className="flex-1">🎉 发现新版本 v{update.version}，点击下载更新</span>
            <button
              onClick={() => window.api.shell.openExternal(update.url)}
              className="flex items-center gap-1 rounded px-2 py-0.5 font-medium hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
            >
              <ExternalLink className="h-3 w-3" /> 查看
            </button>
            <button onClick={() => setUpdate(null)} className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {activeId ? (
          <FileBrowser />
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
            <div className="text-center">
              <div className="text-4xl mb-3">☁️</div>
              <div>在左侧添加账号开始使用</div>
              <div className="mt-2 text-xs opacity-50">v{window.api.updater.currentVersion}</div>
            </div>
          </div>
        )}
      </main>
      <TransferPanel />
      <Toaster position="bottom-center" richColors />
    </div>
  )
}
