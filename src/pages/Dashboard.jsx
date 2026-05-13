import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Crosshair, ListChecks, Trash2, ScrollText, ArrowRight, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import RunGate from '../components/run/RunGate'
import RunProgress from '../components/run/RunProgress'
import RunSummary from '../components/run/RunSummary'
import InboxAdvisor from '../components/advisor/InboxAdvisor'

const RUN_STATE = { IDLE: 'idle', GATE: 'gate', RUNNING: 'running', SUMMARY: 'summary' }

export default function Dashboard() {
  const { user, displayName, getGmailToken, loading: authLoading } = useAuth()
  const [stats, setStats] = useState({ rules: 0, runs: 0, deleted: 0 })
  const [recentLogs, setRecentLogs] = useState([])
  const [activeRules, setActiveRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [runState, setRunState] = useState(RUN_STATE.IDLE)
  const [runConfig, setRunConfig] = useState(null)
  const [runResults, setRunResults] = useState(null)
  const [showAdvisor, setShowAdvisor] = useState(false)


  useEffect(() => {
    if (!user) {
      if (!authLoading) setLoading(false)
      return
    }
    fetchData()
  }, [user, authLoading])

  const fetchData = async () => {
    try {
      const [rulesRes, logsRes] = await Promise.all([
        supabase.from('rules').select('*').eq('user_id', user.id).eq('is_active', true),
        supabase.from('deletion_logs').select('*').eq('user_id', user.id)
          .order('run_at', { ascending: false }).limit(5),
      ])
      const rules = rulesRes.data ?? []
      const logs = logsRes.data ?? []
      setActiveRules(rules)
      setStats({
        rules: rules.length,
        runs: logs.length,
        deleted: logs.reduce((sum, l) => sum + (l.total_deleted ?? 0), 0),
      })
      setRecentLogs(logs)
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRunConfirm = async (config) => {
    const token = await getGmailToken()
    if (!token) {
      alert('Gmail session expired. Please sign out and sign back in.')
      setRunState(RUN_STATE.IDLE)
      return
    }
    setRunConfig({ ...config, gmailToken: token })
    setRunState(RUN_STATE.RUNNING)
  }

  const handleRunComplete = async (results) => {
    setRunResults(results)
    setRunState(RUN_STATE.SUMMARY)
    const totalDeleted = results.reduce((sum, r) => sum + (r.succeeded ?? 0), 0)
    await supabase.from('deletion_logs').insert({
      user_id: user.id,
      run_label: runConfig?.mode === 'batch' ? `Batch Run (${runConfig.batchSize})` : 'Full Run',
      total_deleted: totalDeleted,
      rules_applied: results.map(r => ({
        rule_id: r.rule.id, rule_name: r.rule.name, emails_deleted: r.succeeded ?? 0,
      })),
      status: 'completed',
    })
    for (const r of results) {
      await supabase.from('rules')
        .update({ run_count: (r.rule.run_count ?? 0) + 1, last_run_at: new Date().toISOString() })
        .eq('id', r.rule.id)
    }
    await fetchData()
  }

  const handleAdvisorRules = async (rules) => {
    for (const rule of rules) {
      await supabase.from('rules').insert({ ...rule, user_id: user.id })
    }
    await fetchData()
  }

  const firstName = displayName?.split(' ')[0] ?? 'Operative'
  const hasRules = activeRules.length > 0

  return (
    <div className="max-w-4xl animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="font-display font-700 text-3xl text-ink mb-1">
            Welcome back, {firstName}.
          </h2>
          <p className="font-body text-sm text-ink-muted">Your inbox is waiting for orders.</p>
        </div>
        {hasRules && (
          <button
            onClick={() => setRunState(RUN_STATE.GATE)}
            className="flex items-center gap-2 bg-assassin-red text-white font-body font-medium
                       text-sm px-5 py-2.5 rounded-lg hover:bg-assassin-red-hover
                       transition-all duration-200 cursor-crosshair"
          >
            <Crosshair size={15} strokeWidth={2.5} />
            Run Cleanup
          </button>
        )}
      </div>

      {/* AI Advisor hero card — primary entry point */}
      <div className="card border-ink mb-6 bg-ink text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-48 h-48 opacity-5">
          <Crosshair size={192} strokeWidth={0.5} />
        </div>
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} className="text-assassin-red" strokeWidth={2} />
              <span className="text-xs font-mono text-white/60 uppercase tracking-widest">AI Inbox Advisor</span>
            </div>
            <h3 className="font-display font-700 text-xl text-white mb-1">
              Not sure what to clean?
            </h3>
            <p className="text-sm font-body text-white/70 leading-relaxed max-w-sm">
              Let Claude scan your inbox, show you what's cluttering it, and build the rules for you.
            </p>
          </div>
          <button
            onClick={() => setShowAdvisor(true)}
            className="shrink-0 flex items-center gap-2 bg-assassin-red text-white font-body
                       font-medium text-sm px-5 py-2.5 rounded-lg hover:bg-assassin-red-hover
                       transition-all cursor-crosshair whitespace-nowrap"
          >
            <Crosshair size={14} strokeWidth={2.5} />
            Scan My Inbox
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Active Rules" value={loading ? '—' : stats.rules}
          icon={<ListChecks size={18} strokeWidth={2} />} color="ink" />
        <StatCard label="Emails Eliminated" value={loading ? '—' : stats.deleted.toLocaleString()}
          icon={<Trash2 size={18} strokeWidth={2} />} color="red" />
        <StatCard label="Runs Completed" value={loading ? '—' : stats.runs}
          icon={<Crosshair size={18} strokeWidth={2} />} color="ink" />
      </div>

      {/* Recent activity */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-600 text-base text-ink">Recent Activity</h3>
          <Link to="/audit" className="text-xs font-body text-ink-muted hover:text-ink flex items-center gap-1 transition-colors">
            View all <ArrowRight size={12} />
          </Link>
        </div>
        {loading ? (
          <div className="py-8 text-center text-sm text-ink-faint font-body">Loading...</div>
        ) : recentLogs.length === 0 ? (
          <div className="py-8 text-center">
            <div className="w-10 h-10 bg-surface-muted rounded-full flex items-center justify-center mx-auto mb-3">
              <Crosshair size={18} className="text-ink-faint" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-body text-ink-muted">No runs yet.</p>
            <p className="text-xs font-body text-ink-faint mt-1">Hit Scan My Inbox to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-border">
            {recentLogs.map(log => <LogRow key={log.id} log={log} />)}
          </div>
        )}
      </div>

      {/* AI Advisor */}
      {showAdvisor && (
        <InboxAdvisor
          getGmailToken={getGmailToken}
          onRulesCreated={handleAdvisorRules}
          onClose={() => setShowAdvisor(false)}
        />
      )}

      {/* Run Gate */}
      {runState === RUN_STATE.GATE && (
        <RunGate rules={activeRules} getGmailToken={getGmailToken}
          onConfirm={handleRunConfirm} onClose={() => setRunState(RUN_STATE.IDLE)} />
      )}

      {/* Run Progress */}
      {runState === RUN_STATE.RUNNING && runConfig && (
        <RunProgress
          selectedRules={runConfig.selectedRules}
          mode={runConfig.mode}
          batchSize={runConfig.batchSize}
          gmailToken={runConfig.gmailToken}
          getGmailToken={getGmailToken}
          onComplete={handleRunComplete}
        />
      )}

      {/* Run Summary */}
      {runState === RUN_STATE.SUMMARY && runResults && (
        <RunSummary
          results={runResults}
          mode={runConfig?.mode}
          batchSize={runConfig?.batchSize}
          onNextBatch={() => setRunState(RUN_STATE.GATE)}
          onClose={() => setRunState(RUN_STATE.IDLE)}
        />
      )}
    </div>
  )
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className="card flex items-start gap-4">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
        color === 'red' ? 'bg-assassin-red-light text-assassin-red' : 'bg-surface-muted text-ink'
      }`}>{icon}</div>
      <div>
        <div className="font-display font-700 text-2xl text-ink">{value}</div>
        <div className="text-xs font-body text-ink-muted">{label}</div>
      </div>
    </div>
  )
}

function LogRow({ log }) {
  const date = new Date(log.run_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  return (
    <div className="py-3 flex items-center justify-between">
      <div>
        <div className="text-sm font-body font-medium text-ink">{log.run_label ?? 'Manual Run'}</div>
        <div className="text-xs font-mono text-ink-faint">{date}</div>
      </div>
      <div className="text-right">
        <div className="text-sm font-body font-medium text-assassin-red">
          −{(log.total_deleted ?? 0).toLocaleString()} emails
        </div>
        <div className={`text-xs font-mono ${log.status === 'completed' ? 'text-ink-faint' : 'text-amber-500'}`}>
          {log.status}
        </div>
      </div>
    </div>
  )
}
