import { useEffect, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts'
import { getTimeseries } from '../lib/api'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg p-3 text-sm border" style={{ background: '#1a1d2e', borderColor: '#2e3154' }}>
      <p className="font-semibold mb-1" style={{ color: '#e2e8f0' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

const EventTooltip = ({ event }) => {
  return (
    <div className="rounded-lg p-3 text-sm border" style={{ background: '#1a1d2e', borderColor: '#f59e0b', width: '220px' }}>
      <p className="font-semibold mb-1" style={{ color: '#f59e0b' }}>{event.title}</p>
      <p style={{ color: '#cbd5e1' }}>{event.description}</p>
      <a href={event.url} target="_blank" rel="noopener noreferrer" className="text-xs mt-2 inline-block" style={{ color: '#818cf8' }}>
        → Read on Wikipedia
      </a>
    </div>
  )
}

export default function TimeSeries() {
  const [data, setData] = useState([])
  const [summary, setSummary] = useState('')
  const [freq, setFreq] = useState('D')
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState([])
  const [showEvents, setShowEvents] = useState(true)
  const [hoveredEvent, setHoveredEvent] = useState(null)

  const load = (f) => {
    setLoading(true)
    getTimeseries(f)
      .then(res => {
        setData(res.data || [])
        setSummary(res.summary || '')
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(freq) }, [freq])

  // Fetch events on mount
  useEffect(() => {
    fetch('/api/events')
      .then(r => r.json())
      .then(res => {
        setEvents(res.events || [])
      })
      .catch(err => console.error('Failed to load events:', err))
  }, [])

  return (
    <div className="rounded-xl p-5 border" style={{ background: '#1a1d2e', borderColor: '#2e3154' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>
            Post Activity Over Time
          </p>
          <p className="text-lg font-bold" style={{ color: '#e2e8f0' }}>
            r/Anarchism — Jan to Feb 2025
          </p>
        </div>
        <div className="flex gap-2">
          {['D', 'W'].map(f => (
            <button
              key={f}
              onClick={() => setFreq(f)}
              className="px-3 py-1 rounded-lg text-sm font-medium transition-all"
              style={{
                background: freq === f ? '#6366f1' : '#232640',
                color: freq === f ? 'white' : '#94a3b8',
                border: '1px solid',
                borderColor: freq === f ? '#6366f1' : '#2e3154',
              }}
            >
              {f === 'D' ? 'Daily' : 'Weekly'}
            </button>
          ))}
          <button
            onClick={() => setShowEvents(!showEvents)}
            className="px-3 py-1 rounded-lg text-sm font-medium transition-all"
            style={{
              background: showEvents ? '#f59e0b' : '#232640',
              color: showEvents ? '#1f2937' : '#94a3b8',
              border: '1px solid',
              borderColor: showEvents ? '#f59e0b' : '#2e3154',
            }}
          >
            📅 Events
          </button>
        </div>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="h-64 flex items-center justify-center" style={{ color: '#64748b' }}>
          Loading chart...
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="colorPosts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2e3154" />
              <XAxis
                dataKey="created_dt"
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ color: '#94a3b8', fontSize: '12px', paddingTop: '12px' }}
              />
              
              {/* Event reference lines */}
              {showEvents && events.map((event, idx) => (
                <ReferenceLine
                  key={`event-${idx}`}
                  x={event.date}
                  stroke="#f59e0b"
                  strokeDasharray="5 5"
                  strokeOpacity={0.5}
                  label={{
                    value: event.title.substring(0, 12) + (event.title.length > 12 ? '...' : ''),
                    position: 'top',
                    fill: '#f59e0b',
                    fontSize: 10,
                    offset: 10,
                  }}
                  onMouseEnter={() => setHoveredEvent(event)}
                  onMouseLeave={() => setHoveredEvent(null)}
                />
              ))}
              
              <Area
                type="monotone"
                dataKey="post_count"
                name="Posts"
                stroke="#6366f1"
                fill="url(#colorPosts)"
                strokeWidth={2}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="avg_score"
                name="Avg Score"
                stroke="#10b981"
                fill="url(#colorScore)"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
          
          {/* Event tooltip when hovering */}
          {hoveredEvent && (
            <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }}>
              <EventTooltip event={hoveredEvent} />
            </div>
          )}
        </div>
      )}

      {/* Events list (when showing) */}
      {showEvents && events.length > 0 && (
        <div className="mt-4 rounded-lg p-3 text-sm" style={{
          background: 'rgba(245,158,11,0.05)',
          border: '1px solid rgba(245,158,11,0.2)',
          color: '#cbd5e1',
        }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#f59e0b' }}>
            📅 Real-World Events — Click to learn more
          </p>
          <div className="grid gap-2">
            {events.slice(0, 5).map((event, i) => (
              <div key={i} className="text-xs p-2 rounded" style={{ background: 'rgba(15,23,42,0.6)' }}>
                <p style={{ color: '#f59e0b', fontWeight: 'bold' }}>{event.date}</p>
                <p>{event.title}</p>
                <a href={event.url} target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8' }}>
                  → Wikipedia
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Summary */}
      {summary && (
        <div className="mt-4 rounded-lg p-3 text-sm" style={{
          background: 'rgba(99,102,241,0.08)',
          border: '1px solid rgba(99,102,241,0.2)',
          color: '#94a3b8',
          lineHeight: '1.6'
        }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#818cf8' }}>
            ✦ AI Summary
          </p>
          {summary}
        </div>
      )}
    </div>
  )
}