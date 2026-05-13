import { useState, useEffect, useCallback, useRef } from 'react'
import { Mail, Globe, Clock, Type, Tag, Newspaper, Loader2 } from 'lucide-react'
import { buildQuery, ruleToEnglish } from '../../lib/gmail'

const RULE_TYPES = [
  { id: 'sender',     label: 'Sender',     icon: Mail,      desc: 'Specific email address' },
  { id: 'domain',     label: 'Domain',     icon: Globe,     desc: 'All from a domain' },
  { id: 'age',        label: 'Age',        icon: Clock,     desc: 'Older than X days' },
  { id: 'keyword',    label: 'Keyword',    icon: Type,      desc: 'Contains words' },
  { id: 'label',      label: 'Label',      icon: Tag,       desc: 'Has a Gmail label' },
  { id: 'newsletter', label: 'Newsletter', icon: Newspaper, desc: 'Auto-detect newsletters' },
]

const ACTIONS = [
  { id: 'trash',            label: 'Delete',                desc: 'Move to Trash (30-day recovery)', needsLabel: false },
  { id: 'move',             label: 'Move to folder',        desc: 'Move to an existing Gmail label',  needsLabel: true, labelPlaceholder: 'Label name...' },
  { id: 'mark_read',        label: 'Mark as read',          desc: 'Mark all matching emails as read', needsLabel: false },
  { id: 'unsubscribe_delete', label: 'Unsubscribe + Delete', desc: 'Unsubscribe from list, then trash', needsLabel: false },
  { id: 'create_and_move',  label: 'Create folder + Move',  desc: 'Create a new label and move there', needsLabel: true, labelPlaceholder: 'New folder name...' },
]

