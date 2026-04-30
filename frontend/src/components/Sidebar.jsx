import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const isManager = user?.role === 'manager' || user?.role === 'admin'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleNav = (to) => {
    navigate(to)
    onClose?.()
  }

  const navItems = [
    { to: '/', label: 'Overview' },
    { to: '/upload', label: 'Upload' },
    ...(isManager ? [{ to: '/team', label: 'Team' }] : []),
  ]

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="px-6 pt-7 pb-0 mb-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-accent rounded-md flex items-center justify-center">
            <span className="text-white text-lg font-black tracking-tight">P</span>
          </div>
          <div>
            <div className="text-white text-sm font-semibold tracking-wide">PORTLINE</div>
            <div className="text-[#999] text-[11px] tracking-[2px] font-medium">INVOICE INTEL</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 px-3">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={() => onClose?.()}
            className={({ isActive }) =>
              `px-4 py-2.5 rounded-md text-sm ${
                isActive
                  ? 'text-accent bg-sidebar-active border-l-2 border-accent font-medium'
                  : 'text-[#999] hover:text-[#bbb]'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: User + Settings + Logout */}
      <div className="mt-auto px-5 py-4 border-t border-[#444]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 bg-[#555] rounded-full flex items-center justify-center text-xs text-[#bbb] font-semibold">
                {user?.initials}
              </div>
            )}
            <div>
              <div className="text-sm text-[#ccc]">{user?.name}</div>
              <div className="text-[11px] text-[#777]">{user?.role === 'admin' ? 'Administrator' : isManager ? 'Finance Manager' : 'Finance Analyst'}</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-sidebar-hover cursor-pointer"
              title="Settings"
              onClick={() => handleNav('/settings')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>
            <button
              onClick={handleLogout}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-sidebar-hover cursor-pointer"
              title="Logout"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop: always visible */}
      <aside className="hidden md:flex w-[240px] bg-sidebar flex-col shrink-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile: overlay */}
      <aside
        className={`fixed top-0 left-0 h-full w-[260px] bg-sidebar flex-col z-40 md:hidden transition-transform duration-200 ${
          open ? 'flex translate-x-0' : 'flex -translate-x-full'
        }`}
      >
        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className="absolute top-4 right-3 w-8 h-8 flex items-center justify-center rounded-md hover:bg-sidebar-hover cursor-pointer md:hidden"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        {sidebarContent}
      </aside>
    </>
  )
}
