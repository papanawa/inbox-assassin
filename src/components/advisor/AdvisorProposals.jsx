import { useState } from 'react'
import { Check, X, Trash2, FolderInput, BookmarkCheck, ArrowLeft, Crosshair, Pencil } from 'lucide-react'

const ACTIONS = [
  { id: 'trash',            label: 'Delete',              icon: Trash2 },
  { id: 'create_and_move',  label: 'Create folder + Move', icon: FolderInput },
  { id: 'mark_read',        label: 'Mark as read',         icon: BookmarkCheck },
]

const ACTION_COLORS = {
  trash:            'text-assassin-red bg-assassin-red-light',
  create_and_move:  'text-blue-600 bg-blue-50',
  mark_read:        'text-amber-600 bg-amber-50',
}

export default function AdvisorProposals({ proposals, onCreateRules, onBack }) {
  const [items, setItems] = useState(proposals.map((p, i) => ({ ...p, accepted: true, id: i })))
  const [editing, setEditing] = useState(null) // index of item being edited

  const acceptedItems = items.filter(p => p.accepted)

  const toggleAccept = (i) => {
    setItems(prev => prev.map((p, idx) => idx === i ? { ...p, accepted: !p.accepted } : p))
  }

  const updateItem = (i, updates) => {
    setItems(prev => prev.map((p, idx) => idx === i ? { ...p, ...updates } : p))
  }

  const handleCreate = () => {
    const rules = acceptedItems.map(p => ({
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
    }))
    onCreateRules(rules)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Subheader */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-surface-border bg-surface-muted shrink-0">
        <button onClick={onBack}
          className="flex items-center gap-1 text-xs font-body text-ink-muted hover:text-ink transition-colors">
          <ArrowLeft size={12} /> Back
        </button>
        <span className="text-xs font-body text-ink-muted">
          {acceptedItems.length} of {items.length} rules accepted
        </span>
      </div>

      {/* Proposals */}
      <div className="flex-1 overflow-y-auto divide-y divide-surface-border">
        {items.map((proposal, i) => (
          <ProposalCard
            key={i}
            proposal={proposal}
            isEditing={editing === i}
            onToggleAccept={() => toggleAccept(i)}
            onEdit={() => setEditing(editing === i ? null : i)}
            onUpdate={(updates) => { updateItem(i, updates); setEditing(null) }}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-surface-border shrink-0">
        <button
          onClick={handleCreate}
          disabled={acceptedItems.length === 0}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm
                     font-body font-medium transition-all cursor-crosshair ${
            acceptedItems.length > 0
              ? 'bg-assassin-red text-white hover:bg-assassin-red-hover'
              : 'bg-surface-border text-ink-faint cursor-not-allowed'
          }`}
        >
          <Check size={14} strokeWidth={2.5} />
          Create {acceptedItems.length} Rule{acceptedItems.length !== 1 ? 's' : ''}
        </button>
      </div>
    </div>
  )
}

function ProposalCard({ proposal, isEditing, onToggleAccept, onEdit, onUpdate }) {
  const [editName, setEditName] = useState(proposal.rule_name)
  const [editAction, setEditAction] = useState(proposal.action)
  const [editLabel, setEditLabel] = useState(proposal.action_config?.label ?? '')

  const ActionIcon = ACTIONS.find(a => a.id === proposal.action)?.icon ?? Trash2
  const actionColor = ACTION_COLORS[proposal.action] ?? ACTION_COLORS.trash
  const needsLabel = proposal.action === 'create_and_move' || proposal.action === 'move'

  const handleSave = () => {
    onUpdate({
      rule_name: editName,
      action: editAction,
      action_config: { label: editLabel },
      description: proposal.description,
    })
  }

  return (
    <div className={`px-6 py-4 transition-all ${!proposal.accepted ? 'opacity-40' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Accept toggle */}
        <button
          onClick={onToggleAccept}
          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5
                     transition-all ${proposal.accepted
                       ? 'bg-ink text-white'
                       : 'border-2 border-surface-border'
                     }`}
        >
          {proposal.accepted && <Check size={12} strokeWidth={2.5} />}
        </button>

        <div className="flex-1 min-w-0">
          {!isEditing ? (
            /* View mode */
            <>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-sm font-body font-medium text-ink">{proposal.rule_name}</span>
                <span className={`flex items-center gap-1 text-xs font-body font-medium px-2 py-0.5 rounded-full ${actionColor}`}>
                  <ActionIcon size={10} strokeWidth={2} />
                  {ACTIONS.find(a => a.id === proposal.action)?.label ?? proposal.action}
                </span>
                {proposal.action_config?.label && (
                  <span className="text-xs font-mono text-ink-faint">→ {proposal.action_config.label}</span>
                )}
              </div>
              <p className="text-xs font-body text-ink-muted leading-relaxed mb-1.5">
                {proposal.description}
              </p>
              <div className="flex items-center gap-3">
                <div className="flex items-start gap-1.5">
                  <Crosshair size={10} className="text-assassin-red shrink-0 mt-0.5" strokeWidth={2} />
                  <p className="text-xs font-body text-ink-faint italic leading-relaxed">
                    {proposal.reasoning}
                  </p>
                </div>
              </div>
              <div className="mt-1.5">
                <span className="text-xs font-mono text-assassin-red font-medium">
                  {proposal.count} emails
                </span>
              </div>
            </>
          ) : (
            /* Edit mode */
            <div className="space-y-3 py-1 animate-fade-in">
              <div>
                <label className="block text-xs font-body text-ink-muted mb-1">Rule name</label>
                <input className="input text-xs"
                  value={editName}
                  onChange={e => setEditName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-body text-ink-muted mb-1">Action</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {ACTIONS.map(({ id, label, icon: Icon }) => (
                    <button key={id} onClick={() => setEditAction(id)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-center
                                 transition-all text-xs font-body ${
                        editAction === id
                          ? 'border-ink bg-ink text-white'
                          : 'border-surface-border hover:border-ink-muted text-ink-muted'
                      }`}
                    >
                      <Icon size={12} strokeWidth={2} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {(editAction === 'create_and_move' || editAction === 'move') && (
                <div className="animate-fade-in">
                  <label className="block text-xs font-body text-ink-muted mb-1">
                    {editAction === 'create_and_move' ? 'New folder name' : 'Existing label'}
                  </label>
                  <input className="input text-xs"
                    placeholder="e.g. Finance"
                    value={editLabel}
                    onChange={e => setEditLabel(e.target.value)} />
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={handleSave}
                  className="flex-1 py-2 bg-ink text-white text-xs font-body rounded-lg
                             hover:bg-ink-muted transition-all">
                  Save
                </button>
                <button onClick={() => { setEditName(proposal.rule_name); setEditAction(proposal.action); onEdit() }}
                  className="px-3 py-2 border border-surface-border text-xs font-body rounded-lg
                             text-ink-muted hover:bg-surface-hover transition-all">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {!isEditing && (
            <button onClick={onEdit}
              className="w-6 h-6 rounded-md hover:bg-surface-hover flex items-center
                         justify-center text-ink-faint hover:text-ink transition-all">
              <Pencil size={11} strokeWidth={2} />
            </button>
          )}
          <button onClick={onToggleAccept}
            className="w-6 h-6 rounded-md hover:bg-surface-hover flex items-center
                       justify-center text-ink-faint hover:text-assassin-red transition-all">
            <X size={12} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  )
}
