import { Plus, ListChecks } from 'lucide-react'

// Phase 2 will implement the full rules engine.
// This placeholder establishes the page shell and empty state.

export default function Rules() {
  return (
    <div className="max-w-4xl animate-slide-up">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="font-display font-700 text-3xl text-ink mb-1">Rules</h2>
          <p className="font-body text-sm text-ink-muted">
            Each rule defines a target. Stack them up before you run.
          </p>
        </div>
        <button
          className="btn-primary flex items-center gap-2 opacity-50 cursor-not-allowed"
          disabled
          title="Coming in Phase 2"
        >
          <Plus size={15} strokeWidth={2.5} />
          New Rule
        </button>
      </div>

      {/* Empty state */}
      <div className="card flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 bg-surface-muted rounded-2xl flex items-center justify-center mb-4">
          <ListChecks size={24} className="text-ink-faint" strokeWidth={1.5} />
        </div>
        <h3 className="font-display font-600 text-lg text-ink mb-2">
          No rules yet
        </h3>
        <p className="font-body text-sm text-ink-muted max-w-xs leading-relaxed">
          The rules engine is coming in Phase 2. You'll be able to target senders, 
          domains, keywords, age, labels, and newsletters.
        </p>
        <div className="mt-6 px-4 py-2 bg-surface-muted rounded-lg">
          <p className="text-xs font-mono text-ink-faint">Phase 2 — Coming next sprint</p>
        </div>
      </div>
    </div>
  )
}
