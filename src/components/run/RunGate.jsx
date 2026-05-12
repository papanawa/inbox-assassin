import { useState, useEffect } from 'react'
import { X, Crosshair, Loader2, ChevronDown, AlertTriangle } from 'lucide-react'
import { buildQuery } from '../../lib/gmail'

const BATCH_SIZES = [500, 1000, 2500]

export default function RunGate({ rules, getGmailToken, onConfirm, onClose }) {
  const [selected, setSelected] = useState(rules.map(r => r.id))
  const [mode, setMode] = useState(null) // null = not chosen yet, 'batch', 'full'
  const [batchSize, setBatchSize] = useState(500)
  const [counts, setCounts] = useState({})
  const [counting, setCounting] = useState(false)
  const [armed, setArmed] = useState(false)

  const selectedRules = rules.filter(r => selected.includes(r.id))
  const totalCount = selectedRules.reduce((sum, r) => sum + (counts[r.id] ?? 0), 0)

  // Fetch counts for all rules
  useEffect(() => {
    if (rules.length === 0) return
    fetchCounts()
  }, [])

  const fetchCounts = async () => {
    setCounting(true)
    const token = await getGmailToken()
    if (!token) { setCounting(false); return }

    const newCounts = {}
    await Promise.all(rules.map(async (rule) => {
      const query = buildQuery(rule)
      if (!query) return
      try {
        const r = await fetch('/api/gmail/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken: token, query }),
        })
        const d = await r.json()
        newCounts[rule.id] = d.count ?? 0
      } catch { newCounts[rule.id] = 0 }
    }))
    setCounts(newCounts)
    setCounting(false)
  }

  const toggleRule = (id) => {
    setArmed(false)
    setSelected(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleArm = () => {
    if (!mode || selectedRules.length === 0) return
    setArmed(true)
  }

  const handleExecute = () => {
    onConfirm({ selectedRules, mode, batchSize })
  }

  const canArm = mode && selectedRules.length > 0

  return (
    <>
      <div className="fixed inset-0 bg-ink/40 z-40 animate-fade-in" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-surface-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-ink flex items-center justify-center">
                <Crosshair size={16} className="text-assassin-red" strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="font-display font-700 text-base text-ink">Run Cleanup</h2>
                <p className="text-xs font-body text-ink-muted">Review before executing</p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-surface-hover flex items-center justify-center text-ink-muted">
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">

            {/* Rule checklist */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-body font-medium text-ink-muted">Rules to run</p>
                <button onClick={() => {
                  setArmed(false)
                  setSelected(selected.length === rules.length ? [] : rules.map(r => r.id))
                }} className="text-xs font-body text-ink-muted hover:text-ink transition-colors">
                  {selected.length === rules.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              <div className="space-y-2">
                {rules.map(rule => {
                  const isSelected = selected.includes(rule.id)
                  const count = counts[rule.id]
                  return (
                    <button key={rule.id} onClick={() => toggleRule(rule.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        isSelected ? 'border-ink bg-ink/5' : 'border-surface-border bg-white opacity-50'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-ink bg-ink' : 'border-surface-border'
                      }`}>
                        {isSelected && <div className="w-2 h-2 bg-white rounded-sm" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-body font-medium text-ink">{rule.name}</div>
                        <div className="text-xs font-body text-ink-muted truncate">
                          {rule.config?.description ?? rule.rule_type}
                        </div>
                      </div>
                      <div className="text-xs font-mono shrink-0">
                        {counting
                          ? <Loader2 size={11} className="animate-spin text-ink-faint" />
                          : count != null
                            ? <span className={count > 0 ? 'text-assassin-red font-medium' : 'text-ink-faint'}>
                                {count > 0 ? `~${count.toLocaleString()}` : '0'}
                              </span>
                            : '—'
                        }
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Mode selection */}
            <div>
              <p className="text-xs font-body font-medium text-ink-muted mb-2">Run mode</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { setMode('batch'); setArmed(false) }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    mode === 'batch' ? 'border-ink bg-ink text-white' : 'border-surface-border hover:border-ink-muted'
                  }`}
                >
                  <div className={`text-xs font-body font-medium mb-0.5 ${mode === 'batch' ? 'text-white' : 'text-ink'}`}>
                    Batch
                  </div>
                  <div className={`text-xs font-body ${mode === 'batch' ? 'text-white/70' : 'text-ink-faint'}`}>
                    Process X at a time
                  </div>
                </button>
                <button onClick={() => { setMode('full'); setArmed(false) }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    mode === 'full' ? 'border-ink bg-ink text-white' : 'border-surface-border hover:border-ink-muted'
                  }`}
                >
                  <div className={`text-xs font-body font-medium mb-0.5 ${mode === 'full' ? 'text-white' : 'text-ink'}`}>
                    Full Run
                  </div>
                  <div className={`text-xs font-body ${mode === 'full' ? 'text-white/70' : 'text-ink-faint'}`}>
                    Process all matches
                  </div>
                </button>
              </div>

              {mode === 'batch' && (
                <div className="mt-3 animate-fade-in">
                  <p className="text-xs font-body text-ink-muted mb-1.5">Batch size</p>
                  <div className="flex gap-2">
                    {BATCH_SIZES.map(size => (
                      <button key={size} onClick={() => setBatchSize(size)}
                        className={`flex-1 py-2 rounded-lg border text-xs font-mono transition-all ${
                          batchSize === size
                            ? 'border-ink bg-ink text-white'
                            : 'border-surface-border text-ink-muted hover:border-ink-muted'
                        }`}
                      >
                        {size.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Total summary */}
            {selectedRules.length > 0 && mode && (
              <div className={`rounded-xl p-4 animate-fade-in ${
                armed ? 'bg-assassin-red text-white' : 'bg-surface-muted'
              }`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle size={16} className={armed ? 'text-white shrink-0 mt-0.5' : 'text-assassin-red shrink-0 mt-0.5'} strokeWidth={2} />
                  <div>
                    <p className={`text-xs font-body font-medium mb-0.5 ${armed ? 'text-white' : 'text-ink'}`}>
                      {armed ? 'Are you sure? This cannot be undone.' : 'Summary'}
                    </p>
                    <p className={`text-xs font-body leading-relaxed ${armed ? 'text-white/80' : 'text-ink-muted'}`}>
                      {mode === 'batch'
                        ? `Process up to ${batchSize.toLocaleString()} emails across ${selectedRules.length} rule${selectedRules.length !== 1 ? 's' : ''}.`
                        : `Process all ~${totalCount.toLocaleString()} emails across ${selectedRules.length} rule${selectedRules.length !== 1 ? 's' : ''}.`
                      }
                      {' '}Emails go to Trash (recoverable for 30 days).
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-surface-border flex gap-3">
            <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            {!armed ? (
              <button
                onClick={handleArm}
                disabled={!canArm}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-body font-medium
                           transition-all cursor-crosshair ${
                  canArm
                    ? 'bg-ink text-white hover:bg-ink-muted'
                    : 'bg-surface-border text-ink-faint cursor-not-allowed'
                }`}
              >
                <Crosshair size={14} strokeWidth={2} />
                Arm
              </button>
            ) : (
              <button
                onClick={handleExecute}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-body
                           font-medium bg-assassin-red text-white hover:bg-assassin-red-hover
                           transition-all animate-pulse-red cursor-crosshair"
              >
                <Crosshair size={14} strokeWidth={2} />
                Execute
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
