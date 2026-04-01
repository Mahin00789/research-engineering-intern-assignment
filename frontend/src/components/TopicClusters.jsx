import { useEffect, useState } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { getClusters } from '../lib/api'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
                 '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#a78bfa',
                 '#0ea5e9', '#d946ef', '#22d3ee', '#fb923c', '#4ade80',
                 '#e879f9', '#38bdf8', '#fbbf24', '#f87171', '#a3e635']

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div className="rounded-lg p-3 text-sm border max-w-xs" style={{ background: '#1a1d2e', borderColor: '#2e3154' }}>
      <p className="font-semibold mb-1" style={{ color: '#e2e8f0' }}>{d.title}</p>
      <p style={{ color: '#94a3b8' }}>Author: u/{d.author}</p>
      <p style={{ color: '#94a3b8' }}>Score: {d.score}</p>
      <p style={{ color: COLORS[d.cluster_id % COLORS.length] }}>Cluster {d.cluster_id + 1}</p>
    </div>
  )
}

export default function TopicClusters() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [nClusters, setNclusters] = useState(5)
  const [pending, setPending] = useState(5)

  const load = (n) => {
    setLoading(true)
    getClusters(n)
      .then(setResult)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(nClusters) }, [])

  const handleApply = () => {
    setNclusters(pending)
    load(pending)
  }

  return (
    <div className="rounded-xl p-5 border" style={{ background: '#1a1d2e', borderColor: '#2e3154' }}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>
            Topic Clusters
          </p>
          <p className="text-sm" style={{ color: '#64748b' }}>
            KMeans on sentence embeddings · PCA 2D projection
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm" style={{ color: '#94a3b8' }}>Clusters:</label>
          <input
            type="range"
            min={2}
            max={20}
            value={pending}
            onChange={e => setPending(Number(e.target.value))}
            className="w-28 accent-indigo-500"
          />
          <span className="text-sm font-bold w-4" style={{ color: '#6366f1' }}>{pending}</span>
          <button
            onClick={handleApply}
            disabled={loading}
            className="px-3 py-1 rounded-lg text-sm font-medium transition-all"
            style={{ background: '#6366f1', color: 'white', opacity: loading ? 0.6 : 1 }}
          >
            Apply
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center" style={{ color: '#64748b' }}>
          Clustering posts...
        </div>
      ) : result ? (
        <>
          {/* Scatter plot */}
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <XAxis dataKey="x" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} name="PC1" />
              <YAxis dataKey="y" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} name="PC2" />
              <Tooltip content={<CustomTooltip />} />
              <Scatter data={result.points} isAnimationActive={false}>
                {result.points.map((p, i) => (
                  <Cell key={i} fill={COLORS[p.cluster_id % COLORS.length]} fillOpacity={0.8} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>

          <p className="text-xs mb-4" style={{ color: '#64748b' }}>
            Variance explained by 2 PCA components: {result.variance_explained}%
          </p>

          {/* Cluster cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            {result.clusters.map((c) => (
              <div
                key={c.cluster_id}
                className="rounded-lg p-3 border"
                style={{ background: '#232640', borderColor: COLORS[c.cluster_id % COLORS.length] + '44' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: COLORS[c.cluster_id % COLORS.length] }}
                  />
                  <p className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>
                    Cluster {c.cluster_id + 1}
                    <span className="ml-2 text-xs font-normal" style={{ color: '#64748b' }}>
                      {c.size} posts
                    </span>
                  </p>
                </div>

                {/* Keywords */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {c.keywords.map(kw => (
                    <span
                      key={kw}
                      className="px-2 py-0.5 rounded-full text-xs"
                      style={{
                        background: COLORS[c.cluster_id % COLORS.length] + '22',
                        color: COLORS[c.cluster_id % COLORS.length],
                        border: '1px solid ' + COLORS[c.cluster_id % COLORS.length] + '44'
                      }}
                    >
                      {kw}
                    </span>
                  ))}
                </div>

                {/* AI description */}
                {c.description && (
                  <p className="text-xs leading-relaxed" style={{ color: '#94a3b8' }}>
                    {c.description}
                  </p>
                )}

                <p className="text-xs mt-2" style={{ color: '#64748b' }}>
                  Avg score: {c.avg_score} · Avg comments: {c.avg_comments}
                </p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p style={{ color: '#64748b' }}>No cluster data available.</p>
      )}
    </div>
  )
}