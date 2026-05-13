'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

// ── Types ──────────────────────────────────────────────────────────────────
interface Shoe {
  id: string | number
  name: string
  width?: string
  category?: string
}

// ── Constants ──────────────────────────────────────────────────────────────
const WIDTHS = ['Narrow', 'Standard', 'Wide', 'Extra Wide']
const CATEGORIES = ['Running', 'Sports', 'Hiking', 'Basketball', 'Casual', 'Training', 'Walking', 'Sandals']

// ── Fuzzy / autocorrect helper ─────────────────────────────────────────────
function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
  return dp[a.length][b.length]
}

function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase().trim()
  const t = target.toLowerCase()
  if (!q) return false
  if (t.includes(q)) return true
  // Allow 1 typo per 4 chars
  const words = t.split(' ')
  const threshold = Math.floor(q.length / 4) + 1
  return words.some(word => levenshtein(q, word) <= threshold && word.length > 2)
}

// ── Component ──────────────────────────────────────────────────────────────
export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [accountOpen, setAccountOpen] = useState(false)

  // Search state
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Shoe[]>([])
  const [allShoes, setAllShoes] = useState<Shoe[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Filter state
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedWidths, setSelectedWidths] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  const searchRef = useRef<HTMLDivElement>(null)
  const filterRef = useRef<HTMLDivElement>(null)

  // ── Auth ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data.user ?? null)
      setLoading(false)
    }
    init()
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  // ── Load shoe catalog for autocomplete ───────────────────────────────
  useEffect(() => {
    const fetchShoes = async () => {
      const { data } = await supabase.from('shoes').select('id, name, width, category')
      if (data) setAllShoes(data)
    }
    fetchShoes()
  }, [])

  // ── Fuzzy search on query change ─────────────────────────────────────
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([])
      return
    }
    const filtered = allShoes.filter(shoe => {
      const matchesQuery = fuzzyMatch(query, shoe.name)
      const matchesWidth =
        selectedWidths.length === 0 ||
        (shoe.width && selectedWidths.includes(shoe.width))
      const matchesCategory =
        selectedCategories.length === 0 ||
        (shoe.category && selectedCategories.includes(shoe.category))
      return matchesQuery && matchesWidth && matchesCategory
    })
    setSuggestions(filtered.slice(0, 6))
  }, [query, allShoes, selectedWidths, selectedCategories])

  // ── Close dropdowns when clicking outside ────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setAccountOpen(false)
  }

  const toggleWidth = (w: string) =>
    setSelectedWidths(prev =>
      prev.includes(w) ? prev.filter(x => x !== w) : [...prev, w]
    )

  const toggleCategory = (c: string) =>
    setSelectedCategories(prev =>
      prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
    )

  const activeFilterCount = selectedWidths.length + selectedCategories.length

  const handleSuggestionClick = (shoe: Shoe) => {
    setQuery(shoe.name)
    setShowSuggestions(false)
    // Navigate to catalog with search param
    window.location.href = `/catalog?search=${encodeURIComponent(shoe.name)}`
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    const params = new URLSearchParams()
    params.set('search', query)
    if (selectedWidths.length) params.set('widths', selectedWidths.join(','))
    if (selectedCategories.length) params.set('categories', selectedCategories.join(','))
    window.location.href = `/catalog?${params.toString()}`
    setShowSuggestions(false)
  }

  return (
    <nav className="flex justify-between items-center px-8 py-4 border-b relative bg-white z-50">

      {/* ── Left: Logo ── */}
      <h1 className="text-2xl font-bold w-32 shrink-0">SoleMate</h1>

      {/* ── Center: Search + Filter ── */}
      <div className="flex items-center gap-2 flex-1 max-w-xl mx-8">

        {/* Search bar */}
        <div ref={searchRef} className="relative flex-1">
          <form onSubmit={handleSearchSubmit} className="flex items-center">
            <div className="relative w-full">
              {/* Search icon */}
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none"
                fill="none" stroke="currentColor" strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={e => {
                  setQuery(e.target.value)
                  setShowSuggestions(true)
                }}
                onFocus={() => query && setShowSuggestions(true)}
                placeholder="Search shoes..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent
                           bg-gray-50 transition"
              />
              {/* Clear button */}
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(''); setSuggestions([]); setShowSuggestions(false) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </form>

          {/* Autocomplete suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200
                            rounded-lg shadow-lg overflow-hidden z-50">
              {suggestions.map(shoe => (
                <button
                  key={shoe.id}
                  onClick={() => handleSuggestionClick(shoe)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center
                             justify-between gap-2 border-b last:border-0 border-gray-50"
                >
                  <span className="font-medium text-gray-800 truncate">{shoe.name}</span>
                  <span className="flex gap-1.5 shrink-0">
                    {shoe.category && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        {shoe.category}
                      </span>
                    )}
                    {shoe.width && shoe.width !== 'Standard' && (
                      <span className="text-xs bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full">
                        {shoe.width}
                      </span>
                    )}
                  </span>
                </button>
              ))}
              {/* "Search all" footer */}
              <button
                onClick={handleSearchSubmit as never}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-400 hover:bg-gray-50
                           border-t border-gray-100 flex items-center gap-2"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                </svg>
                Search all results for "<span className="text-gray-600 font-medium">{query}</span>"
              </button>
            </div>
          )}

          {/* No results hint */}
          {showSuggestions && query.trim() && suggestions.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200
                            rounded-lg shadow-lg px-4 py-3 text-sm text-gray-400 z-50">
              No shoes found — try a different spelling
            </div>
          )}
        </div>

        {/* Filter button */}
        <div ref={filterRef} className="relative shrink-0">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition
                        font-medium
                        ${activeFilterCount > 0
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                        }`}
          >
            {/* Filter icon */}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M3 6h18M7 12h10M11 18h2" strokeLinecap="round" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 bg-white text-black text-xs font-bold rounded-full
                               w-4 h-4 flex items-center justify-center leading-none">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Filter dropdown */}
          {filterOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200
                            rounded-xl shadow-xl p-4 z-50">

              {/* Width */}
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Width
              </p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {WIDTHS.map(w => (
                  <button
                    key={w}
                    onClick={() => toggleWidth(w)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition font-medium
                                ${selectedWidths.includes(w)
                                  ? 'bg-black text-white border-black'
                                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                                }`}
                  >
                    {w}
                  </button>
                ))}
              </div>

              {/* Category */}
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Activity / Use
              </p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {CATEGORIES.map(c => (
                  <button
                    key={c}
                    onClick={() => toggleCategory(c)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition font-medium
                                ${selectedCategories.includes(c)
                                  ? 'bg-black text-white border-black'
                                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                                }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1 border-t border-gray-100">
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => { setSelectedWidths([]); setSelectedCategories([]) }}
                    className="flex-1 text-xs py-1.5 text-gray-500 hover:text-black transition"
                  >
                    Clear all
                  </button>
                )}
                <button
                  onClick={() => {
                    setFilterOpen(false)
                    if (query.trim()) handleSearchSubmit({ preventDefault: () => {} } as React.FormEvent)
                  }}
                  className="flex-1 text-xs py-1.5 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Nav links + Auth ── */}
      <div className="flex gap-6 text-sm font-medium items-center w-32 justify-end shrink-0">
        <Link href="/" className="hover:text-gray-500 transition">Home</Link>
        <Link href="/catalog" className="hover:text-gray-500 transition">Catalog</Link>

        {loading ? (
          <div className="text-gray-400">...</div>
        ) : !user ? (
          <Link href="/login">Login</Link>
        ) : (
          <div className="relative">
            <button onClick={() => setAccountOpen(!accountOpen)}>Account</button>
            {accountOpen && (
              <div className="absolute right-0 mt-2 w-48 border bg-white shadow-md rounded-md p-3 z-50">
                <p className="text-sm mb-2">{user.email}</p>
                <button onClick={handleLogout} className="text-red-500 text-sm">
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
