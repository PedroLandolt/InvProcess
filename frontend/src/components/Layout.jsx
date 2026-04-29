import { useState, createContext, useContext } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import ErrorBoundary from './ErrorBoundary'

const SidebarContext = createContext()
export const useSidebar = () => useContext(SidebarContext)

export default function Layout() {
  const [open, setOpen] = useState(false)

  return (
    <SidebarContext.Provider value={{ open, setOpen }}>
      <div className="flex h-screen overflow-hidden">
        {/* Mobile overlay */}
        {open && (
          <div
            className="fixed inset-0 bg-black/40 z-30 md:hidden"
            onClick={() => setOpen(false)}
          />
        )}

        <Sidebar open={open} onClose={() => setOpen(false)} />

        <main className="flex-1 flex flex-col bg-surface overflow-hidden min-w-0">
          {/* Mobile header */}
          <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border-light bg-white shrink-0">
            <button
              onClick={() => setOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-[#f5f5f5] cursor-pointer"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-accent rounded-md flex items-center justify-center">
                <span className="text-white text-sm font-black tracking-tight">P</span>
              </div>
              <span className="text-sm font-semibold text-text-primary">Invoice Intel</span>
            </div>
          </div>

          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </SidebarContext.Provider>
  )
}
