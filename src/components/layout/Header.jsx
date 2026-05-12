import { useLocation } from 'react-router-dom'

const titles = {
  '/': { label: 'Dashboard', sub: 'Your inbox, under control.' },
  '/rules': { label: 'Rules', sub: 'Define what gets eliminated.' },
  '/audit': { label: 'Audit Log', sub: 'Everything that\'s been cleaned.' },
  '/settings': { label: 'Settings', sub: 'Configure your targets.' },
}

export default function Header() {
  const { pathname } = useLocation()
  const page = titles[pathname] ?? titles['/']

  return (
    <header className="h-16 border-b border-surface-border bg-surface-DEFAULT 
                       flex items-center px-8 gap-4 shrink-0">
      <div>
        <h1 className="font-display font-700 text-lg text-ink-DEFAULT leading-tight">
          {page.label}
        </h1>
        <p className="text-xs font-body text-ink-muted leading-tight">
          {page.sub}
        </p>
      </div>
    </header>
  )
}
