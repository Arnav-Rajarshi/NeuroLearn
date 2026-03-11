function ProgressBar({ progress = 0, showLabel = false, size = 'default' }) {
  const clampedProgress = Math.min(100, Math.max(0, progress))
  
  const heightClasses = {
    small: 'h-1',
    default: 'h-1.5',
    large: 'h-2',
  }

  return (
    <div className="w-full">
      <div className={`progress-bar-track ${heightClasses[size]}`}>
        <div
          className="progress-bar-fill"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-[var(--color-muted)] mt-1">
          {Math.round(clampedProgress)}% complete
        </p>
      )}
    </div>
  )
}

export default ProgressBar
