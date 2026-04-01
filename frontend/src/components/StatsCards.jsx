import { useEffect, useState } from 'react'
import { getStats } from '../lib/api'

const StatCard = ({ label, value, sub, color = '#6366f1' }) => (
  <div className="rounded-xl p-5 border" style={{ background: '#1a1d2e', borderColor: '#2e3154' }}>
    <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#94a3b8' }}>
      {label}
    </p>
    <p className="text-3xl font-bold mb-1" style={{ color }}>
      {value ?? '—'}
    </p>
    {sub && <p className="text-xs" style={{ color: '#64748b' }}>{sub}</p>}
  </div>
)

export default function StatsCards() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-xl p-5 border animate-pulse h-28"
          style={{ background: '#1a1d2e', borderColor: '#2e3154' }} />
      ))}
    </div>
  )

  if (!stats) return null

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        label="Total Posts"
        value={stats.total_posts}
        sub={`${stats.date_range_start} → ${stats.date_range_end}`}
        color="#6366f1"
      />
      <StatCard
        label="Unique Authors"
        value={stats.unique_authors}
        sub={`Top: u/${stats.top_author}`}
        color="#8b5cf6"
      />
      <StatCard
        label="Avg Score"
        value={stats.avg_score}
        sub={`${stats.total_comments} total comments`}
        color="#10b981"
      />
      <StatCard
        label="Unique Domains"
        value={stats.unique_domains}
        sub={`Top: ${stats.top_domain}`}
        color="#f59e0b"
      />
    </div>
  )
}