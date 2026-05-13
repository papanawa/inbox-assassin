import { useState } from 'react'
import { Check, X, Trash2, FolderInput, BookmarkCheck, ArrowLeft, Crosshair } from 'lucide-react'

const ACTION_ICONS = {
  trash: Trash2,
  create_and_move: FolderInput,
  mark_read: BookmarkCheck,
}

const ACTION_LABELS = {
  trash: 'Delete',
  create_and_move: 'Create folder + Move',
  mark_read: 'Mark as read',
}

const ACTION_COLORS = {
  trash: 'text-assassin-red bg-assassin-red-light',
  create_and_move: 'text-blue-600 bg-blue-50',
  mark_read: 'text-amber-600 bg-amber-50',
}

export default function AdvisorProposals({ proposals, onCreateRules, onBack }) {
  const [accepted, setAccepted] = useState(proposals.map((_, i) => i))

  const toggleAccept = (i) => {
    setAccepted(prev =>
      prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
    )
  }

  const handleCreate = () => {
    const rules = accepted.map(i => {
      const p = proposals[i]
      return {
        name: p.rule_name,
        rule_type: p.rule_type ?? 'sender',
        config: {
          ...p.config,
          action_label: p.action_config?.label ?? '',
          description: p.description,
        },
        action: p.action,
        action_config: p.action_config ?? {},
        is_active: true,
      }
    })
    onCreateRules(rules)
  }

  const acceptedCount = accepted.length

  return (
    <div className="flex flex-col h-full">
      {/* Back + subheader */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-surface-border bg-surface-muted shrink-0">
        <button onClick={onBack}
          className="flex items-center gap-1 text-xs font-body text-ink-muted hover:text-ink transition-colors">
          <ArrowLeft size={12} /> Back
        </button>
        <span className="text-xs font-body text-ink-muted">
          {acceptedCount} of {proposals.length} rules accepted
        </span>
      </div>

      {/* Proposals list */}
      <div className="flex-1 overflow-y-auto divide-y divide-surface-border">
        {proposals.map((proposal, i) => {
          const isAccepted = accepted.includes(i)
          const Icon = ACTION_ICONS[proposal.action] ?? Trash2
          const actionColor = ACTION_COLORS[proposal.action] ?? ACTION_COLORS.trash

          return (
            <div key={i} className={`px-6 py-4 transition-all ${!isAccepted ? 'opacity-40' : ''}`}>
              <div className="flex items-start gap-3">
                {/* Accept/reject toggle */}
                <button
                  onClick={() => toggleAccept(i)}
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5
                             transition-all ${isAccepted
                               ? 'bg-ink text-white'
                               : 'border-2 border-surface-border'
                             }`}
                >
                  {isAccepted && <Check size={12} strokeWidth={2.5} />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-body font-medium text-ink">{proposal.rule_name}</span>
                    <span className={`flex items-center gap-1 text-xs font-body font-medium px-2 py-0.5 rounded-full ${actionColor}`}>
                      <Icon size={10} strokeWidth={2} />
                      {ACTION_LABELS[proposal.action] ?? proposal.action}
                    </span>
                    {proposal.action_config?.label && (
                      <span className="text-xs font-mono text-ink-faint">→ {proposal.action_config.label}</span>
                    )}
                  </div>

                  <p className="text-xs font-body text-ink-muted leading-relaxed mb-1.5">
                    {proposal.description}
                  </p>

                  {/* Claude's reasoning */}
                  <div className="flex items-start gap-1.5">
                    <Crosshair size={10} className="text-assassin-red shrink-0 mt-0.5" strokeWidth={2} />
                    <p className="text-xs font-body text-ink-faint italic leading-relaxed">
                      {proposal.reasoning}
                    </p>
                  </div>

                  {/* Email count */}
                  <div className="mt-1.5">
                    <span className="text-xs font-mono text-assassin-red font-medium">
                      {proposal.count} emails
                    </span>
                  </div>
                </div>

                {/* Reject button */}
                <button
                  onClick={() => toggleAccept(i)}
                  className="text-ink-faint hover:text-assassin-red transition-colors shrink-0"
                  title={isAccepted ? 'Remove' : 'Add back'}
                >
                  <X size={14} strokeWidth={2} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-surface-border shrink-0">
        <button
          onClick={handleCreate}
          disabled={acceptedCount === 0}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm
                     font-body font-medium transition-all cursor-crosshair ${
            acceptedCount > 0
              ? 'bg-assassin-red text-white hover:bg-assassin-red-hover'
              : 'bg-surface-border text-ink-faint cursor-not-allowed'
          }`}
        >
          <Check size={14} strokeWidth={2.5} />
          Create {acceptedCount} Rule{acceptedCount !== 1 ? 's' : ''}
        </button>
      </div>
    </div>
  )
}
