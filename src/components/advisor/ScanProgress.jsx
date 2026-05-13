import { useEffect, useState } from 'react'
import { Crosshair } from 'lucide-react'

const MESSAGES = [
  'Pulling recent emails...',
  'Reading sender information...',
  'Grouping by sender...',
  'Finding the clutter...',
  'Almost there...',
]

export default function ScanProgress() {
  const [msgIndex, setMsgIndex] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const msgInterval = setInterval(() => {
      setMsgIndex(prev => Math.min(prev + 1, MESSAGES.length - 1))
    }, 2500)

    const progInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + Math.random() * 8, 92))
    }, 400)

    return () => { clearInterval(msgInterval); clearInterval(progInterval) }
  }, [])

  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      {/* Animated crosshair */}
      <div className="relative w-20 h-20 mb-6">
        <div className="absolute inset-0 rounded-full border-2 border-surface-border" />
        <div className="absolute inset-0 rounded-full border-2 border-assassin-red border-t-transparent animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Crosshair size={24} className="text-ink" strokeWidth={1.5} />
        </div>
      </div>

      <h3 className="font-display font-700 text-lg text-ink mb-2">Scanning inbox</h3>
      <p className="text-sm font-body text-ink-muted mb-6 h-5 transition-all">
        {MESSAGES[msgIndex]}
      </p>

      {/* Progress bar */}
      <div className="w-64 h-1.5 bg-surface-border rounded-full overflow-hidden">
        <div
          className="h-full bg-ink rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs font-mono text-ink-faint mt-2">{Math.round(progress)}%</p>
    </div>
  )
}
