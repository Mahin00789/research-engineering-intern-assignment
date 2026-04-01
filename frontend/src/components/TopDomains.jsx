import { useEffect, useState } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { getDomains } from '../lib/api'

const COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444',
                 '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#a78bfa']

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="rounded-lg p-3 text-sm border" style={{ background: '#1a1d2e', borderColor: '#2e3154' }}>
      <p className="font-semibold" style={{ color: '#e2e8f0' }}>{d.name}</p>
      <p style={{ color: d.payload.fill }}>Posts: <span className="font-bold">{d.value}</span></p>
      <p style={{ color: '#94a3b8' }}>Avg score: {d.payload.avg_score}</p>
    </div>
  )
}

export default function TopDomains() {
  const [domains, setDomains] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDomains(10)
      .then(res => setDomains(res.domains || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const data = domains.map((d, i) => ({
    name: d.domain,
    value: d.count,
    avg_score: d.avg_score,
    fill: COLORS[i % COLORS.length],
  }))

  return (
    <div className="rounded-xl p-5 border" style={{ background: '#1a1d2e', borderColor: '#2e3154' }}>
      <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#94a3b8' }}>
        Top Shared Domains
      </p>

      {loading ? (
        <div className="h-52 flex items-center justify-center" style={{ color: '#64748b' }}>
          Loading...
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              innerRadius={40}
              paddingAngle={3}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => (
                <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                  {value.length > 20 ? value.slice(0, 20) + '…' : value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}