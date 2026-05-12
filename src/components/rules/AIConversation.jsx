import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Check, Bot, User, Crosshair } from 'lucide-react'
import { buildQuery } from '../../lib/gmail'

const STARTER = `Hey! Tell me what's cluttering your inbox and I'll build the right rules to eliminate it. 

For example: "I get too many promotional emails" or "I want to archive my QuickBooks receipts" or "delete anything from senders I haven't opened in months."`

export default function AIConversation({ getGmailToken, onRuleReady }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [proposedRules, setProposedRules] = useState(null)
  const [counts, setCounts] = useState({})
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, proposedRules])

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMsg = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const r = await fetch('/api/rules/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })
      const data = await r.json()

      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      }

      if (data.proposedRules?.length) {
        setProposedRules(data.proposedRules)
        // Get counts for each proposed rule
        fetchCounts(data.proposedRules)
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, something went wrong. Try again.',
      }])
    }
    setLoading(false)
  }

  const fetchCounts = async (rules) => {
    const token = await getGmailToken()
    if (!token) return

    const newCounts = {}
    await Promise.all(rules.map(async (rule, i) => {
      const query = buildQuery(rule)
      if (!query) return
      try {
        const r = await fetch('/api/gmail/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken: token, query }),
        })
        const d = await r.json()
        newCounts[i] = d.count ?? 0
      } catch { /* silent */ }
    }))
    setCounts(newCounts)
  }

  const handleConfirmRules = () => {
    if (!proposedRules?.length) return
    proposedRules.forEach((rule, i) => {
      onRuleReady({
        ...rule,
        config: {
          ...rule.config,
          estimated_count: counts[i],
          description: rule.description,
          action_label: rule.action_config?.label,
        },
      })
    })
  }

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Chat area */}
      <div className="flex-1 overflow-y-auto space-y-3 min-h-0 max-h-96 pr-1">
        {/* Starter message */}
        <AIMessage content={STARTER} />

        {messages.map((msg, i) => (
          msg.role === 'user'
            ? <UserMessage key={i} content={msg.content} />
            : <AIMessage key={i} content={msg.content} />
        ))}

        {loading && (
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="w-6 h-6 rounded-full bg-ink flex items-center justify-center shrink-0">
              <Crosshair size={12} className="text-assassin-red" />
            </div>
            <div className="flex gap-1">
              {[0,1,2].map(i => (
                <div key={i} className="w-1.5 h-1.5 bg-ink-faint rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}

        {/* Proposed rules */}
        {proposedRules && (
          <div className="bg-surface-muted rounded-xl p-4 space-y-3 animate-slide-up border border-surface-border">
            <div className="flex items-center gap-2">
              <Crosshair size={14} className="text-assassin-red" />
              <span className="text-xs font-display font-600 text-ink">Proposed Rules</span>
            </div>

            <div className="space-y-2">
              {proposedRules.map((rule, i) => (
                <div key={i} className="bg-white rounded-lg p-3 border border-surface-border">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-body font-medium text-ink">{rule.name}</span>
                    {counts[i] != null && (
                      <span className="text-xs font-mono text-assassin-red">
                        ~{counts[i].toLocaleString()} emails
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-body text-ink-muted leading-relaxed">
                    {rule.description}
                  </p>
                  <div className="mt-1.5">
                    <span className="badge-gray">{rule.action?.replace(/_/g, ' ')}</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleConfirmRules}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Check size={14} />
              Save {proposedRules.length} Rule{proposedRules.length > 1 ? 's' : ''}
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 shrink-0">
        <input
          className="input flex-1"
          placeholder="Tell me what to clean up..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') sendMessage() }}
          disabled={loading}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
            input.trim() && !loading
              ? 'bg-ink text-white hover:bg-ink-muted'
              : 'bg-surface-border text-ink-faint cursor-not-allowed'
          }`}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  )
}

function AIMessage({ content }) {
  return (
    <div className="flex gap-2">
      <div className="w-6 h-6 rounded-full bg-ink flex items-center justify-center shrink-0 mt-0.5">
        <Crosshair size={11} className="text-assassin-red" />
      </div>
      <div className="bg-surface-muted rounded-xl rounded-tl-sm px-3 py-2.5 max-w-xs">
        <p className="text-xs font-body text-ink leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  )
}

function UserMessage({ content }) {
  return (
    <div className="flex gap-2 justify-end">
      <div className="bg-ink rounded-xl rounded-tr-sm px-3 py-2.5 max-w-xs">
        <p className="text-xs font-body text-white leading-relaxed">{content}</p>
      </div>
    </div>
  )
}
