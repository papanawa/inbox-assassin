import { useState } from 'react'
import { X, Crosshair } from 'lucide-react'
import ScanProgress from './ScanProgress'
import SenderHitList from './SenderHitList'
import AdvisorProposals from './AdvisorProposals'

const STAGES = { IDLE: 'idle', SCANNING: 'scanning', HITLIST: 'hitlist', ANALYZING: 'analyzing', PROPOSALS: 'proposals' }

export default function InboxAdvisor({ getGmailToken, onRulesCreated, onClose }) {
  const [stage, setStage] = useState(STAGES.IDLE)
  const [senders, setSenders] = useState([])
  const [selected, setSelected] = useState([])
  const [proposals, setProposals] = useState([])
  const [scanTotal, setScanTotal] = useState(0)

  const handleScan = async () => {
    setStage(STAGES.SCANNING)
    const token = await getGmailToken()
    if (!token) {
      alert('Gmail session expired. Please sign out and sign back in.')
      setStage(STAGES.IDLE)
      return
    }

    try {
      const r = await fetch('/api/gmail/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: token, maxMessages: 300 }),
      })
      const data = await r.json()
      setSenders(data.senders ?? [])
      setScanTotal(data.total ?? 0)
      setSelected(data.senders?.map(s => s.email) ?? []) // select all by default
      setStage(STAGES.HITLIST)
    } catch {
      alert('Scan failed. Please try again.')
      setStage(STAGES.IDLE)
    }
  }

  const handleAnalyze = async () => {
    const selectedSenders = senders.filter(s => selected.includes(s.email))
    if (!selectedSenders.length) return
    setStage(STAGES.ANALYZING)

    try {
      const r = await fetch('/api/advisor/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senders: selectedSenders }),
      })
      const data = await r.json()
      setProposals(data.proposals ?? [])
      setStage(STAGES.PROPOSALS)
    } catch {
      alert('Analysis failed. Please try again.')
      setStage(STAGES.HITLIST)
    }
  }

  const handleCreateRules = (acceptedProposals) => {
    onRulesCreated(acceptedProposals)
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 bg-ink/40 z-40 animate-fade-in" onClick={
        stage === STAGES.IDLE ? onClose : undefined
      } />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-slide-up overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-surface-border shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-ink flex items-center justify-center">
                <Crosshair size={16} className="text-assassin-red" strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="font-display font-700 text-base text-ink">AI Inbox Advisor</h2>
                <p className="text-xs font-body text-ink-muted">
                  {stage === STAGES.IDLE && 'Scan your inbox to discover what to clean up'}
                  {stage === STAGES.SCANNING && 'Scanning your recent emails...'}
                  {stage === STAGES.HITLIST && `Found ${senders.length} senders across ${scanTotal} emails`}
                  {stage === STAGES.ANALYZING && 'Claude is analyzing your selections...'}
                  {stage === STAGES.PROPOSALS && `${proposals.length} rules proposed`}
                </p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-surface-hover flex items-center justify-center text-ink-muted">
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {stage === STAGES.IDLE && <IdleState onScan={handleScan} />}
            {stage === STAGES.SCANNING && <ScanProgress />}
            {stage === STAGES.HITLIST && (
              <SenderHitList
                senders={senders}
                selected={selected}
                onToggle={(email) => setSelected(prev =>
                  prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
                )}
                onToggleAll={() => setSelected(
                  selected.length === senders.length ? [] : senders.map(s => s.email)
                )}
                onAnalyze={handleAnalyze}
              />
            )}
            {stage === STAGES.ANALYZING && <AnalyzingState count={selected.length} />}
            {stage === STAGES.PROPOSALS && (
              <AdvisorProposals
                proposals={proposals}
                onCreateRules={handleCreateRules}
                onBack={() => setStage(STAGES.HITLIST)}
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function IdleState({ onScan }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="w-16 h-16 bg-ink rounded-2xl flex items-center justify-center mb-5">
        <Crosshair size={28} className="text-assassin-red" strokeWidth={2} />
      </div>
      <h3 className="font-display font-700 text-xl text-ink mb-2">
        What's cluttering your inbox?
      </h3>
      <p className="font-body text-sm text-ink-muted leading-relaxed max-w-sm mb-8">
        Let Claude scan your recent emails, identify the top senders, and suggest exactly what to clean up — no guessing required.
      </p>
      <div className="space-y-2 text-left w-full max-w-xs mb-8">
        {['Scans your 300 most recent emails', 'Groups by sender with real subject lines', 'Claude proposes rules — you approve them'].map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-ink flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-mono">{i + 1}</span>
            </div>
            <span className="text-xs font-body text-ink-muted">{step}</span>
          </div>
        ))}
      </div>
      <button onClick={onScan}
        className="bg-assassin-red text-white font-body font-medium text-sm px-8 py-3
                   rounded-xl hover:bg-assassin-red-hover transition-all cursor-crosshair
                   flex items-center gap-2">
        <Crosshair size={15} strokeWidth={2.5} />
        Scan My Inbox
      </button>
    </div>
  )
}

function AnalyzingState({ count }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="w-12 h-12 bg-ink rounded-2xl flex items-center justify-center mb-4 animate-pulse">
        <Crosshair size={20} className="text-assassin-red animate-spin" strokeWidth={2} />
      </div>
      <h3 className="font-display font-700 text-lg text-ink mb-2">Analyzing {count} senders...</h3>
      <p className="text-sm font-body text-ink-muted">Claude is deciding the best cleanup action for each one.</p>
    </div>
  )
}
