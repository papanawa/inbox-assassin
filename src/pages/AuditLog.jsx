import { useState, useEffect } from 'react'
import { ScrollText, ChevronDown, ChevronUp, Search, Trash2, FolderInput, BookmarkCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const STATUS_COLORS = {
  completed: 'text-green-600 bg-green-50',
  running:   'text-amber-600 bg-amber-50',
  failed:    'text-assassin-red bg-assassin-red-light',
  partial:   'text-amber-600 bg-amber-50',
}

const ACTION_ICONS = {
  trash:           Trash2,
  create_and_move: FolderInput,
  'create and move': FolderInput,
  mark_read:       BookmarkCheck,
}

export default function AuditLog() {
  const { user } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState({})

  useEffect(() => {
    if (!user) return
    fetchLogs()
  }, [user])

  const fetchLogs = async () => {
    try {
      const { data } = await supabase
        .from('deletion_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('run_at', { ascending: false })
        .limit(100)
      setLogs(data ?? [])
    } catch (err) {
      console.error('Audit log fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = logs.filter(log => {
    if (!search.trim()) return true
    const s = search.toLowerCase()
    return (
      log.run_label?.toLowerCase().includes(s) ||
      log.status?.toLowerCase().includes(s) ||
      JSON.stringify(log.rules_applied ?? []).toLowerCase().includes(s)
    )
  })

  const totalDeleted = logs.reduce((sum, l) => sum + (l.total_deleted ?? 0), 0)
  const totalRuns = logs.length

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  return (
    <div className="max-w-3xl animate-slide-up">
      <div className="mb-8">
        <h2 className="font-display font-700 text-3xl text-ink mb-1">Audit Log</h2>
        <p className="font-body text-sm text-ink-muted">
          A permanent record of everything eliminated.
        </p>
      </div>

      {/* Summary stats */}
      {!loading && logs.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="card flex items-center gap-4">
            <div className="w-9 h-9 rounded-lg bg-assassin-red-light text-assassin-red
                            flex items-center justify-center shrink-0">
              <Trash2 size={18} strokeWidth={2} />
            </div>
            <div>
              <div className="font-display font-700 text-2xl text-ink">
                {totalDeleted.toLocaleString()}
              </div>
              <div className="text-xs font-body text-ink-muted">Total Eliminated</div>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-9 h-9 rounded-lg bg-surface-muted text-ink
                            flex items-center justify-center shrink-0">
              <ScrollText size={18} strokeWidth={2} />
            </div>
            <div>
              <div className="font-display font-700 text-2xl text-ink">{totalRuns}</div>
              <div className="text-xs font-body text-ink-muted">Total Runs</div>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      {logs.length > 0 && (
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            className="input pl-8"
            placeholder="Search runs, rules..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Log list */}
      {loading ? (
        <div className="card py-16 text-center text-sm text-ink-faint">Loading...</div>
      ) : filtered.length === 0 ? (
        <EmptyState hasLogs={logs.length > 0} />
      ) : (
        <div className="space-y-3">
          {filtered.map(log => (
            <LogCard
              key={log.id}
              log={log}
              isExpanded={!!expanded[log.id]}
              onToggle={() => toggleExpand(log.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function LogCard({ log, isExpanded, onToggle }) {
  const date = new Date(log.run_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const statusColor = STATUS_COLORS[log.status] ?? STATUS_COLORS.completed
  const rules = log.rules_applied ?? []

  return (
    <div className="card overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-body font-medium text-sm text-ink">
              {log.run_label ?? 'Manual Run'}
            </span>
            <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${statusColor}`}>
              {log.status}
            </span>
          </div>
          <div className="text-xs font-mono text-ink-faint">{date}</div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <div className="font-display font-700 text-lg text-assassin-red">
              −{(log.total_deleted ?? 0).toLocaleString()}
            </div>
            <div className="text-xs font-body text-ink-faint">emails</div>
          </div>
          {rules.length > 0 && (
            <button
              onClick={onToggle}
              className="w-7 h-7 rounded-lg hover:bg-surface-hover flex items-center
                         justify-center text-ink-muted transition-all"
            >
              {isExpanded
                ? <ChevronUp size={14} strokeWidth={2} />
                : <ChevronDown size={14} strokeWidth={2} />}
            </button>
          )}
        </div>
      </div>

      {/* Breakdown */}
      {isExpanded && rules.length > 0 && (
        <div className="mt-4 pt-4 border-t border-surface-border space-y-2 animate-fade-in">
          <p className="text-xs font-mono text-ink-faint uppercase tracking-widest mb-3">
            Rule Breakdown
          </p>
          {rules.map((rule, i) => {
            const Icon = ACTION_ICONS[rule.action ?? rule.rule_type] ?? Trash2
            return (
              <div key={i}
                className="flex items-center justify-between py-2 border-b border-surface-border last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-md bg-surface-muted flex items-center justify-center shrink-0">
                    <Icon size={12} className="text-ink-muted" strokeWidth={2} />
                  </div>
                  <span className="text-xs font-body text-ink truncate">
                    {rule.rule_name ?? rule.name ?? 'Rule'}
                  </span>
                </div>
                <span className="text-xs font-mono text-assassin-red font-medium shrink-0 ml-4">
                  −{(rule.emails_deleted ?? 0).toLocaleString()}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function EmptyState({ hasLogs }) {
  return (
    <div className="card flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 bg-surface-muted rounded-2xl flex items-center justify-center mb-4">
        <ScrollText size={24} className="text-ink-faint" strokeWidth={1.5} />
      </div>
      <h3 className="font-display font-600 text-lg text-ink mb-2">
        {hasLogs ? 'No results found' : 'No runs yet'}
      </h3>
      <p className="font-body text-sm text-ink-muted max-w-xs leading-relaxed">
        {hasLogs
          ? 'Try a different search term.'
          : 'Every cleanup run will appear here with a full breakdown.'}
      </p>
    </div>
  )
}
