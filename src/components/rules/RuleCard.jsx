import { useState } from 'react'
import { Pencil, Trash2, Mail, Clock, Tag, Globe, Type, Newspaper, Zap } from 'lucide-react'
import { ruleToEnglish, actionToEnglish } from '../../lib/gmail'

const TYPE_ICONS = {
  sender: Mail, domain: Globe, age: Clock,
  keyword: Type, label: Tag, newsletter: Newspaper,
}

const ACTION_COLORS = {
  trash: 'badge-red', move: 'badge-gray', mark_read: 'badge-gray',
  unsubscribe_delete: 'badge-red', create_and_move: 'badge-gray',
}

export default function RuleCard({ rule, onEdit, onDelete, onToggle, onToggleAuto }) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const Icon = TYPE_ICONS[rule.rule_type] ?? Mail
  const actionColor = ACTION_COLORS[rule.action ?? 'trash'] ?? 'badge-gray'

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete(rule.id)
    } else {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3000)
    }
  }

  return (
    <div className={`card transition-all duration-200 ${!rule.is_active ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="w-9 h-9 rounded-lg bg-surface-muted flex items-center justify-center shrink-0 mt-0.5">
          <Icon size={16} className="text-ink-muted" strokeWidth={2} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display font-600 text-sm text-ink">{rule.name}</span>
              <span className={actionColor}>{actionToEnglish(rule.action)}</span>
              {rule.config?.estimated_count != null && (
                <span className="text-xs font-mono text-ink-faint">
                  ~{rule.config.estimated_count.toLocaleString()} emails
                </span>
              )}
            </div>

            {/* Active toggle */}
            <button
              onClick={() => onToggle(rule.id, !rule.is_active)}
              className={`w-9 h-5 rounded-full flex items-center shrink-0 transition-colors duration-200 ${
                rule.is_active ? 'bg-ink' : 'bg-surface-border'
              }`}
            >
              <div className={`w-3.5 h-3.5 bg-white rounded-full mx-0.5 transition-transform duration-200 ${
                rule.is_active ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </button>
          </div>

          <p className="text-xs font-body text-ink-muted leading-relaxed">
            {rule.config?.description ?? ruleToEnglish(rule)}
          </p>

          {/* Auto badge */}
          {rule.is_auto && (
            <div className="flex items-center gap-1 mt-1.5">
              <Zap size={10} className="text-amber-500" strokeWidth={2.5} />
              <span className="text-xs font-mono text-amber-500">Auto-run enabled</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions row */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-surface-border">
        {/* Auto toggle */}
        <button
          onClick={() => onToggleAuto(rule.id, !rule.is_auto)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-body
                     transition-all ${rule.is_auto
                       ? 'bg-amber-50 text-amber-600 border border-amber-200'
                       : 'text-ink-muted hover:text-ink hover:bg-surface-hover'
                     }`}
          title={rule.is_auto ? 'Disable auto-run' : 'Enable auto-run'}
        >
          <Zap size={11} strokeWidth={2.5} />
          {rule.is_auto ? 'Auto' : 'Manual'}
        </button>

        <div className="flex items-center gap-1">
          {rule.run_count > 0 && (
            <span className="text-xs font-mono text-ink-faint mr-2">
              {rule.run_count}× run
            </span>
          )}
          <button
            onClick={() => onEdit(rule)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-body
                       text-ink-muted hover:text-ink hover:bg-surface-hover transition-all"
          >
            <Pencil size={12} strokeWidth={2} />
            Edit
          </button>
          <button
            onClick={handleDelete}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-body
                       transition-all ${confirmDelete
                         ? 'bg-assassin-red text-white'
                         : 'text-ink-muted hover:text-assassin-red hover:bg-assassin-red-light'
                       }`}
          >
            <Trash2 size={12} strokeWidth={2} />
            {confirmDelete ? 'Confirm?' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
