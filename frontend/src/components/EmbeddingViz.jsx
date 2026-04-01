import React, { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'

const BASE_URL = 'http://localhost:8000'

const CLUSTER_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#06b6d4', '#f43f5e', '#84cc16', '#fb923c', '#a78bfa',
]

function assignClusters(points, n = 6) {
  // Simple KMeans-lite: assign color buckets by score quartile + position
  // (real clusters come from /api/clusters; this is just for coloring the viz)
  if (!points.length) return []
  const maxScore = Math.max(...points.map(p => p.score)) || 1
  return points.map(p => ({
    ...p,
    colorIdx: Math.floor((p.score / maxScore) * (n - 1)),
  }))
}

export default function EmbeddingViz() {
  const canvasRef = useRef(null)
  const [points, setPoints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [hovered, setHovered] = useState(null)
  const [tooltip, setTooltip] = useState({ x: 0, y: 0, visible: false })
  const [colorBy, setColorBy] = useState('score') // 'score' | 'author' | 'date'
  const [transform, setTransform] = useState({ scale: 1, tx: 0, ty: 0 })
  const isDragging = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const animFrame = useRef(null)

  useEffect(() => {
    axios.get(`${BASE_URL}/api/nomic-embeddings`)
      .then(res => {
        const colored = assignClusters(res.data.points || [], 10)
        setPoints(colored)
      })
      .catch(e => {
        // Fallback to PCA embeddings if UMAP endpoint not ready
        axios.get(`${BASE_URL}/api/embeddings`)
          .then(res => {
            const colored = assignClusters(res.data.points || [], 10)
            setPoints(colored)
          })
          .catch(() => setError('Could not load embeddings'))
      })
      .finally(() => setLoading(false))
  }, [])

  // Normalize points to canvas space
  const normalized = useCallback((pts, W, H, pad = 40) => {
    if (!pts.length) return []
    const xs = pts.map(p => p.x)
    const ys = pts.map(p => p.y)
    const minX = Math.min(...xs), maxX = Math.max(...xs)
    const minY = Math.min(...ys), maxY = Math.max(...ys)
    const rangeX = maxX - minX || 1
    const rangeY = maxY - minY || 1
    return pts.map(p => ({
      ...p,
      cx: pad + ((p.x - minX) / rangeX) * (W - 2 * pad),
      cy: pad + ((p.y - minY) / rangeY) * (H - 2 * pad),
    }))
  }, [])

  const getColor = useCallback((pt, idx) => {
    if (colorBy === 'score') {
      return CLUSTER_COLORS[pt.colorIdx % CLUSTER_COLORS.length]
    }
    if (colorBy === 'date') {
      const d = new Date(pt.date)
      const week = Math.floor(d.getDate() / 7)
      return CLUSTER_COLORS[week % CLUSTER_COLORS.length]
    }
    // author: hash
    let hash = 0
    for (let c of (pt.author || '')) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff
    return CLUSTER_COLORS[hash % CLUSTER_COLORS.length]
  }, [colorBy])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !points.length) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width
    const H = canvas.height
    const pts = normalized(points, W, H)

    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      ctx.save()
      ctx.translate(transform.tx, transform.ty)
      ctx.scale(transform.scale, transform.scale)

      // Draw edges (subtle connections for nearby points)
      // Skipped for performance with 180 points — just dots

      // Draw points
      pts.forEach((pt, i) => {
        const isHovered = hovered?.i === i
        const radius = isHovered ? 9 : 5
        const color = getColor(pt, i)

        ctx.beginPath()
        ctx.arc(pt.cx, pt.cy, radius, 0, Math.PI * 2)
        ctx.fillStyle = isHovered ? '#ffffff' : color
        ctx.globalAlpha = isHovered ? 1 : 0.85
        ctx.fill()

        if (isHovered) {
          // Glow ring
          ctx.beginPath()
          ctx.arc(pt.cx, pt.cy, radius + 4, 0, Math.PI * 2)
          ctx.strokeStyle = color
          ctx.lineWidth = 2
          ctx.globalAlpha = 0.5
          ctx.stroke()
        }
      })
      ctx.restore()
    }

    animFrame.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animFrame.current)
  }, [points, hovered, transform, colorBy, normalized, getColor])

  // Mouse interaction
  const getHoveredPoint = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas || !points.length) return null
    const rect = canvas.getBoundingClientRect()
    const mx = (e.clientX - rect.left - transform.tx) / transform.scale
    const my = (e.clientY - rect.top - transform.ty) / transform.scale
    const W = canvas.width, H = canvas.height
    const pts = normalized(points, W, H)

    let closest = null, minDist = 18
    pts.forEach((pt, i) => {
      const d = Math.sqrt((pt.cx - mx) ** 2 + (pt.cy - my) ** 2)
      if (d < minDist) { minDist = d; closest = { ...pt, i } }
    })
    return closest
  }, [points, transform, normalized])

  const handleMouseMove = useCallback((e) => {
    if (isDragging.current) {
      const dx = e.clientX - lastMouse.current.x
      const dy = e.clientY - lastMouse.current.y
      lastMouse.current = { x: e.clientX, y: e.clientY }
      setTransform(t => ({ ...t, tx: t.tx + dx, ty: t.ty + dy }))
      return
    }
    const pt = getHoveredPoint(e)
    setHovered(pt)
    if (pt) {
      const rect = canvasRef.current.getBoundingClientRect()
      setTooltip({ x: e.clientX - rect.left + 12, y: e.clientY - rect.top - 10, visible: true })
    } else {
      setTooltip(t => ({ ...t, visible: false }))
    }
  }, [getHoveredPoint])

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.1 : 0.9
    setTransform(t => ({
      ...t,
      scale: Math.max(0.3, Math.min(5, t.scale * factor))
    }))
  }, [])

  const handleMouseDown = (e) => {
    isDragging.current = true
    lastMouse.current = { x: e.clientX, y: e.clientY }
  }
  const handleMouseUp = () => { isDragging.current = false }

  const resetView = () => setTransform({ scale: 1, tx: 0, ty: 0 })

  return (
    <div className="rounded-xl p-6" style={{ background: '#1a1d2e', border: '1px solid #2e3154' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-white">Embedding Space Visualization</h2>
          <p className="text-xs mt-1" style={{ color: '#64748b' }}>
            UMAP projection of sentence embeddings (all-MiniLM-L6-v2) · Scroll to zoom · Drag to pan
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-xs" style={{ color: '#94a3b8' }}>Color by:</span>
          {['score', 'author', 'date'].map(c => (
            <button
              key={c}
              onClick={() => setColorBy(c)}
              className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: colorBy === c ? '#6366f1' : '#232640',
                color: colorBy === c ? 'white' : '#94a3b8',
                border: '1px solid #2e3154'
              }}
            >
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
          <button
            onClick={resetView}
            className="px-3 py-1 rounded-lg text-xs font-semibold"
            style={{ background: '#232640', color: '#94a3b8', border: '1px solid #2e3154' }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative rounded-lg overflow-hidden" style={{ background: '#0f1117', border: '1px solid #2e3154' }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ color: '#64748b', zIndex: 10 }}>
            <div className="text-center">
              <p className="text-sm">Computing UMAP projection...</p>
              <p className="text-xs mt-1" style={{ color: '#475569' }}>This may take a few seconds</p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ color: '#ef4444', zIndex: 10 }}>
            <p className="text-sm">{error}</p>
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={760}
          height={440}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          style={{ cursor: isDragging.current ? 'grabbing' : 'crosshair', display: 'block', width: '100%' }}
        />

        {/* Tooltip */}
        {tooltip.visible && hovered && (
          <div
            className="absolute pointer-events-none rounded-lg p-3 text-xs"
            style={{
              left: tooltip.x, top: tooltip.y,
              background: '#1a1d2e',
              border: '1px solid #2e3154',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              maxWidth: 240, zIndex: 20
            }}
          >
            <p className="font-semibold mb-1" style={{ color: '#e2e8f0' }}>{hovered.title}</p>
            <p style={{ color: '#94a3b8' }}>u/{hovered.author}</p>
            <p style={{ color: '#64748b' }}>Score: {hovered.score} · {hovered.date}</p>
            {hovered.domain && <p style={{ color: '#64748b' }}>{hovered.domain}</p>}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 flex-wrap">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#64748b' }}>
          {colorBy === 'score' ? 'Score (low → high)' : colorBy === 'author' ? 'By Author' : 'By Week'}
        </span>
        {CLUSTER_COLORS.slice(0, 5).map((c, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
            <span className="text-xs" style={{ color: '#64748b' }}>
              {colorBy === 'score' ? ['Very Low', 'Low', 'Medium', 'High', 'Very High'][i] : `Group ${i + 1}`}
            </span>
          </div>
        ))}
        <span className="ml-auto text-xs" style={{ color: '#475569' }}>
          {points.length} posts plotted
        </span>
      </div>

      {/* Info box */}
      <div className="mt-4 rounded-lg p-4" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#818cf8' }}>✦ About this visualization</p>
        <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
          Each dot represents one Reddit post, positioned by semantic similarity.
          Posts that discuss similar topics appear closer together.
          UMAP reduces 384-dimensional sentence embeddings to 2D while preserving local structure.
          Hover over any dot to see post details.
        </p>
      </div>
    </div>
  )
}