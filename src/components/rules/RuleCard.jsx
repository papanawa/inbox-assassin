import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ruleToEnglish, actionToEnglish } from '../../lib/gmail'

export default function RuleCard({ rule, onDelete, onEdit, onToggle, onToggleAuto }) {
  const [isAuto, setIsAuto] = useState(rule.is_auto || false)
  const [toggling, setToggling] = useState(false)

  async function handleAutoToggle() {
    setToggling(true)
    const newVal = !isAuto
    const { error } = await supabase
      .from('rules')
      .update({ is_auto: newVal })
      .eq('id', rule.id)
    if (!error) {
      setIsAuto(newVal)
      if (onToggleAuto) onToggleAuto(rule.id, newVal)
    }
    setToggling(false)
  }

  const description = ruleToEnglish(rule)
  const actionLabel = actionToEnglish(rule.action)
  const destLabel = rule.action_config?.label

  return (
    <div className="card flex items-start justify-between gap-4 group hover:border-ink/20 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-display font-600 text-sm text-ink truncate">{rule.name}</span>
          {isAuto && (
            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full border border-amber-200">
              ⚡ Auto
            </span>
          )}
          {!rule.is_active && (
            <span className="text-xs text-ink-faint font-mono bg-surface-muted px-2 py-0.5 rounded-full">
              inactive
            </span>
          )}
        </div>

        <p className="text-xs font-body text-ink-muted truncate">{description}</p>

        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            rule.action === 'trash' || rule.action === 'unsubscribe_delete'
              ? 'bg-assassin-red-light text-assassin-red'
              : rule.action === 'mark_read'
              ? 'bg-amber-50 text-amber-700'
              : 'bg-blue-50 text-blue-600'
          }`}>
            {actionLabel}
          </span>
          {destLabel && (
            <span className="text-xs font-mono text-ink-faint">→ {destLabel}</span>
          )}
          {rule.run_count > 0 && (
            <span className="text-xs font-mono text-ink-faint">
              {rule.run_count} run{rule.run_count !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Auto toggle */}
        <button
          onClick={handleAutoToggle}
          disabled={toggling}
          title={isAuto ? 'Auto — click to set Manual' : 'Manual — click to set Auto'}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
            isAuto ? 'bg-amber-400' : 'bg-gray-200'
          } ${toggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
            isAuto ? 'translate-x-4' : 'translate-x-1'
          }`} />
        </button>

        {/* Active toggle */}
        {onToggle && (
          <button
            onClick={() => onToggle(rule.id, !rule.is_active)}
            title={rule.is_active ? 'Disable rule' : 'Enable rule'}
            className="text-xs text-gray-400 hover:text-ink transition-colors px-2 py-1 rounded hover:bg-gray-50"
          >
            {rule.is_active ? 'Disable' : 'Enable'}
          </button>
        )}

        {/* Edit */}
        {onEdit && (
          <button
            onClick={() => onEdit(rule)}
            className="text-gray-400 hover:text-ink transition-colors text-xs px-2 py-1 rounded hover:bg-gray-50"
          >
            Edit
          </button>
        )}

        {/* Delete */}
        {onDelete && (
          <button
            onClick={() => onDelete(rule.id)}
            className="text-gray-300 hover:text-assassin-red transition-colors p-1 rounded hover:bg-red-50"
            title="Delete rule"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
