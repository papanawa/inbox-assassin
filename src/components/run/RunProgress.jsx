import { useEffect, useState } from 'react'
import { Crosshair, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { buildQuery } from '../../lib/gmail'

export default function RunProgress({ selectedRules, mode, batchSize, gmailToken, getGmailToken, onComplete }) {
  const [results, setResults] = useState(
    selectedRules.map(r => ({ rule: r, status: 'pending', succeeded: 0, failed: 0, total: 0 }))
  )
  const [currentIndex, setCurrentIndex] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    runAll()
  }, [])

  const updateResult = (index, updates) => {
    setResults(prev => prev.map((r, i) => i === index ? { ...r, ...updates } : r))
  }

  const runAll = async () => {
    const token = gmailToken ?? await getGmailToken()
    if (!token) return

    const finalResults = []

    for (let i = 0; i < selectedRules.length; i++) {
      setCurrentIndex(i)
      const rule = selectedRules[i]
      const query = buildQuery(rule)

      if (!query) {
        updateResult(i, { status: 'skipped', succeeded: 0, failed: 0, total: 0 })
        finalResults.push({ rule, succeeded: 0, failed: 0, total: 0 })
        continue
      }

      updateResult(i, { status: 'running' })

      try {
        const r = await fetch('/api/gmail/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken: token,
            query,
            action: rule.action ?? 'trash',
            actionLabel: rule.action_config?.label ?? rule.config?.action_label ?? '',
            maxResults: mode === 'batch' ? batchSize : 500,
            fullRun: mode === 'full',
          }),
        })
        const data = await r.json()
        updateResult(i, {
          status: data.error ? 'error' : 'done',
          succeeded: data.succeeded ?? 0,
          failed: data.failed ?? 0,
          total: data.total ?? 0,
          nextPageToken: data.nextPageToken,
        })
        finalResults.push({ rule, ...data })
      } catch (err) {
        updateResult(i, { status: 'error', succeeded: 0, failed: 0, total: 0 })
        finalResults.push({ rule, succeeded: 0, failed: 0, total: 0 })
      }
    }

    setDone(true)
    onComplete(finalResults)
  }

  const totalDeleted = results.reduce((sum, r) => sum + (r.succeeded ?? 0), 0)

  return (
    <div className="fixed inset-0 bg-ink/40 z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 border-b border-surface-border">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              done ? 'bg-ink' : 'bg-assassin-red'
            }`}>
              {done
                ? <CheckCircle size={16} className="text-white" strokeWidth={2} />
                : <Crosshair size={16} className="text-white animate-spin" strokeWidth={2} />
              }
            </div>
            <div>
              <h2 className="font-display font-700 text-base text-ink">
                {done ? 'Run Complete' : 'Executing...'}
              </h2>
              <p className="text-xs font-body text-ink-muted">
                {done
                  ? `${totalDeleted.toLocaleString()} emails processed`
                  : `Rule ${currentIndex + 1} of ${selectedRules.length}`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Rule progress list */}
        <div className="px-6 py-4 space-y-3 max-h-80 overflow-y-auto">
          {results.map(({ rule, status, succeeded, failed, total }, i) => (
            <div key={rule.id} className="flex items-center gap-3">
              {/* Status icon */}
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                {status === 'pending' && <div className="w-2 h-2 rounded-full bg-surface-border" />}
                {status === 'running' && <Loader2 size={16} className="animate-spin text-assassin-red" />}
                {status === 'done' && <CheckCircle size={16} className="text-green-500" strokeWidth={2} />}
                {status === 'error' && <XCircle size={16} className="text-assassin-red" strokeWidth={2} />}
                {status === 'skipped' && <div className="w-2 h-2 rounded-full bg-ink-faint" />}
              </div>

              {/* Rule info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-body font-medium truncate ${
                    status === 'pending' ? 'text-ink-faint' : 'text-ink'
                  }`}>{rule.name}</span>
                  {status === 'done' && (
                    <span className="text-xs font-mono text-assassin-red shrink-0 font-medium">
                      −{succeeded.toLocaleString()}
                    </span>
                  )}
                  {status === 'running' && (
                    <span className="text-xs font-mono text-ink-faint shrink-0">running...</span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="mt-1 h-1 bg-surface-border rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      status === 'done' ? 'bg-ink w-full' :
                      status === 'running' ? 'bg-assassin-red w-1/2 animate-pulse' :
                      status === 'error' ? 'bg-assassin-red w-full' :
                      'w-0'
                    }`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Completion note */}
        {!done && (
          <div className="px-6 pb-5">
            <p className="text-xs font-body text-ink-faint text-center">
              Do not close this window while running.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
