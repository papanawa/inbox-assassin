import { useEffect } from 'react'
import { X, FormInput, Type, Bot } from 'lucide-react'
import { useState } from 'react'
import FormBuilder from './FormBuilder'
import NaturalLanguage from './NaturalLanguage'
import AIConversation from './AIConversation'

const TABS = [
  { id: 'form',    label: 'Form Builder',      icon: FormInput },
  { id: 'natural', label: 'Natural Language',   icon: Type },
  { id: 'ai',      label: 'AI Conversation',    icon: Bot },
]

export default function NewRulePanel({ rule, getGmailToken, onSave, onClose }) {
  const [tab, setTab] = useState('form')

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleRuleReady = (ruleData) => {
    onSave(ruleData)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/30 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[520px] bg-white z-50 shadow-2xl 
                      flex flex-col animate-slide-up overflow-hidden"
        style={{ animation: 'slideInRight 0.25s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-border shrink-0">
          <div>
            <h2 className="font-display font-700 text-lg text-ink">
              {rule ? 'Edit Rule' : 'New Rule'}
            </h2>
            <p className="text-xs font-body text-ink-muted mt-0.5">
              Define a target and an action.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-surface-hover flex items-center justify-center
                       text-ink-muted hover:text-ink transition-all"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-surface-border shrink-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-body
                          font-medium transition-all border-b-2 ${
                tab === id
                  ? 'border-ink text-ink'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              <Icon size={13} strokeWidth={2} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {tab === 'form' && (
            <FormBuilder
              getGmailToken={getGmailToken}
              onRuleReady={handleRuleReady}
              initialRule={rule}
            />
          )}
          {tab === 'natural' && (
            <NaturalLanguage
              getGmailToken={getGmailToken}
              onRuleReady={handleRuleReady}
            />
          )}
          {tab === 'ai' && (
            <AIConversation
              getGmailToken={getGmailToken}
              onRuleReady={handleRuleReady}
            />
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  )
}
