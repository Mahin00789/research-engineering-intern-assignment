import { useEffect, useState, useRef } from 'react'
import { getNetwork, removeNetworkNode } from '../lib/api'

// Dynamic import for ForceGraph2D (it's a heavy lib)
import ForceGraph2D from 'react-force-graph-2d'

export default function NetworkGraph() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] })
  const [stats, setStats] = useState(null)
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(true)
  const [removedNode, setRemovedNode] = useState(null)
  const [highlighted, setHighlighted] = useState(null)
  const fgRef = useRef()

  useEffect(() => {
    getNetwork()
      .then(res => {
        setGraphData({ nodes: res.nodes || [], links: res.links || [] })
        setStats(res.stats || null)
        setSummary(res.summary || '')
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleNodeClick = (node) => {
    setHighlighted(node.id)
  }

  const handleRemoveNode = async () => {
    if (!highlighted) return
    try {
      const res = await removeNetworkNode(highlighted)
      setGraphData({ nodes: res.nodes || [], links: res.links || [] })
      setStats(res.stats || null)
      setRemovedNode(highlighted)
      setHighlighted(null)
    } catch (e) {
      console.error(e)
    }
  }

  const handleReset = () => {
    setLoading(true)
    setRemovedNode(null)
    setHighlighted(null)
    getNetwork()
      .then(res => {
        setGraphData({ nodes: res.nodes || [], links: res.links || [] })
        setStats(res.stats || null)
        setSummary(res.summary || '')
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  const nodeColor = (node) => {
    if (node.id === highlighted) return '#f59e0b'
    return node.node_type === 'author' ? '#6366f1' : '#10b981'
  }

  const nodeVal = (node) => node.size || 4

  return (
    <div className="rounded-xl p-5 border" style={{ background: '#1a1d2e', borderColor: '#2e3154' }}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#94a3b8' }}>
            Author–Domain Network
          </p>
          <p className="text-sm" style={{ color: '#64748b' }}>
            Node size = PageRank · Click a node to select · Purple = author · Green = domain
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {highlighted && (
            <button
              onClick={handleRemoveNode}
              className="px-3 py-1 rounded-lg text-sm font-medium"
              style={{ background: '#ef444422', color: '#ef4444', border: '1px solid #ef444444' }}
            >
              Remove "{highlighted}"
            </button>
          )}
          {removedNode && (
            <button
              onClick={handleReset}
              className="px-3 py-1 rounded-lg text-sm font-medium"
              style={{ background: '#23264044', color: '#94a3b8', border: '1px solid #2e3154' }}
            >
              Reset Graph
            </button>
          )}
        </div>
      </div>

      {removedNode && (
        <div className="mb-3 px-3 py-2 rounded-lg text-sm"
          style={{ background: '#ef444411', border: '1px solid #ef444433', color: '#fca5a5' }}>
          Node <strong>"{removedNode}"</strong> removed. Graph updated with {graphData.nodes.length} remaining nodes.
        </div>
      )}

      {/* Graph */}
      {loading ? (
        <div className="h-96 flex items-center justify-center" style={{ color: '#64748b' }}>
          Building network graph...
        </div>
      ) : graphData.nodes.length === 0 ? (
        <div className="h-96 flex items-center justify-center" style={{ color: '#64748b' }}>
          No network data available.
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ background: '#0f1117', height: '380px' }}>
          <ForceGraph2D
            ref={fgRef}
            graphData={graphData}
            nodeColor={nodeColor}
            nodeVal={nodeVal}
            nodeLabel={node => `${node.id} (${node.node_type}) — PageRank: ${node.pagerank}`}
            linkColor={() => '#2e3154'}
            linkWidth={link => Math.max(1, link.weight)}
            backgroundColor="#0f1117"
            onNodeClick={handleNodeClick}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const label = node.id
              const fontSize = Math.max(8, 12 / globalScale)
              const r = nodeVal(node) * 0.8

              ctx.beginPath()
              ctx.arc(node.x, node.y, r, 0, 2 * Math.PI)
              ctx.fillStyle = nodeColor(node)
              ctx.fill()

              if (node.id === highlighted) {
                ctx.strokeStyle = '#f59e0b'
                ctx.lineWidth = 2
                ctx.stroke()
              }

              if (globalScale > 1.5) {
                ctx.font = `${fontSize}px sans-serif`
                ctx.fillStyle = '#94a3b8'
                ctx.textAlign = 'center'
                ctx.fillText(
                  label.length > 15 ? label.slice(0, 15) + '…' : label,
                  node.x,
                  node.y + r + fontSize
                )
              }
            }}
          />
        </div>
      )}

      {/* Stats row */}
      {stats && (
        <div className="flex flex-wrap gap-4 mt-4 text-sm">
          {[
            { label: 'Nodes', val: stats.total_nodes },
            { label: 'Edges', val: stats.total_edges },
            { label: 'Components', val: stats.connected_components },
            { label: 'Density', val: stats.density },
            { label: 'Avg Degree', val: stats.avg_degree },
          ].map(s => (
            <div key={s.label}>
              <span style={{ color: '#64748b' }}>{s.label}: </span>
              <span className="font-semibold" style={{ color: '#e2e8f0' }}>{s.val}</span>
            </div>
          ))}
        </div>
      )}

      {/* Top nodes by PageRank */}
      {stats?.top_by_pagerank?.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#64748b' }}>
            Top by PageRank
          </p>
          <div className="flex flex-wrap gap-2">
            {stats.top_by_pagerank.map(n => (
              <span
                key={n.node}
                className="px-2 py-1 rounded-full text-xs cursor-pointer"
                style={{
                  background: '#6366f122',
                  color: '#818cf8',
                  border: '1px solid #6366f133'
                }}
                onClick={() => setHighlighted(n.node)}
              >
                {n.node} ({n.pagerank})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* AI Summary */}
      {summary && (
        <div className="mt-4 rounded-lg p-3 text-sm"
          style={{
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