import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Crosshair, ListChecks, Trash2, ScrollText, ArrowRight, Zap } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import RunGate from '../components/run/RunGate'
import RunProgress from '../components/run/RunProgress'
import RunSummary from '../components/run/RunSummary'

const RUN_STATE = { IDLE: 'idle', GATE: 'gate', RUNNING: 'running', SUMMARY: 'summary' }

export default function Dashboard() {
  const { user, getGmailToken } = useAuth()
  const [stats, setStats] = useState({ rules: 0, runs: 0, deleted: 0 })
  const [recentLogs, setRecentLogs] = useState([])
  const [activeRules, setActiveRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [runState, setRunState] = useState(RUN_STATE.IDLE)
  const [runConfig, setRunConfig] = useState(null)
  const [runResults, setRunResults] = useState(null)

  useEffect(() => {
    if (!user) return
    fetchData()
  }, [user])

  const fetchData = async () => {
    try {
      const [rulesRes, logsRes] = await Promise.all([
        supabase.from('rules').select('*').eq('user_id', user.id).eq('is_active', true),
        supabase.from('deletion_logs').select('*').eq('user_id', user.id)
          .order('run_at', { ascending: false }).limit(5),
      ])
      const rules = rulesRes.data ?? []
      const logs = logsRes.data ?? []
      const totalDeleted = logs.reduce((sum, l) => sum + (l.total_deleted ?? 0), 0)
      setActiveRules(rules)
      setStats({ rules: rules.length, runs: logs.length, deleted: totalDeleted })
      setRecentLogs(logs)
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRunConfirm = (config) => {
    setRunConfig(config)
    setRunState(RUN_STATE.RUNNING)
  }

  const handleRunComplete = async (results) => {
    setRunResults(results)
    setRunState(RUN_STATE.SUMMARY)

    // Log to Supabase
    const totalDeleted = results.reduce((sum, r) => sum + (r.succeeded ?? 0), 0)
    await supabase.from('deletion_logs').insert({
      user_id: user.id,
      run_label: runConfig?.mode === 'batch' ? `Batch Run (${runConfig.batchSize})` : 'Full Run',
      total_deleted: totalDeleted,
      rules_applied: results.map(r => ({
        rule_id: r.rule.id,
        rule_name: r.rule.name,
        emails_deleted: r.succeeded ?? 0,
      })),
      status: 'completed',
    })

    // Update rule run_count
    for (const r of results) {
      await supabase.from('rules')
        .update({ run_count: (r.rule.run_count ?? 0) + 1, last_run_at: new Date().toISOString() })
        .eq('id', r.rule.id)
    }

    await fetchData()
  }

  const handleNextBatch = () => {
    setRunState(RUN_STATE.GATE)
    setRunResults(null)
  }

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? 'Operative'

  return (
    <div className="max-w-4xl animate-slide-up">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="font-display font-700 text-3xl text-ink mb-1">
            Welcome back, {firstName}.
          </h2>
          <p className="font-body text-sm text-ink-muted">Your inbox is waiting for orders.</p>
        </div>

        {/* Run button */}
        {activeRules.length > 0 && (
          <button
            onClick={() => setRunState(RUN_STATE.GATE)}
            className="flex items-center gap-2 bg-assassin-red text-white font-body font-medium
                       text-sm px-5 py-2.5 rounded-lg hover:bg-assassin-red-hover
                       transition-all duration-200 cursor-crosshair animate-pulse-red"
          >
            <Crosshair size={15} strokeWidth={2.5} />
            Run Cleanup
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Active Rules" value={loading ? '—' : stats.rules}
          icon={<ListChecks size={18} strokeWidth={2} />} color="ink" />
        <StatCard label="Emails Eliminated" value={loading ? '—' : stats.deleted.toLocaleString()}
          icon={<Trash2 size={18} strokeWidth={2} />} color="red" />
        <StatCard label="Runs Completed" value={loading ? '—' : stats.runs}
          icon={<Crosshair size={18} strokeWidth={2} />} color="ink" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <ActionCard to="/rules" icon={<Zap size={20} strokeWidth={2} />}
          title="Build a Rule" description="Target a sender, domain, age, or keyword." primary />
        <ActionCard to="/audit" icon={<ScrollText size={20} strokeWidth={2} />}
          title="View Audit Log" description="See every deletion run and what was removed." />
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
            <p className="text-xs font-body text-ink-faint mt-1">
              {activeRules.length > 0 ? 'Hit Run Cleanup to start.' : 'Head to Rules to set up your first target.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-surface-border">
            {recentLogs.map(log => <LogRow key={log.id} log={log} />)}
          </div>
        )}
      </div>

      {/* Run Gate */}
      {runState === RUN_STATE.GATE && (
        <RunGate
          rules={activeRules}
          getGmailToken={getGmailToken}
          onConfirm={handleRunConfirm}
          onClose={() => setRunState(RUN_STATE.IDLE)}
        />
      )}

      {/* Run Progress */}
      {runState === RUN_STATE.RUNNING && runConfig && (
        <RunProgress
          selectedRules={runConfig.selectedRules}
          mode={runConfig.mode}
          batchSize={runConfig.batchSize}
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
          onNextBatch={handleNextBatch}
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

function ActionCard({ to, icon, title, description, primary }) {
  return (
    <Link to={to}
      className={`card group hover:border-ink-muted transition-all duration-200 no-underline ${primary ? 'border-ink' : ''}`}
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${
        primary ? 'bg-ink text-white' : 'bg-surface-muted text-ink'
      }`}>{icon}</div>
      <div className="font-display font-600 text-sm text-ink mb-1">{title}</div>
      <div className="text-xs font-body text-ink-muted leading-relaxed">{description}</div>
      <div className="flex items-center gap-1 mt-3 text-xs font-body text-ink-faint group-hover:text-ink transition-colors">
        Go <ArrowRight size={11} />
      </div>
    </Link>
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