export default function FormBuilder({ getGmailToken, onRuleReady, initialRule }) {
  const [ruleType, setRuleType] = useState(initialRule?.rule_type ?? '')
  const [config, setConfig] = useState(initialRule?.config ?? {})
  const [action, setAction] = useState(initialRule?.action ?? 'trash')
  const [actionLabel, setActionLabel] = useState(initialRule?.action_config?.label ?? initialRule?.config?.action_label ?? '')
  const [name, setName] = useState(initialRule?.name ?? '')
  const [count, setCount] = useState(null)
  const [counting, setCounting] = useState(false)
  const [samples, setSamples] = useState([])
  const [samplesLoading, setSamplesLoading] = useState(false)
  const [existingLabels, setExistingLabels] = useState([])
  const [labelsLoading, setLabelsLoading] = useState(false)
  const debounceRef = useRef(null)

  const selectedAction = ACTIONS.find(a => a.id === action)

  // Fetch existing labels when move action is selected
  useEffect(() => {
    if (action !== 'move' && action !== 'create_and_move') return
    if (existingLabels.length > 0) return // already fetched
    const fetchLabels = async () => {
      setLabelsLoading(true)
      try {
        const token = await getGmailToken()
        if (!token) return
        const r = await fetch('/api/gmail/labels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken: token }),
        })
        if (r.ok) {
          const data = await r.json()
          setExistingLabels(data.labels ?? [])
        }
      } catch { /* silent */ }
      setLabelsLoading(false)
    }
    fetchLabels()
  }, [action])

  const currentRule = {
    name: name || `${ruleType} rule`,
    rule_type: ruleType,
    config: { ...config, action_label: actionLabel },
    action,
  }

  const query = ruleType ? buildQuery(currentRule) : ''
  const preview = ruleType ? ruleToEnglish(currentRule) : ''

  // Live count + preview samples
  useEffect(() => {
    if (!query) { setCount(null); setSamples([]); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setCounting(true)
      setSamplesLoading(true)
      try {
        const token = await getGmailToken()
        if (!token) { setCounting(false); setSamplesLoading(false); return }
        const [countRes, previewRes] = await Promise.all([
          fetch('/api/gmail/estimate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken: token, query }),
          }),
          fetch('/api/gmail/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken: token, query, maxSamples: 5 }),
          }),
        ])
        const countData = await countRes.json()
        const previewData = await previewRes.json()
        setCount(countData.count ?? 0)
        setSamples(previewData.samples ?? [])
      } catch { setCount(null); setSamples([]) }
      setCounting(false)
      setSamplesLoading(false)
    }, 800)
  }, [query])

  const handleSave = () => {
    if (!ruleType || !name.trim()) return
    onRuleReady({
      name: name.trim(),
      rule_type: ruleType,
      config: { ...config, action_label: actionLabel, estimated_count: count, description: preview },
      action,
    })
  }

  const updateConfig = (key, value) => setConfig(prev => ({ ...prev, [key]: value }))

  const isValid = ruleType && name.trim() && (
    (ruleType === 'sender' && config.email) ||
    (ruleType === 'domain' && config.domain) ||
    (ruleType === 'age' && config.older_than_days) ||
    (ruleType === 'keyword' && config.keywords?.length) ||
    (ruleType === 'label' && config.label) ||
    ruleType === 'newsletter'
  )

  return (
    <div className="flex flex-col gap-5">
      {/* Rule name */}
      <div>
        <label className="block text-xs font-body font-medium text-ink-muted mb-1.5">Rule name</label>
        <input
          className="input"
          placeholder="e.g. Delete Groupon emails"
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </div>

      {/* Target type */}
      <div>
        <label className="block text-xs font-body font-medium text-ink-muted mb-2">Target type</label>
        <div className="grid grid-cols-3 gap-2">
          {RULE_TYPES.map(({ id, label, icon: Icon, desc }) => (
            <button
              key={id}
              onClick={() => { setRuleType(id); setConfig({}) }}
              className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all ${
                ruleType === id
                  ? 'border-ink bg-ink text-white'
                  : 'border-surface-border bg-white hover:border-ink-muted'
              }`}
            >
              <Icon size={14} strokeWidth={2} className={ruleType === id ? 'text-white' : 'text-ink-muted'} />
              <span className={`text-xs font-body font-medium ${ruleType === id ? 'text-white' : 'text-ink'}`}>{label}</span>
              <span className={`text-xs font-body leading-tight ${ruleType === id ? 'text-white/70' : 'text-ink-faint'}`}>{desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic config fields */}
      {ruleType && (
        <div className="animate-fade-in">
          {ruleType === 'sender' && (
            <div>
              <label className="block text-xs font-body font-medium text-ink-muted mb-1.5">Email address</label>
              <input className="input" placeholder="groupon@groupon.com"
                value={config.email ?? ''} onChange={e => updateConfig('email', e.target.value)} />
            </div>
          )}
          {ruleType === 'domain' && (
            <div>
              <label className="block text-xs font-body font-medium text-ink-muted mb-1.5">Domain</label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-ink-muted font-mono">@</span>
                <input className="input" placeholder="promotions.example.com"
                  value={config.domain ?? ''} onChange={e => updateConfig('domain', e.target.value)} />
              </div>
            </div>
          )}
          {ruleType === 'age' && (
            <div>
              <label className="block text-xs font-body font-medium text-ink-muted mb-1.5">Older than</label>
              <div className="flex items-center gap-2">
                <input className="input w-28" type="number" min="1" placeholder="90"
                  value={config.older_than_days ?? ''} onChange={e => updateConfig('older_than_days', parseInt(e.target.value))} />
                <span className="text-sm text-ink-muted font-body">days</span>
              </div>
            </div>
          )}
          {ruleType === 'keyword' && (
            <div>
              <label className="block text-xs font-body font-medium text-ink-muted mb-1.5">Keywords</label>
              <input className="input" placeholder="promo, unsubscribe, offer (comma-separated)"
                value={config.keywords?.join(', ') ?? ''}
                onChange={e => updateConfig('keywords', e.target.value.split(',').map(k => k.trim()).filter(Boolean))} />
              <div className="flex gap-3 mt-2">
                {['any', 'all'].map(m => (
                  <label key={m} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="match" value={m} checked={(config.match ?? 'any') === m}
                      onChange={() => updateConfig('match', m)} className="accent-ink" />
                    <span className="text-xs font-body text-ink-muted">Match {m}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {ruleType === 'label' && (
            <div>
              <label className="block text-xs font-body font-medium text-ink-muted mb-1.5">Gmail label</label>
              <input className="input" placeholder="SPAM, Promotions, etc."
                value={config.label ?? ''} onChange={e => updateConfig('label', e.target.value)} />
            </div>
          )}
          {ruleType === 'newsletter' && (
            <p className="text-xs font-body text-ink-muted bg-surface-muted rounded-lg p-3">
              Auto-detects emails with List-Unsubscribe headers and common newsletter patterns.
            </p>
          )}
        </div>
      )}

      {/* Action — always visible */}
      <div>
        <label className="block text-xs font-body font-medium text-ink-muted mb-2">Action</label>
        <div className="space-y-2">
          {ACTIONS.map(({ id, label, desc }) => (
            <button key={id} onClick={() => setAction(id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                action === id ? 'border-ink bg-ink text-white' : 'border-surface-border bg-white hover:border-ink-muted'
              }`}
            >
              <div className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 ${
                action === id ? 'border-white bg-assassin-red' : 'border-surface-border'
              }`} />
              <div>
                <div className={`text-xs font-body font-medium ${action === id ? 'text-white' : 'text-ink'}`}>{label}</div>
                <div className={`text-xs font-body ${action === id ? 'text-white/70' : 'text-ink-faint'}`}>{desc}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Label input for move/create actions */}
        {selectedAction?.needsLabel && (
          <div className="mt-3 animate-fade-in">
            <label className="block text-xs font-body font-medium text-ink-muted mb-1.5">
              {action === 'move' ? 'Select existing folder' : 'Folder name'}
            </label>

            {/* Existing labels dropdown for move */}
            {action === 'move' && (
              labelsLoading ? (
                <div className="input text-ink-faint">Loading your folders...</div>
              ) : existingLabels.length > 0 ? (
                <select
                  className="input"
                  value={actionLabel}
                  onChange={e => setActionLabel(e.target.value)}
                >
                  <option value="">— Select a folder —</option>
                  {existingLabels.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              ) : (
                <input className="input" placeholder="Label name..."
                  value={actionLabel} onChange={e => setActionLabel(e.target.value)} />
              )
            )}

            {/* Free text for create_and_move — show existing as datalist hints */}
            {action === 'create_and_move' && (
              <div>
                <input
                  className="input"
                  list="existing-labels"
                  placeholder="New folder name (or pick existing)..."
                  value={actionLabel}
                  onChange={e => setActionLabel(e.target.value)}
                />
                <datalist id="existing-labels">
                  {existingLabels.map(l => <option key={l} value={l} />)}
                </datalist>
                <p className="text-xs font-body text-ink-faint mt-1.5">
                  Type a new name or pick an existing folder above.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Live count + preview */}
      {query && (
        <div className="bg-surface-muted rounded-xl p-4 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-body font-medium text-ink-muted">Preview</span>
            <span className="flex items-center gap-1.5 text-xs font-mono">
              {counting
                ? <><Loader2 size={11} className="animate-spin text-ink-faint" /> counting...</>
                : count != null
                  ? <span className={count > 0 ? 'text-assassin-red font-medium' : 'text-ink-faint'}>
                      {count > 0 ? `~${count.toLocaleString()} emails` : '0 emails'}
                    </span>
                  : <span className="text-ink-faint">—</span>
              }
            </span>
          </div>
          <p className="text-xs font-body text-ink leading-relaxed">{preview}</p>

          {/* Sample emails */}
          {samplesLoading && (
            <div className="flex items-center gap-1.5 text-xs text-ink-faint">
              <Loader2 size={11} className="animate-spin" /> Loading samples...
            </div>
          )}
          {!samplesLoading && samples.length > 0 && (
            <div className="space-y-1.5 pt-1 border-t border-surface-border">
              <p className="text-xs font-mono text-ink-faint uppercase tracking-widest">
                Sample matches
              </p>
              {samples.map((s, i) => (
                <div key={i} className="bg-white rounded-lg px-3 py-2 border border-surface-border">
                  <div className="text-xs font-body font-medium text-ink truncate">{s.subject}</div>
                  <div className="text-xs font-mono text-ink-faint truncate mt-0.5">{s.from}</div>
                </div>
              ))}
              {count > samples.length && (
                <p className="text-xs font-body text-ink-faint text-center pt-1">
                  +{(count - samples.length).toLocaleString()} more
                </p>
              )}
            </div>
          )}
          {!samplesLoading && count === 0 && (
            <p className="text-xs font-body text-ink-faint">No emails match this rule yet.</p>
          )}
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={!isValid}
        className={`btn-primary w-full ${!isValid ? 'opacity-40 cursor-not-allowed' : ''}`}
      >
        Save Rule
      </button>
    </div>
  )
}
