import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import { getAuthors } from '../lib/api'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg p-3 text-sm border" style={{ background: '#1a1d2e', borderColor: '#2e3154' }}>
      <p className="font-semibold mb-1" style={{ color: '#e2e8f0' }}>u/{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

export default function TopAuthors() {
  const [authors, setAuthors] = useState([])
  const [loading, setLoading] = useState(true)
  const [metric, setMetric] = useState('post_count')

  useEffect(() => {
    getAuthors(10)
      .then(res => setAuthors(res.authors || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const metrics = [
    { key: 'post_count', label: 'Posts', color: '#6366f1' },
    { key: 'total_score', label: 'Total Score', color: '#10b981' },
    { key: 'total_comments', label: 'Comments', color: '#f59e0b' },
  ]
  const current = metrics.find(m => m.key === metric)

  return (
    <div className="rounded-xl p-5 border" style={{ background: '#1a1d2e', borderColor: '#2e3154' }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#94a3b8' }}>
          Top Authors
        </p>
        <div className="flex gap-2">
          {metrics.map(m => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className="px-2 py-1 rounded text-xs font-medium transition-all"
              style={{
                background: metric === m.key ? m.color + '22' : 'transparent',
                color: metric === m.key ? m.color : '#64748b',
                border: '1px solid',
                borderColor: metric === m.key ? m.color + '55' : '#2e3154',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-52 flex items-center justify-center" style={{ color: '#64748b' }}>
          Loading...
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={authors}
            layout="vertical"
            margin={{ top: 0, right: 10, left: 10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#2e3154" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="author"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={110}
              tickFormatter={v => v.length > 14 ? v.slice(0, 14) + '…' : v}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey={metric} name={current?.label} fill={current?.color} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}