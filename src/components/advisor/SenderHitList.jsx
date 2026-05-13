import { Crosshair, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

export default function SenderHitList({ senders, selected, onToggle, onToggleAll, onAnalyze }) {
  const selectedCount = selected.length

  return (
    <div className="flex flex-col h-full">
      {/* Subheader */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-surface-border bg-surface-muted shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-body text-ink-muted">
            {selectedCount} of {senders.length} selected
          </span>
        </div>
        <button onClick={onToggleAll}
          className="text-xs font-body text-ink-muted hover:text-ink transition-colors">
          {selectedCount === senders.length ? 'Deselect all' : 'Select all'}
        </button>
      </div>

      {/* Sender list */}
      <div className="flex-1 overflow-y-auto divide-y divide-surface-border">
        {senders.map((sender) => (
          <SenderRow
            key={sender.email}
            sender={sender}
            isSelected={selected.includes(sender.email)}
            onToggle={() => onToggle(sender.email)}
          />
        ))}
      </div>

      {/* Footer CTA */}
      <div className="px-6 py-4 border-t border-surface-border shrink-0">
        <button
          onClick={onAnalyze}
          disabled={selectedCount === 0}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm
                     font-body font-medium transition-all cursor-crosshair ${
            selectedCount > 0
              ? 'bg-ink text-white hover:bg-ink-muted'
              : 'bg-surface-border text-ink-faint cursor-not-allowed'
          }`}
        >
          <Crosshair size={14} strokeWidth={2} />
          Analyze {selectedCount} sender{selectedCount !== 1 ? 's' : ''} with Claude
        </button>
      </div>
    </div>
  )
}

function SenderRow({ sender, isSelected, onToggle }) {
  const [expanded, setExpanded] = useState(false)

  // Heat color based on count
  const heat = sender.count >= 50 ? 'high' : sender.count >= 20 ? 'med' : 'low'
  const heatColor = heat === 'high' ? 'text-assassin-red' : heat === 'med' ? 'text-amber-500' : 'text-ink-faint'
  const heatBg = heat === 'high' ? 'bg-assassin-red-light' : heat === 'med' ? 'bg-amber-50' : 'bg-surface-muted'

  return (
    <div className={`transition-all ${isSelected ? 'bg-white' : 'bg-surface-muted/50 opacity-60'}`}>
      <div className="flex items-center gap-3 px-6 py-3">
        {/* Checkbox */}
        <button onClick={onToggle}
          className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
            isSelected ? 'border-ink bg-ink' : 'border-surface-border'
          }`}
        >
          {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
        </button>

        {/* Sender avatar */}
        <div className="w-8 h-8 rounded-full bg-surface-muted border border-surface-border
                        flex items-center justify-center shrink-0">
          <span className="text-xs font-display font-700 text-ink-muted">
            {sender.name?.[0]?.toUpperCase() ?? '?'}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-body font-medium text-ink truncate">{sender.name}</span>
          </div>
          <div className="text-xs font-mono text-ink-faint truncate">{sender.email}</div>
        </div>

        {/* Count badge */}
        <div className={`px-2 py-0.5 rounded-full text-xs font-mono font-medium shrink-0 ${heatColor} ${heatBg}`}>
          {sender.count}
        </div>

        {/* Expand toggle */}
        {sender.subjects?.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-ink-faint hover:text-ink transition-colors shrink-0"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>

      {/* Sample subjects */}
      {expanded && sender.subjects?.length > 0 && (
        <div className="px-6 pb-3 pl-[72px] space-y-1 animate-fade-in">
          {sender.subjects.map((subject, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="w-1 h-1 rounded-full bg-ink-faint mt-1.5 shrink-0" />
              <p className="text-xs font-body text-ink-muted leading-relaxed">{subject}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
