import { ScrollText } from 'lucide-react'

export default function AuditLog() {
  return (
    <div className="max-w-4xl animate-slide-up">
      <div className="mb-8">
        <h2 className="font-display font-700 text-3xl text-ink mb-1">Audit Log</h2>
        <p className="font-body text-sm text-ink-muted">
          A permanent record of everything eliminated.
        </p>
      </div>

      <div className="card flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 bg-surface-muted rounded-2xl flex items-center justify-center mb-4">
          <ScrollText size={24} className="text-ink-faint" strokeWidth={1.5} />
        </div>
        <h3 className="font-display font-600 text-lg text-ink mb-2">
          No runs logged yet
        </h3>
        <p className="font-body text-sm text-ink-muted max-w-xs leading-relaxed">
          Every cleanup run will appear here with a full breakdown — 
          rule by rule, count by count.
        </p>
        <div className="mt-6 px-4 py-2 bg-surface-muted rounded-lg">
          <p className="text-xs font-mono text-ink-faint">Populated after Phase 3 runs</p>
        </div>
      </div>
    </div>
  )
}
