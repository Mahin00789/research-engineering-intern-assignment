import { useEffect, useState } from 'react'
import { getPosts } from '../lib/api'

export default function PostsTable() {
  const [posts, setPosts] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('score')
  const [offset, setOffset] = useState(0)
  const LIMIT = 10

  const load = (sort, off) => {
    setLoading(true)
    getPosts(LIMIT, off, sort)
      .then(res => {
        setPosts(res.posts || [])
        setTotal(res.total || 0)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(sortBy, offset) }, [sortBy, offset])

  const sorts = [
    { key: 'score', label: '↑ Score' },
    { key: 'num_comments', label: '↑ Comments' },
    { key: 'created_utc', label: '↑ Newest' },
  ]

  return (
    <div className="rounded-xl p-5 border" style={{ background: '#1a1d2e', borderColor: '#2e3154' }}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#94a3b8' }}>
          All Posts ({total})
        </p>
        <div className="flex gap-2">
          {sorts.map(s => (
            <button
              key={s.key}
              onClick={() => { setSortBy(s.key); setOffset(0) }}
              className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
              style={{
                background: sortBy === s.key ? '#6366f122' : 'transparent',
                color: sortBy === s.key ? '#818cf8' : '#64748b',
                border: '1px solid',
                borderColor: sortBy === s.key ? '#6366f133' : '#2e3154',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-lg animate-pulse" style={{ background: '#232640' }} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post, i) => (
            <a
              key={post.id || i}
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg p-3 transition-all group"
              style={{ background: '#232640', border: '1px solid transparent' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#2e3154'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-snug group-hover:text-indigo-400 transition-colors"
                  style={{ color: '#e2e8f0' }}>
                  {post.title}
                </p>
                <div className="flex-shrink-0 flex items-center gap-3 text-xs" style={{ color: '#64748b' }}>
                  <span>▲ {post.score}</span>
                  <span>💬 {post.num_comments}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-xs" style={{ color: '#64748b' }}>
                <span>u/{post.author}</span>
                <span>·</span>
                <span>{post.domain}</span>
                <span>·</span>
                <span>{String(post.date)}</span>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-xs" style={{ color: '#64748b' }}>
          Showing {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}
        </p>
        <div className="flex gap-2">
          <button
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - LIMIT))}
            className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
            style={{
              background: '#232640',
              color: offset === 0 ? '#374151' : '#94a3b8',
              border: '1px solid #2e3154',
            }}
          >
            ← Prev
          </button>
          <button
            disabled={offset + LIMIT >= total}
            onClick={() => setOffset(offset + LIMIT)}
            className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
            style={{
              background: '#232640',
              color: offset + LIMIT >= total ? '#374151' : '#94a3b8',
              border: '1px solid #2e3154',
            }}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}