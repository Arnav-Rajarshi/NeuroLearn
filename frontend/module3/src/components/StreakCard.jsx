const MESSAGES = [
  "You're building consistency. Keep going!",
  "Every day counts. Don't break the chain!",
  "Small steps, big progress. Stay focused!",
  "Your future self will thank you. Keep learning!",
]

function StreakCard({ streak }) {
  const message = MESSAGES[streak % MESSAGES.length]

  return (
    <div
      className="glow-streak animate-fade-in-up"
      style={{
        borderRadius: 'var(--radius-card)',
        border: '1px solid oklch(0.65 0.2 260 / 0.45)',
        background:
          'linear-gradient(135deg, oklch(0.65 0.2 260 / 0.14) 0%, oklch(0.65 0.18 160 / 0.08) 100%)',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
      }}
    >
      {/* Flame */}
      <span
        style={{
          fontSize: '2.4rem',
          lineHeight: 1,
          userSelect: 'none',
          filter: 'drop-shadow(0 0 8px oklch(0.7 0.15 50 / 0.6))',
        }}
        role="img"
        aria-label="flame"
      >
        🔥
      </span>

      {/* Text */}
      <div>
        <p
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.05rem',
            fontWeight: 700,
            color: 'var(--color-foreground)',
            letterSpacing: '-0.01em',
          }}
        >
          Study Streak:{' '}
          <span style={{ color: 'var(--color-primary)' }}>
            {streak} {streak === 1 ? 'Day' : 'Days'}
          </span>
        </p>
        <p
          style={{
            fontSize: '0.82rem',
            color: 'var(--color-muted)',
            marginTop: '3px',
          }}
        >
          {message}
        </p>
      </div>

      {/* Decorative sparkle badge */}
      <div
        style={{
          marginLeft: 'auto',
          background: 'oklch(0.65 0.2 260 / 0.18)',
          border: '1px solid oklch(0.65 0.2 260 / 0.35)',
          borderRadius: '0.6rem',
          padding: '0.3rem 0.75rem',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'var(--color-primary)',
          whiteSpace: 'nowrap',
        }}
      >
        🌟 Keep it up!
      </div>
    </div>
  )
}

export default StreakCard
