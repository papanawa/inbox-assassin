import { useState } from 'react'
import { Loader2, Zap, Check } from 'lucide-react'
import { buildQuery } from '../../lib/gmail'

const EXAMPLES = [
  'Delete all emails from Groupon older than 30 days',
  'Move QuickBooks receipts to a new folder called Receipts',
  'Trash newsletters I haven\'t opened in 60 days',
  'Mark all promotional emails as read',
  'Delete everything from @marketing.example.com',
]

export default function NaturalLanguage({ getGmailToken, onRuleReady }) {
  const [text, setText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parsed, setParsed] = useState(null)
  const [count, setCount] = useState(null)
  const [counting, setCounting] = useState(false)
  const [error, setError] = useState('')

  const handleParse = async () => {
    if (!text.trim()) return
    setParsing(true)
    setError('')
    setParsed(null)
    setCount(null)

    try {
      const r = await fetch('/api/rules/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await r.json()
      if (data.error) throw new Error(data.error)
      setParsed(data.rule)

      // Get live count
      const query = buildQuery(data.rule)
      if (query) {
        setCounting(true)
        try {
          const token = await getGmailToken()
          if (token) {
            const cr = await fetch('/api/gmail/estimate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accessToken: token, query }),
            })
            const cd = await cr.json()
            setCount(cd.count ?? 0)
          }
        } catch { /* silent */ }
        setCounting(false)
      }
    } catch (err) {
      setError('Couldn\'t parse that instruction. Try being more specific.')
    }
    setParsing(false)
  }

  const handleConfirm = () => {
    if (!parsed) return
    onRuleReady({
      ...parsed,
      config: { ...parsed.config, estimated_count: count, description: parsed.description },
    })
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Input */}
      <div>
        <label className="block text-xs font-body font-medium text-ink-muted mb-1.5">
          Describe what you want to clean up
        </label>
        <textarea
          className="input resize-none h-24"
          placeholder="e.g. Delete all promotional emails older than 60 days"
          value={text}
          onChange={e => { setText(e.target.value); setParsed(null); setError('') }}
          onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleParse() }}
        />
        <p className="text-xs text-ink-faint mt-1.5 font-body">⌘ + Enter to parse</p>
      </div>

      {/* Examples */}
      <div>
        <p className="text-xs font-body font-medium text-ink-muted mb-2">Examples</p>
        <div className="flex flex-col gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => { setText(ex); setParsed(null) }}
              className="text-left text-xs font-body text-ink-muted hover:text-ink 
                         px-3 py-2 rounded-lg hover:bg-surface-hover transition-all"
            >
              "{ex}"
            </button>
          ))}
        </div>
      </div>

      {/* Parse button */}
      <button
        onClick={handleParse}
        disabled={!text.trim() || parsing}
        className={`btn-primary flex items-center justify-center gap-2 ${
          !text.trim() || parsing ? 'opacity-40 cursor-not-allowed' : ''
        }`}
      >
        {parsing
          ? <><Loader2 size={14} className="animate-spin" /> Parsing...</>
          : <><Zap size={14} /> Parse Rule</>
        }
      </button>

      {/* Error */}
      {error && (
        <p className="text-xs font-body text-assassin-red bg-assassin-red-light rounded-lg p-3">
          {error}
        </p>
      )}

      {/* Parsed result */}
      {parsed && (
        <div className="bg-surface-muted rounded-xl p-4 space-y-3 animate-slide-up">
          <div className="flex items-center justify-between">
            <span className="text-xs font-body font-medium text-ink">Parsed rule</span>
            <div className="flex items-center gap-1.5 text-xs font-mono">
              {counting
                ? <><Loader2 size={11} className="animate-spin text-ink-faint" /> counting...</>
                : count != null
                  ? <span className={count > 0 ? 'text-assassin-red font-medium' : 'text-ink-faint'}>
                      ~{count.toLocaleString()} emails
                    </span>
                  : null
              }
            </div>
          </div>

          <div className="space-y-1.5">
            <Row label="Name" value={parsed.name} />
            <Row label="Target" value={`${parsed.rule_type}`} />
            <Row label="Action" value={parsed.action?.replace(/_/g, ' ')} />
            <Row label="Description" value={parsed.description} />
          </div>

          <button
            onClick={handleConfirm}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <Check size={14} />
            Use This Rule
          </button>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex gap-2">
      <span className="text-xs font-mono text-ink-faint w-20 shrink-0">{label}</span>
      <span className="text-xs font-body text-ink">{value}</span>
    </div>
  )
}
