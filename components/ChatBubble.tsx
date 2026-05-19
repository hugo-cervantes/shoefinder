'use client'
import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

interface Message {
  role: 'user' | 'assistant'
  content: string
  catalogMatches?: CatalogShoe[]
  externalShoes?: ExternalShoe[]
}

interface CatalogShoe {
  id: number
  name: string
  model_line: string
  price: number
  width: string
  category_id: number
  gender: string
  image_url: string
}

interface ExternalShoe {
  name: string
  brand: string
  reason: string
  url: string
  price_range: string
}

const MAX_INPUT = 500

function sanitizeInput(value: string): string {
  return value
    .replace(/<[^>]*>/g, '')
    .slice(0, MAX_INPUT)
}

function renderText(text: string): React.ReactNode {
  const parts = text.split(/\*\*([^*]+)\*\*/)
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  )
}

const WELCOME: Message = {
  role: 'assistant',
  content: "Hey! I'm your SoleMate AI assistant. Tell me what you're looking for - activity, budget, fit issues, style - and I'll find your perfect shoe.",
}

export default function ChatBubble() {
  const [open, setOpen]         = useState(false)
  const [user, setUser]         = useState<any>(null)
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [nudge, setNudge]       = useState(false)
  const bottomRef               = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null))
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return

    // Show nudge after 8s, hide after 4s, repeat every 45s
    const show = () => {
      setNudge(true)
      const hide = setTimeout(() => setNudge(false), 4000)
      return hide
    }

    let hideTimer: NodeJS.Timeout
    const firstShow = setTimeout(() => {
      hideTimer = show()
    }, 8000)

    const interval = setInterval(() => {
      hideTimer = show()
    }, 45000)

    return () => {
      clearTimeout(firstShow)
      clearTimeout(hideTimer)
      clearInterval(interval)
    }
  }, [user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  if (!user) return null

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading || text.length > MAX_INPUT) return

    const userMsg: Message = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }))

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, userId: user.id }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message ?? 'Sorry, something went wrong.',
        catalogMatches: data.catalogMatches ?? [],
        externalShoes: data.externalShoes ?? [],
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I had trouble connecting. Try again in a moment.',
      }])
    }

    setLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-6 right-4 md:right-6 z-50 flex flex-col items-end gap-2">
        {nudge && !open && (
          <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-xl shadow-lg
                          animate-bounce max-w-[160px] text-center relative">
            Need help finding a shoe?
            <div className="absolute -bottom-1 right-5 w-2 h-2 bg-gray-900 rotate-45" />
          </div>
        )}
        <button
          onClick={() => { setOpen(o => !o); setNudge(false) }}
          className="w-14 h-14 rounded-full shadow-xl flex items-center justify-center
                     bg-black hover:scale-110 transition-all duration-300"
          aria-label="Open AI chat"
        >
          {open ? (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-24 right-2 md:right-6 z-50 w-[calc(100vw-1rem)] md:w-[380px] max-w-[420px]
                        bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
             style={{ height: '520px' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-black text-white shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold leading-none">SoleMate AI</p>
                <p className="text-xs text-white/60 mt-0.5">Shoe expert</p>
              </div>
            </div>
            <button onClick={() => { setMessages([WELCOME]); setInput('') }}
              className="text-white/50 hover:text-white text-xs transition">
              Clear
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[85%] space-y-2">

                  {/* Bubble */}
                  <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed
                    ${msg.role === 'user'
                      ? 'bg-black text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                    }`}>
                    {renderText(msg.content)}
                  </div>

                  {/* Catalog shoe cards */}
                  {msg.catalogMatches && msg.catalogMatches.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-400 px-1">Available on SoleMate:</p>
                      {msg.catalogMatches.map(shoe => (
                        <Link key={shoe.id} href={`/shoes/${shoe.id}`}
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-3 bg-white border border-gray-200
                                     rounded-xl p-2.5 hover:border-black hover:shadow-sm
                                     transition cursor-pointer group">
                          <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                            <img src={shoe.image_url} alt={shoe.name}
                              className="w-full h-full object-contain p-1" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-400 truncate">{shoe.model_line}</p>
                            <p className="text-sm font-semibold text-gray-900 truncate">{shoe.name}</p>
                            <p className="text-xs font-bold text-gray-800 mt-0.5">${shoe.price}</p>
                            <p className="text-xs text-black font-medium mt-0.5 group-hover:underline">
                              View on SoleMate
                            </p>
                          </div>
                          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* External shoe cards - same style as catalog, links to Google search */}
                  {msg.externalShoes && msg.externalShoes.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-400 px-1">Not on SoleMate yet:</p>
                      {msg.externalShoes.map((shoe, idx) => (
                        <a key={idx} href={shoe.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-3 bg-white border border-gray-200
                                     rounded-xl p-2.5 hover:border-black hover:shadow-sm
                                     transition cursor-pointer group">
                          {/* Shoe icon placeholder since no image */}
                          <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                              <path d="M3 10h1l2-3h10l2 3h1a1 1 0 011 1v4a1 1 0 01-1 1H3a1 1 0 01-1-1v-4a1 1 0 011-1z" strokeLinecap="round" strokeLinejoin="round"/>
                              <circle cx="7" cy="15" r="1.5" fill="currentColor" stroke="none"/>
                              <circle cx="17" cy="15" r="1.5" fill="currentColor" stroke="none"/>
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-400 truncate">{shoe.brand}</p>
                            <p className="text-sm font-semibold text-gray-900 truncate">{shoe.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5 truncate">{shoe.price_range}</p>
                            <p className="text-xs text-black font-medium mt-0.5 group-hover:underline">
                              Search on Google
                            </p>
                          </div>
                          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading dots */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-gray-100 shrink-0">
            <div className="flex items-end gap-2 bg-gray-50 rounded-xl border border-gray-200
                            focus-within:border-black focus-within:bg-white transition px-3 py-2">
              <textarea
                value={input}
                onChange={e => setInput(sanitizeInput(e.target.value))}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about shoes..."
                rows={1}
                className="flex-1 text-sm bg-transparent resize-none focus:outline-none max-h-24 leading-relaxed"
                style={{ minHeight: '24px' }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="w-7 h-7 bg-black rounded-lg flex items-center justify-center
                           hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed
                           transition shrink-0 mb-0.5"
              >
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-xs text-gray-300">Enter to send - Shift+Enter for new line</p>
              <p className={`text-xs ${input.length > 450 ? 'text-red-400' : 'text-gray-300'}`}>
                {input.length}/{MAX_INPUT}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
