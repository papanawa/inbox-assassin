import { CheckCircle, ArrowRight, RotateCcw } from 'lucide-react'

export default function RunSummary({ results, mode, batchSize, onNextBatch, onClose }) {
  const totalDeleted = results.reduce((sum, r) => sum + (r.succeeded ?? 0), 0)
  const totalFailed = results.reduce((sum, r) => sum + (r.failed ?? 0), 0)
  const hasNextBatch = mode === 'batch' && results.some(r => r.nextPageToken)
  const date = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="fixed inset-0 bg-ink/40 z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up overflow-hidden">

        {/* Header */}
        <div className="bg-ink px-6 py-6 text-center">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <CheckCircle size={22} className="text-white" strokeWidth={2} />
          </div>
          <h2 className="font-display font-700 text-xl text-white mb-1">Mission Complete</h2>
          <p className="text-xs font-mono text-white/60">{date}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 border-b border-surface-border">
          <div className="px-6 py-4 text-center border-r border-surface-border">
            <div className="font-display font-700 text-3xl text-assassin-red">
              {totalDeleted.toLocaleString()}
            </div>
            <div className="text-xs font-body text-ink-muted mt-0.5">Emails Eliminated</div>
          </div>
          <div className="px-6 py-4 text-center">
            <div className="font-display font-700 text-3xl text-ink">
              {results.length}
            </div>
            <div className="text-xs font-body text-ink-muted mt-0.5">Rules Executed</div>
          </div>
        </div>

        {/* Per-rule breakdown */}
        <div className="px-6 py-4 space-y-2 max-h-52 overflow-y-auto">
          <p className="text-xs font-mono text-ink-faint uppercase tracking-widest mb-3">Breakdown</p>
          {results.map(({ rule, succeeded, failed }, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 border-b border-surface-border last:border-0">
              <div className="min-w-0">
                <div className="text-xs font-body font-medium text-ink truncate">{rule.name}</div>
                <div className="text-xs font-body text-ink-faint">{rule.action?.replace(/_/g, ' ')}</div>
              </div>
              <div className="text-right shrink-0 ml-4">
                <div className="text-xs font-mono text-assassin-red font-medium">
                  −{(succeeded ?? 0).toLocaleString()}
                </div>
                {(failed ?? 0) > 0 && (
                  <div className="text-xs font-mono text-ink-faint">
                    {failed} failed
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {totalFailed > 0 && (
          <div className="mx-6 mb-3 px-3 py-2 bg-assassin-red-light rounded-lg">
            <p className="text-xs font-body text-assassin-red">
              {totalFailed} emails failed to process — they may have already been deleted or moved.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-border flex gap-3">
          <button onClick={onClose} className="btn-ghost flex-1">Done</button>
          {hasNextBatch && (
            <button
              onClick={onNextBatch}
              className="flex-1 btn-primary flex items-center justify-center gap-2"
            >
              Run Next Batch
              <ArrowRight size={14} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
