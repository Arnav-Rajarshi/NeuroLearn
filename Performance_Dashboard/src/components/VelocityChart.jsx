import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts'
import { TrendingUp, Clock, Timer } from 'lucide-react'
import { getAverageDailyStudyTime } from '../utils/metrics'

/**
 * VelocityChart - Learning velocity visualization with daily study hours
 * @param {Object} props
 * @param {Array} props.studyHistory - Array of { day, hours } objects
 * @param {number} props.todaysHours - Today's study time in hours
 */
export default function VelocityChart({ studyHistory = [], todaysHours = 0 }) {
  const avgDailyHours = getAverageDailyStudyTime(studyHistory)

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 shadow-lg">
          <p className="text-sm font-medium text-[var(--color-foreground)]">
            {label}
          </p>
          <p className="text-sm text-[var(--color-primary)]">
            {payload[0].value.toFixed(1)} hours
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="dashboard-card">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="card-heading mb-0">
          <TrendingUp className="w-5 h-5 text-[var(--color-accent)]" />
          Learning Velocity
        </h2>

        {/* Stats chips */}
        <div className="flex gap-3">
          <div className="stat-chip">
            <Clock className="w-4 h-4 text-[var(--color-muted)]" />
            <div>
              <p className="text-xs text-[var(--color-muted)]">Avg/Day</p>
              <p className="text-sm font-semibold text-[var(--color-foreground)]">
                {avgDailyHours.toFixed(1)}h
              </p>
            </div>
          </div>
          <div className="stat-chip">
            <Timer className="w-4 h-4 text-[var(--color-primary)]" />
            <div>
              <p className="text-xs text-[var(--color-muted)]">Today</p>
              <p className="text-sm font-semibold text-[var(--color-primary)]">
                {todaysHours.toFixed(1)}h
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={studyHistory}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="oklch(0.65 0.18 160)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="oklch(0.65 0.18 160)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="oklch(0.30 0.02 260)" 
              vertical={false}
            />
            <XAxis 
              dataKey="day" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'oklch(0.60 0.02 260)', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'oklch(0.60 0.02 260)', fontSize: 12 }}
              tickFormatter={(value) => `${value}h`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="hours"
              stroke="oklch(0.65 0.18 160)"
              strokeWidth={2.5}
              fill="url(#velocityGradient)"
              animationDuration={1500}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
