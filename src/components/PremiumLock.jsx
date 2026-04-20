import { Lock, Crown } from 'lucide-react'

function PremiumLock({ onUpgrade }) {
  return (
    <div className="absolute inset-0 bg-[var(--color-background)]/80 backdrop-blur-sm rounded-[var(--radius-card)] flex flex-col items-center justify-center gap-3 z-10">
      <div className="w-12 h-12 rounded-full bg-[var(--color-surface-raised)] flex items-center justify-center">
        <Lock className="w-6 h-6 text-[var(--color-muted)]" />
      </div>
      <div className="text-center px-4">
        <p className="text-sm font-medium text-[var(--color-foreground)]">Premium Course</p>
        <p className="text-xs text-[var(--color-muted)] mt-1">Upgrade to unlock</p>
      </div>
      {onUpgrade && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onUpgrade()
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-[var(--color-foreground)] text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          <Crown className="w-4 h-4" />
          Upgrade
        </button>
      )}
    </div>
  )
}

export default PremiumLock
