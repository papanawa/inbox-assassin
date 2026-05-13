// src/components/advisor/SenderHitList.jsx
// Displays grouped sender list from inbox scan.
// Shows newsletter badge for senders with List-Unsubscribe headers.
// Separates unsubscribe candidates into their own section.

import { useState } from 'react'

function NewsletterBadge() {
  return (
    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 text-xs font-medium px-2 py-0.5 rounded-full border border-blue-100">
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
      Newsletter
    </span>
  )
}

function SenderRow({ sender, selected, onToggle }) {
  return (
    <label className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
      selected ? 'bg-red-50 border border-red-100' : 'bg-white border border-gray-100 hover:border-gray-200'
    }`}>
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggle(sender.email)}
        className="mt-0.5 accent-assassin-red shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-ink truncate">{sender.name}</span>
          {sender.hasUnsubscribe && <NewsletterBadge />}
        </div>
        <p className="text-xs text-gray-400 truncate mt-0.5">{sender.email}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs font-semibold text-assassin-red">{sender.count} emails</span>
          {sender.subjects.slice(0, 2).map((s, i) => (
            <span key={i} className="text-xs text-gray-400 truncate max-w-[180px]">· {s}</span>
          ))}
        </div>
      </div>
    </label>
  )
}

export default function SenderHitList({ senders, onAnalyze }) {
  const [selected, setSelected] = useState(new Set())

  if (!senders?.length) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        No senders found. Try scanning your inbox again.
      </div>
    )
  }

  function toggleSender(email) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(email)) next.delete(email)
      else next.add(email)
      return next
    })
  }

  function toggleAll(list) {
    const emails = list.map(s => s.email)
    const allSelected = emails.every(e => selected.has(e))
    setSelected(prev => {
      const next = new Set(prev)
      if (allSelected) emails.forEach(e => next.delete(e))
      else emails.forEach(e => next.add(e))
      return next
    })
  }

  function handleAnalyze() {
    const selectedSenders = senders.filter(s => selected.has(s.email))
    if (selectedSenders.length) onAnalyze(selectedSenders)
  }

  // Split into newsletters (has unsubscribe) and regular
  const newsletters = senders.filter(s => s.hasUnsubscribe)
  const regular = senders.filter(s => !s.hasUnsubscribe)

  const totalSelected = selected.size

  return (
    <div className="space-y-6">

      {/* Unsubscribe Candidates */}
      {newsletters.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-ink" style={{ fontFamily: 'Syne, sans-serif' }}>
                ⚡ Unsubscribe Candidates
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                These senders support one-click unsubscribe. Select and analyze to create rules.
              </p>
            </div>
            <button
              onClick={() => toggleAll(newsletters)}
              className="text-xs text-gray-400 hover:text-ink transition-colors"
            >
              {newsletters.every(s => selected.has(s.email)) ? 'Deselect all' : 'Select all'}
            </button>
          </div>
          <div className="space-y-2">
            {newsletters.map(sender => (
              <SenderRow
                key={sender.email}
                sender={sender}
                selected={selected.has(sender.email)}
                onToggle={toggleSender}
              />
            ))}
          </div>
        </div>
      )}

      {/* Regular senders */}
      {regular.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-ink" style={{ fontFamily: 'Syne, sans-serif' }}>
              All Senders
            </h3>
            <button
              onClick={() => toggleAll(regular)}
              className="text-xs text-gray-400 hover:text-ink transition-colors"
            >
              {regular.every(s => selected.has(s.email)) ? 'Deselect all' : 'Select all'}
            </button>
          </div>
          <div className="space-y-2">
            {regular.map(sender => (
              <SenderRow
                key={sender.email}
                sender={sender}
                selected={selected.has(sender.email)}
                onToggle={toggleSender}
              />
            ))}
          </div>
        </div>
      )}

      {/* Analyze button */}
      <div className="sticky bottom-0 pt-4 pb-2 bg-surface-muted">
        <button
          onClick={handleAnalyze}
          disabled={totalSelected === 0}
          className="w-full bg-assassin-red text-white font-semibold py-3 rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-700 transition-colors"
          style={{ fontFamily: 'Syne, sans-serif' }}
        >
          {totalSelected === 0
            ? 'Select senders to analyze'
            : `Analyze ${totalSelected} sender${totalSelected !== 1 ? 's' : ''} →`}
        </button>
      </div>
    </div>
  )
}
