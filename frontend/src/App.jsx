import { useState } from 'react'
import StatsCards from './components/StatsCards'
import TimeSeries from './components/TimeSeries'
import TopAuthors from './components/TopAuthors'
import TopDomains from './components/TopDomains'
import TopicClusters from './components/TopicClusters'
import NetworkGraph from './components/NetworkGraph'
import Chatbot from './components/Chatbot'
import PostsTable from './components/PostsTable'
import EmbeddingViz from './components/EmbeddingViz'
const NAV_ITEMS = [
  { id: 'overview', label: 'Overview' },
  { id: 'network', label: 'Network' },
  { id: 'clusters', label: 'Topics' },
  { id: 'search', label: 'Search' },
  { id: 'posts', label: 'Posts' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b, #020617)' }}>
      {/* Top navbar */}
      <nav className="sticky top-0 z-50 border-b" style={{ background: 'rgba(15, 23, 42, 0.8)', borderColor: '#2e3154', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold"
              style={{ background: '#6366f1', color: 'white' }}></div>
            <div>
              <span className="font-bold text-sm" style={{ color: '#e2e8f0' }}>Information Dashboard</span>
            </div>
          </div>

          {/* Nav tabs */}
          <div className="flex gap-1">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: activeTab === item.id ? '#6366f1' : 'transparent',
                  color: activeTab === item.id ? 'white' : '#94a3b8',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8">

        {/* ── Overview Tab ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Hero */}
            <div>
              <h1 className="text-2xl font-bold mb-1" style={{ color: '#e2e8f0' }}>
                Narrative Analysis : Anarchism
              </h1>
              <p className="text-sm" style={{ color: '#64748b' }}>
                Tracking information flow, topic trends, and community engagement · Jan 4 – Feb 18, 2025
              </p>
            </div>

            <StatsCards />
            <TimeSeries />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TopAuthors />
              <TopDomains />
            </div>
          </div>
        )}

        {/* ── Network Tab ── */}
        {activeTab === 'network' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1" style={{ color: '#e2e8f0' }}>
                Author–Domain Network
              </h2>
              <p className="text-sm" style={{ color: '#64748b' }}>
                PageRank centrality · Click any node to select · Remove nodes to test resilience
              </p>
            </div>
            <NetworkGraph />
          </div>
        )}

        {/* ── Topics Tab ── */}
        {activeTab === 'clusters' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1" style={{ color: '#e2e8f0' }}>
                Topic Clustering
              </h2>
              <p className="text-sm" style={{ color: '#64748b' }}>
                KMeans on all-MiniLM-L6-v2 embeddings · Adjust cluster count with the slider
              </p>
            </div>
            <TopicClusters />
          </div>
        )}

        {/* ── Search Tab ── */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1" style={{ color: '#e2e8f0' }}>
                Semantic Search
              </h2>
              <p className="text-sm" style={{ color: '#64748b' }}>
                Results ranked by meaning, not keywords · Try queries with zero keyword overlap
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
              <Chatbot />
            </div>
          </div>
        )}

        {/* ── Posts Tab ── */}
        {activeTab === 'posts' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1" style={{ color: '#e2e8f0' }}>
                All Posts
              </h2>
              <p className="text-sm" style={{ color: '#64748b' }}>
                Browse and sort all 181 posts from r/Anarchism
              </p>
            </div>
            <PostsTable />
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t mt-16 py-6" style={{ borderColor: '#2e3154' }}>
        <div className="max-w-7xl mx-auto px-4 text-center text-xs" style={{ color: '#374151' }}>
        </div>
      </footer>
    </div>
  )
}