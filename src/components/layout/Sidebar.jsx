import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ListChecks, ScrollText, Settings, LogOut, Crosshair } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const nav = [
  { to: '/',        label: 'Dashboard',  icon: LayoutDashboard, end: true },
  { to: '/rules',   label: 'Rules',      icon: ListChecks },
  { to: '/audit',   label: 'Audit Log',  icon: ScrollText },
  { to: '/settings',label: 'Settings',   icon: Settings },
]

export default function Sidebar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <aside className="w-60 min-h-screen bg-surface-DEFAULT border-r border-surface-border 
                      flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-surface-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-ink-DEFAULT rounded-lg flex items-center justify-center">
            <Crosshair size={16} className="text-assassin-red" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display font-700 text-sm text-ink-DEFAULT leading-tight tracking-tight">
              INBOX
            </div>
            <div className="font-display font-800 text-sm text-assassin-red leading-tight tracking-tight">
              ASSASSIN
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <Icon size={16} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-surface-border">
        <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
          {user?.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt="avatar"
              className="w-7 h-7 rounded-full object-cover"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-surface-muted border border-surface-border 
                            flex items-center justify-center text-xs font-display font-600 text-ink-muted">
              {user?.email?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-body font-medium text-ink-DEFAULT truncate">
              {user?.user_metadata?.full_name ?? 'User'}
            </div>
            <div className="text-xs font-mono text-ink-faint truncate">
              {user?.email ?? ''}
            </div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="sidebar-link w-full text-left"
        >
          <LogOut size={16} strokeWidth={2} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
