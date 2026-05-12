import { useState, useEffect } from 'react'
import { Plus, ListChecks } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import RuleCard from '../components/rules/RuleCard'
import NewRulePanel from '../components/rules/NewRulePanel'

export default function Rules() {
  const { user, getGmailToken } = useAuth()
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPanel, setShowPanel] = useState(false)
  const [editingRule, setEditingRule] = useState(null)

  useEffect(() => {
    if (!user) return
    fetchRules()
  }, [user])

  const fetchRules = async () => {
    try {
      const { data, error } = await supabase
        .from('rules')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) console.error('Rules fetch error:', error)
      setRules(data ?? [])
    } catch (err) {
      console.error('Rules fetch failed:', err)
      setRules([])
    } finally {
      setLoading(false)
    }
  }

  const handleSaveRule = async (ruleData) => {
    const payload = {
      name: ruleData.name,
      rule_type: ruleData.rule_type,
      config: ruleData.config ?? {},
      action: ruleData.action ?? 'trash',
      action_config: { label: ruleData.config?.action_label ?? '' },
      is_active: true,
    }

    if (editingRule) {
      await supabase
        .from('rules')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editingRule.id)
    } else {
      await supabase
        .from('rules')
        .insert({ ...payload, user_id: user.id })
    }
    await fetchRules()
    setShowPanel(false)
    setEditingRule(null)
  }

  const handleDeleteRule = async (ruleId) => {
    await supabase.from('rules').delete().eq('id', ruleId)
    setRules(prev => prev.filter(r => r.id !== ruleId))
  }

  const handleToggleRule = async (ruleId, isActive) => {
    await supabase.from('rules').update({ is_active: isActive }).eq('id', ruleId)
    setRules(prev => prev.map(r => r.id === ruleId ? { ...r, is_active: isActive } : r))
  }

  const openNew = () => { setEditingRule(null); setShowPanel(true) }
  const openEdit = (rule) => { setEditingRule(rule); setShowPanel(true) }

  const activeRules = rules.filter(r => r.is_active)
  const inactiveRules = rules.filter(r => !r.is_active)

  return (
    <div className="max-w-3xl animate-slide-up">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="font-display font-700 text-3xl text-ink mb-1">Rules</h2>
          <p className="font-body text-sm text-ink-muted">
            {rules.length > 0
              ? `${activeRules.length} active rule${activeRules.length !== 1 ? 's' : ''} · ${rules.length} total`
              : 'Each rule defines a target. Stack them up before you run.'
            }
          </p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus size={15} strokeWidth={2.5} />
          New Rule
        </button>
      </div>

      {loading ? (
        <div className="card py-16 text-center text-sm text-ink-faint font-body">Loading rules...</div>
      ) : rules.length === 0 ? (
        <EmptyState onNew={openNew} />
      ) : (
        <div className="space-y-4">
          {activeRules.length > 0 && (
            <section>
              <p className="text-xs font-mono text-ink-faint mb-3 uppercase tracking-widest">Active · {activeRules.length}</p>
              <div className="space-y-3">
                {activeRules.map(rule => (
                  <RuleCard key={rule.id} rule={rule} onEdit={openEdit} onDelete={handleDeleteRule} onToggle={handleToggleRule} />
                ))}
              </div>
            </section>
          )}
          {inactiveRules.length > 0 && (
            <section>
              <p className="text-xs font-mono text-ink-faint mb-3 mt-6 uppercase tracking-widest">Inactive · {inactiveRules.length}</p>
              <div className="space-y-3">
                {inactiveRules.map(rule => (
                  <RuleCard key={rule.id} rule={rule} onEdit={openEdit} onDelete={handleDeleteRule} onToggle={handleToggleRule} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {showPanel && (
        <NewRulePanel
          rule={editingRule}
          getGmailToken={getGmailToken}
          onSave={handleSaveRule}
          onClose={() => { setShowPanel(false); setEditingRule(null) }}
        />
      )}
    </div>
  )
}

function EmptyState({ onNew }) {
  return (
    <div className="card flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 bg-surface-muted rounded-2xl flex items-center justify-center mb-4">
        <ListChecks size={24} className="text-ink-faint" strokeWidth={1.5} />
      </div>
      <h3 className="font-display font-600 text-lg text-ink mb-2">No rules yet</h3>
      <p className="font-body text-sm text-ink-muted max-w-xs leading-relaxed mb-6">
        Build your first rule using the form builder, type a command, or chat with AI.
      </p>
      <button onClick={onNew} className="btn-primary flex items-center gap-2">
        <Plus size={14} strokeWidth={2.5} />
        Create first rule
      </button>
    </div>
  )
}
