import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import { Zap, Clock, TrendingUp } from 'lucide-react'
import { generateCompactVelocityData } from '../utils/metrics'

const PRIMARY = '#7B6BDE'
const ACCENT  = '#3DC98A'

/* ── Custom tooltip ───────────────────────────────────────── */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const hours = payload.find((p) => p.dataKey === 'hours')
  const sma   = payload.find((p) => p.dataKey === 'sma')
  return (
    <div
      style={{
        background: 'var(--color-surface-raised)',
        border:     '1px solid var(--color-border)',
        borderRadius: '0.6rem',
        padding: '0.5rem 0.85rem',
        boxShadow: '0 6px 20px oklch(0 0 0 / 0.4)',
      }}
    >
      <p style={{ color: 'var(--color-muted)', fontSize: '0.7rem', marginBottom: '3px' }}>{label}</p>
      {hours && (
        <p style={{ color: PRIMARY, fontWeight: 700, fontSize: '0.82rem', margin: '1px 0' }}>
          {hours.value}h studied
        </p>
      )}
      {sma && (
        <p style={{ color: ACCENT, fontSize: '0.75rem', margin: '1px 0' }}>
          SMA(5): {sma.value}h
        </p>
      )}
    </div>
  )
}

/* ── Main component ───────────────────────────────────────── */
function CompactVelocityChart({ totalStudyTimeHours, todaysStudyTimeHours }) {
  const data = generateCompactVelocityData(totalStudyTimeHours, todaysStudyTimeHours)

  const avgDaily  = totalStudyTimeHours / 30
  const PER_COL   = 52               // px per data column
  const chartW    = data.length * PER_COL
  const CHART_H   = 148

  return (
    <div className="dashboard-card animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
      {/* Heading */}
      <div className="card-heading">
        <Zap size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
        Learning Velocity
        <span
          style={{
            marginLeft: 'auto',
            fontSize: '0.7rem',
            color: 'var(--color-muted)',
            fontFamily: 'var(--font-sans)',
            fontWeight: 400,
          }}
        >
          Scroll → for history
        </span>
      </div>

      {/* Stat chips row */}
      <div
        style={{
          display: 'flex',
          gap: '0.65rem',
          flexWrap: 'wrap',
          marginBottom: '0.85rem',
        }}
      >
        <div className="stat-chip">
          <TrendingUp size={13} style={{ color: 'var(--color-muted)' }} />
          <span style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>Avg Daily</span>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: PRIMARY }}>
            {avgDaily.toFixed(1)}h
          </span>
        </div>
        <div className="stat-chip">
          <Clock size={13} style={{ color: 'var(--color-muted)' }} />
          <span style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>Today</span>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: ACCENT }}>
            {todaysStudyTimeHours.toFixed(1)}h
          </span>
        </div>
        {/* SMA legend pill */}
        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.7rem',
            color: 'var(--color-muted)',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 20,
              height: 2,
              background: ACCENT,
              borderRadius: 2,
            }}
          />
          5-day SMA
        </div>
      </div>

      {/* ── Horizontally scrollable chart ─────────────────── */}
      <div
        style={{
          overflowX: 'auto',
          overflowY: 'hidden',
          /* Custom minimal scrollbar */
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--color-border) transparent',
          borderRadius: '0.5rem',
          cursor: 'grab',
        }}
        /* Scroll to the right end on mount so "today" is visible */
        ref={(el) => el && setTimeout(() => (el.scrollLeft = el.scrollWidth), 50)}
      >
        {/* Fixed-width inner — wider than viewport → enables scroll */}
        <div style={{ width: `${chartW}px`, height: `${CHART_H}px`, minWidth: '100%' }}>
          <ComposedChart
            width={chartW}
            height={CHART_H}
            data={data}
            margin={{ top: 4, right: 12, left: -22, bottom: 4 }}
          >
            <defs>
              <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={PRIMARY} stopOpacity={0.7} />
                <stop offset="100%" stopColor={PRIMARY} stopOpacity={0.3} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="4 4"
              stroke="oklch(0.30 0.02 260)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fill: 'oklch(0.55 0.02 260)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval={6}   // show every 7th label to avoid crowding
            />
            <YAxis
              tick={{ fill: 'oklch(0.55 0.02 260)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}h`}
              domain={[0, 'auto']}
              width={32}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: `${PRIMARY}12` }}
            />

            {/* Study hours bars */}
            <Bar
              dataKey="hours"
              radius={[3, 3, 0, 0]}
              maxBarSize={22}
              isAnimationActive
            >
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={
                    index === data.length - 1
                      ? ACCENT          /* today → accent green */
                      : 'url(#barFill)'
                  }
                  opacity={entry.hours === 0 ? 0.15 : 1}
                />
              ))}
            </Bar>

            {/* SMA line */}
            <Line
              dataKey="sma"
              stroke={ACCENT}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: ACCENT }}
              type="monotone"
              isAnimationActive
              animationDuration={1000}
            />
          </ComposedChart>
        </div>
      </div>

      <p
        style={{
          fontSize: '0.68rem',
          color: 'var(--color-muted)',
          marginTop: '0.4rem',
          textAlign: 'right',
        }}
      >
        Bars = daily hours · Green bar = today · Green line = 5-day moving avg
      </p>
    </div>
  )
}

export default CompactVelocityChart
