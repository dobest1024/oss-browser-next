import { useEffect } from 'react'
import { Toaster } from 'sonner'
import { Sidebar } from './components/Sidebar'
import { FileBrowser } from './components/FileBrowser'
import { TransferPanel } from './components/transfer/TransferPanel'
import { useAccountStore } from './stores/accounts'

export function App() {
  const { load, activeId } = useAccountStore()

  useEffect(() => { load() }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
        {activeId ? (
          <FileBrowser />
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
            <div className="text-center">
              <div className="text-4xl mb-3">☁️</div>
              <div>在左侧添加账号开始使用</div>
            </div>
          </div>
        )}
      </main>
      <TransferPanel />
      <Toaster position="bottom-center" richColors />
    </div>
  )
}
