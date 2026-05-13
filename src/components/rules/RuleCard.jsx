import { useState } from 'react'
import { supabase } from '../../lib/supabase'

const ACTION_LABELS = {
  trash: 'Trash',
  move: 'Move',
  mark_read: 'Mark Read',
  unsubscribe_delete: 'Unsubscribe + Delete',
  create_and_move: 'Create Label + Move',
}

const TARGET_LABELS = {
  sender: 'From',
  domain: 'Domain',
  age: 'Older than',
  keyword: 'Subject contains',
  label: 'Label',
  newsletter: 'Newsletters',
}

export default function RuleCard({ rule, onDelete, onEdit, onToggleAuto }) {
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

  function describeRule() {
    const targetLabel = TARGET_LABELS[rule.target_type] || rule.target_type
    const actionLabel = ACTION_LABELS[rule.action] || rule.action
    if (rule.target_type === 'age') {
      return `${targetLabel} ${rule.target_value} days → ${actionLabel}`
    }
    if (rule.target_type === 'newsletter') {
      return `Newsletters → ${actionLabel}`
    }
    return `${targetLabel}: ${rule.target_value} → ${actionLabel}`
  }

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-4 flex items-start justify-between gap-4 group hover:border-gray-200 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-ink text-sm truncate">{rule.name}</span>
          {isAuto && (
            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full border border-amber-200">
              <span>⚡</span> Auto
            </span>
          )}
        </div>
        <p className="text-gray-500 text-xs truncate">{describeRule()}</p>
        {rule.destination_label && (
          <p className="text-gray-400 text-xs mt-0.5">→ {rule.destination_label}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Auto/Manual toggle */}
        <button
          onClick={handleAutoToggle}
          disabled={toggling}
          title={isAuto ? 'Click to set Manual' : 'Click to set Auto'}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
            isAuto ? 'bg-amber-400' : 'bg-gray-200'
          } ${toggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
              isAuto ? 'translate-x-4' : 'translate-x-1'
            }`}
          />
        </button>

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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
