import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

import { TrendingUp } from "lucide-react"

import { generateProgressTrendData } from "../utils/metrics"

// Default progress history for fallback
const DEFAULT_PROGRESS_HISTORY = [
  { week: "Week 1", completed: 1 },
  { week: "Week 2", completed: 3 },
  { week: "Week 3", completed: 2 },
  { week: "Week 4", completed: 4 },
  { week: "Week 5", completed: 6 },
  { week: "Week 6", completed: 8 },
  { week: "Week 7", completed: 7 },
  { week: "Week 8", completed: 10 },
  { week: "Week 9", completed: 11 },
  { week: "Week 10", completed: 8 },
  { week: "Week 11", completed: 12 },
]

const PRIMARY = "#7B6BDE"
const ACCENT = "#3DC98A"


function CustomTooltip({ active, payload, label }) {

  if (!active || !payload?.length) return null

  return (
    <div
      style={{
        background: "var(--color-surface-raised)",
        border: "1px solid var(--color-border)",
        borderRadius: "0.6rem",
        padding: "0.55rem 0.9rem",
        minWidth: "9rem",
      }}
    >
      <p style={{ color: "var(--color-muted)", fontSize: "0.75rem" }}>
        {label}
      </p>

      {payload.map((entry) => (
        <p
          key={entry.dataKey}
          style={{
            color: entry.color,
            fontWeight: 600,
            fontSize: "0.85rem",
          }}
        >
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  )
}



function ProgressTrendGraph({ courses, progressHistory }) {
  // Use provided progressHistory or fallback to default
  const history = progressHistory && progressHistory.length > 0 
    ? progressHistory 
    : DEFAULT_PROGRESS_HISTORY
    
  const data = generateProgressTrendData(courses, history)

  return (

    <div className="dashboard-card">

      <div className="card-heading">
        <TrendingUp size={18} style={{ color: "var(--color-primary)" }} />
        Progress Trend
        <span
          style={{
            marginLeft: "auto",
            fontSize: "0.7rem",
            color: "var(--color-muted)",
          }}
        >
          Topics completed vs target
        </span>
      </div>


      <ResponsiveContainer width="100%" height={260}>

        <ComposedChart data={data}>

          <CartesianGrid
            strokeDasharray="4 4"
            strokeOpacity={0.35}
            vertical={false}
          />

          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip content={<CustomTooltip />} />


          <Line
            type="monotone"
            dataKey="goalProgress"
            name="Goal Target"
            stroke={ACCENT}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
          />


          <Area
            type="monotone"
            dataKey="studentProgress"
            name="Your Progress"
            stroke={PRIMARY}
            strokeWidth={3}
            fillOpacity={0.15}
            fill={PRIMARY}
            dot={{ r: 4, fill: PRIMARY }}
            activeDot={{ r: 6, fill: PRIMARY, stroke: "#fff", strokeWidth: 2 }}
          />

        </ComposedChart>

      </ResponsiveContainer>


      <p
        style={{
          fontSize: "0.7rem",
          color: "var(--color-muted)",
          textAlign: "right",
        }}
      >
        Dashed line = required pace to hit deadline · Solid area = actual progress
      </p>

    </div>
  )
}

export default ProgressTrendGraph
