'use client'
import { motion } from 'framer-motion'
import { fmtN } from '@/lib/metrics'

interface CumPoint {
  day: number
  spent: number
  ideal: number
}

interface CatPoint {
  id: string
  name: string
  color: string
  amt: number
}

export function AreaChart({
  cum,
  budget,
  status,
  daysInMonth,
}: {
  cum: CumPoint[]
  budget: number
  status: string
  daysInMonth: number
}) {
  const W = 520,
    H = 190,
    P = 28
  const maxY = Math.max(budget, ...cum.map((c) => c.spent)) * 1.05
  const x = (d: number) => P + ((d - 1) / Math.max(daysInMonth - 1, 1)) * (W - P * 2)
  const y = (v: number) => H - P - (v / maxY) * (H - P * 2)
  const line = (pts: { day: number; v: number }[]) =>
    pts.map((p, i) => (i ? 'L' : 'M') + x(p.day).toFixed(1) + ' ' + y(p.v).toFixed(1)).join(' ')
  const spentPath = line(cum.map((c) => ({ day: c.day, v: c.spent })))
  const idealPts: { day: number; v: number }[] = []
  for (let d = 1; d <= daysInMonth; d++) idealPts.push({ day: d, v: (budget * d) / daysInMonth })
  const idealPath = line(idealPts)
  const last = cum[cum.length - 1]
  const area = last
    ? spentPath + ` L ${x(last.day)} ${y(0)} L ${x(1)} ${y(0)} Z`
    : ''
  const col =
    status === 'ok' ? 'var(--green)' : status === 'warn' ? 'var(--amber)' : 'var(--red)'

  return (
    <div className="area-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366F1" stopOpacity=".28" />
            <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
          <g key={i}>
            <line
              x1={P}
              x2={W - P}
              y1={y(maxY * t)}
              y2={y(maxY * t)}
              stroke="var(--line)"
              strokeWidth="1"
            />
            <text className="ax" x={P - 6} y={y(maxY * t) + 3} textAnchor="end">
              {Math.round((maxY * t) / 1000)}k
            </text>
          </g>
        ))}
        {area && (
          <motion.path
            d={area}
            fill="url(#ag)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          />
        )}
        <motion.path
          d={idealPath}
          fill="none"
          stroke="var(--faint)"
          strokeWidth="1.6"
          strokeDasharray="5 5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1 }}
        />
        <motion.path
          d={spentPath}
          fill="none"
          stroke="#6366F1"
          strokeWidth="2.4"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
        />
        {last && (
          <motion.circle
            cx={x(last.day)}
            cy={y(last.spent)}
            r="4.5"
            fill={col}
            stroke="var(--card)"
            strokeWidth="2"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1, duration: 0.3 }}
          />
        )}
        <text className="ax" x={P} y={H - 8}>
          Day 1
        </text>
        <text className="ax" x={W - P} y={H - 8} textAnchor="end">
          Day {daysInMonth}
        </text>
      </svg>
      <div className="legend" style={{ flexDirection: 'row', gap: 18, marginTop: 8 }}>
        <div className="li">
          <span className="sw" style={{ background: '#6366F1' }}></span>Actual spend
        </div>
        <div className="li">
          <span className="sw" style={{ background: 'var(--faint)' }}></span>Ideal pace
        </div>
      </div>
    </div>
  )
}

export function Donut({ byCat, total }: { byCat: CatPoint[]; total: number }) {
  const R = 58,
    C = 2 * Math.PI * R
  let acc = 0
  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
      <svg width="150" height="150" viewBox="0 0 150 150">
        <circle cx="75" cy="75" r={R} fill="none" stroke="var(--card-2)" strokeWidth="16" />
        {byCat.map((c, i) => {
          const frac = c.amt / total,
            dash = frac * C,
            off = -acc * C
          acc += frac
          return (
            <motion.circle
              key={c.id}
              cx="75"
              cy="75"
              r={R}
              fill="none"
              stroke={c.color}
              strokeWidth="16"
              strokeDasharray={`${dash} ${C - dash}`}
              strokeDashoffset={off}
              transform="rotate(-90 75 75)"
              strokeLinecap="butt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 * i, duration: 0.5 }}
            />
          )
        })}
        <text
          x="75"
          y="71"
          textAnchor="middle"
          style={{
            fontFamily: 'IBM Plex Mono',
            fontSize: 15,
            fontWeight: 600,
            fill: 'var(--text)',
          }}
        >
          {fmtN(total)}
        </text>
        <text
          x="75"
          y="88"
          textAnchor="middle"
          style={{ fontFamily: 'Poppins', fontSize: 9.5, fill: 'var(--muted)' }}
        >
          KES SPENT
        </text>
      </svg>
      <div className="legend" style={{ flex: 1, minWidth: 160 }}>
        {byCat.map((c) => (
          <div className="li" key={c.id}>
            <span className="sw" style={{ background: c.color }}></span>
            {c.name}
            <span>{Math.round((c.amt / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
