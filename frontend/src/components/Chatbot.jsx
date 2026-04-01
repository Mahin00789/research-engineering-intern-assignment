import { useState, useRef, useEffect } from 'react'
import { chat } from '../lib/api'

const EXAMPLE_QUERIES = [
  'What reading materials are people recommending?',
  'Posts about mutual aid and community organizing',
  'Discussions on theory and philosophy',
]

export default function Chatbot() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi! I can help you explore the r/Anarchism dataset using semantic search. Ask me anything — I understand meaning, not just keywords.',
      sources: [],
      suggestions: EXAMPLE_QUERIES,
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (query) => {
    const q = (query || input).trim()
    if (!q) return

    const userMsg = { role: 'user', content: q }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    // Build history for multi-turn (last 6 messages)
    const history = messages.slice(-6).map(m => ({
      role: m.role,
      content: m.content,
    }))

    try {
      const res = await chat(q, history)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.answer || 'No answer returned.',
        sources: res.sources || [],
        suggestions: res.suggested_queries || [],
      }])
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        sources: [],
        suggestions: [],
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="rounded-xl border flex flex-col" style={{
      background: '#1a1d2e',
      borderColor: '#2e3154',
      height: '600px'
    }}>
      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center gap-3" style={{ borderColor: '#2e3154' }}>
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#94a3b8' }}>
            Semantic Search Chatbot
          </p>
          <p className="text-xs" style={{ color: '#64748b' }}>
            Powered by sentence-transformers + Claude · Zero keyword overlap works
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-1' : ''}`}>
              {/* Bubble */}
              <div
                className="rounded-2xl px-4 py-3 text-sm leading-relaxed"
                style={{
                  background: msg.role === 'user' ? '#6366f1' : '#232640',
                  color: msg.role === 'user' ? 'white' : '#e2e8f0',
                  borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
                  borderBottomLeftRadius: msg.role === 'user' ? '16px' : '4px',
                }}
              >
                {msg.content}
              </div>

              {/* Sources */}
              {msg.sources?.length > 0 && (
                <div className="mt-2 space-y-1">
                  {msg.sources.map((s, j) => (
                    <a
                      key={j}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all"
                      style={{
                        background: '#1a1d2e',
                        border: '1px solid #2e3154',
                        color: '#818cf8',
                      }}
                    >
                      <span>↗</span>
                      <span className="truncate">{s.title}</span>
                      <span className="ml-auto flex-shrink-0" style={{ color: '#64748b' }}>
                        {s.score?.toFixed(2)}
                      </span>
                    </a>
                  ))}
                </div>
              )}

              {/* Suggested follow-ups */}
              {msg.suggestions?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs mb-2" style={{ color: '#64748b' }}>Try asking:</p>
                  <div className="flex flex-wrap gap-2">
                    {msg.suggestions.map((s, j) => (
                      <button
                        key={j}
                        onClick={() => sendMessage(s)}
                        className="px-3 py-1.5 rounded-full text-xs transition-all"
                        style={{
                          background: 'rgba(99,102,241,0.1)',
                          color: '#818cf8',
                          border: '1px solid rgba(99,102,241,0.25)',
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-3 text-sm" style={{ background: '#232640', color: '#64748b' }}>
              <span className="animate-pulse">Searching and thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-4 border-t" style={{ borderColor: '#2e3154' }}>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask anything about the dataset..."
            disabled={loading}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
            style={{
              background: '#232640',
              border: '1px solid #2e3154',
              color: '#e2e8f0',
            }}
            onFocus={e => e.target.style.borderColor = '#6366f1'}
            onBlur={e => e.target.style.borderColor = '#2e3154'}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              background: input.trim() ? '#6366f1' : '#232640',
              color: input.trim() ? 'white' : '#64748b',
              border: '1px solid',
              borderColor: input.trim() ? '#6366f1' : '#2e3154',
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}