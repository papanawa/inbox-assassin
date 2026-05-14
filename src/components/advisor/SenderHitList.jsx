// src/components/advisor/SenderHitList.jsx
// Uses InboxAdvisor's external selection state via props.
// Props: senders, selected (array of emails), onToggle, onToggleAll, onAnalyze

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
          {sender.subjects?.slice(0, 2).map((s, i) => (
            <span key={i} className="text-xs text-gray-400 truncate max-w-[180px]">· {s}</span>
          ))}
        </div>
      </div>
    </label>
  )
}

export default function SenderHitList({ senders, selected, onToggle, onToggleAll, onAnalyze }) {
  if (!senders?.length) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm px-6">
        No senders found. Try scanning your inbox again.
      </div>
    )
  }

  const newsletters = senders.filter(s => s.hasUnsubscribe)
  const regular = senders.filter(s => !s.hasUnsubscribe)
  const selectedCount = selected.length
  const allSelected = selectedCount === senders.length

  function toggleSection(list) {
    const emails = list.map(s => s.email)
    const allSectionSelected = emails.every(e => selected.includes(e))
    emails.forEach(email => {
      const isSelected = selected.includes(email)
      if (allSectionSelected && isSelected) onToggle(email)
      else if (!allSectionSelected && !isSelected) onToggle(email)
    })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">

        {newsletters.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-ink">⚡ Unsubscribe Candidates</h3>
                <p className="text-xs text-gray-400 mt-0.5">These support one-click unsubscribe.</p>
              </div>
              <button onClick={() => toggleSection(newsletters)} className="text-xs text-gray-400 hover:text-ink transition-colors">
                {newsletters.every(s => selected.includes(s.email)) ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="space-y-2">
              {newsletters.map(sender => (
                <SenderRow key={sender.email} sender={sender} selected={selected.includes(sender.email)} onToggle={onToggle} />
              ))}
            </div>
          </div>
        )}

        {regular.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-ink">All Senders</h3>
              <button onClick={() => toggleSection(regular)} className="text-xs text-gray-400 hover:text-ink transition-colors">
                {regular.every(s => selected.includes(s.email)) ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="space-y-2">
              {regular.map(sender => (
                <SenderRow key={sender.email} sender={sender} selected={selected.includes(sender.email)} onToggle={onToggle} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 px-6 py-4 border-t border-gray-100 bg-white">
        <div className="flex items-center justify-between mb-3">
          <button onClick={onToggleAll} className="text-xs text-gray-400 hover:text-ink transition-colors">
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
          <span className="text-xs text-gray-400">{selectedCount} of {senders.length} selected</span>
        </div>
        <button
          onClick={onAnalyze}
          disabled={selectedCount === 0}
          className="w-full bg-assassin-red text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-700 transition-colors"
        >
          {selectedCount === 0 ? 'Select senders to analyze' : `Analyze ${selectedCount} sender${selectedCount !== 1 ? 's' : ''} →`}
        </button>
      </div>
    </div>
  )
}
