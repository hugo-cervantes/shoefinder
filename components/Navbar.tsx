'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

interface Shoe {
  id: number
  name: string
  model_line: string
  image_url: string
  category_id: number
  width: string
}

// Maps category_id → display label (matches your Supabase category table)
const CATEGORY_MAP: Record<number, string> = {
  1: 'Running',
  2: 'Casual',
  3: 'Sports',
  4: 'Hiking',
}

// Width values exactly as stored in Supabase (lowercase)
const WIDTHS = [
  { label: 'Narrow',     value: 'narrow' },
  { label: 'Medium',     value: 'medium' },
  { label: 'Wide',       value: 'wide' },
  { label: 'Extra Wide', value: 'extra wide' },
]

const CATEGORIES = Object.entries(CATEGORY_MAP).map(([id, label]) => ({
  id: Number(id),
  label,
}))

export default function Navbar() {
  const router = useRouter()
  const isHomePage = router.pathname === '/'

  const [user, setUser] = useState<User | null>(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [accountOpen, setAccountOpen] = useState(false)

  // Search
  const [query, setQuery] = useState('')
  const [allShoes, setAllShoes] = useState<Shoe[]>([])
  const [suggestions, setSuggestions] = useState<Shoe[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Filters
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedWidths, setSelectedWidths] = useState<string[]>([])       // lowercase values
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]) // numeric ids

  const searchRef = useRef<HTMLDivElement>(null)
  const filterRef = useRef<HTMLDivElement>(null)
  const accountRef = useRef<HTMLDivElement>(null)

  // ── Auth ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data.user ?? null)
      setLoadingAuth(false)
    }
    init()
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoadingAuth(false)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  // ── Load all shoes once into memory ───────────────────────────────────
  useEffect(() => {
    const fetchShoes = async () => {
      const { data, error } = await supabase
        .from('shoe')
        .select('id, name, model_line, image_url, category_id, width')
      if (!error && data) setAllShoes(data)
    }
    fetchShoes()
  }, [])

  // ── Update suggestions on every keystroke ─────────────────────────────
  useEffect(() => {
    const q = query.trim().toLowerCase()

    if (!q) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    const matched = allShoes.filter(shoe => {
      // Text match on name or model_line
      const textMatch =
        shoe.name.toLowerCase().includes(q) ||
        (shoe.model_line?.toLowerCase().includes(q) ?? false)

      // Width filter (if any selected)
      const widthMatch =
        selectedWidths.length === 0 ||
        selectedWidths.includes(shoe.width?.toLowerCase() ?? '')

      // Category filter (if any selected)
      const catMatch =
        selectedCategoryIds.length === 0 ||
        selectedCategoryIds.includes(shoe.category_id)

      return textMatch && widthMatch && catMatch
    })

    setSuggestions(matched.slice(0, 7))
    setShowSuggestions(true)
  }, [query, allShoes, selectedWidths, selectedCategoryIds])

  // ── Close on outside click ────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowSuggestions(false)
      if (filterRef.current && !filterRef.current.contains(e.target as Node))
        setFilterOpen(false)
      if (accountRef.current && !accountRef.current.contains(e.target as Node))
        setAccountOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setAccountOpen(false)
  }

  const toggleWidth = (value: string) =>
    setSelectedWidths(prev =>
      prev.includes(value) ? prev.filter(x => x !== value) : [...prev, value]
    )

  const toggleCategory = (id: number) =>
    setSelectedCategoryIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )

  const activeFilterCount = selectedWidths.length + selectedCategoryIds.length

  // Click suggestion → go to shoe detail page
  const handleSuggestionClick = (shoe: Shoe) => {
    setQuery('')
    setSuggestions([])
    setShowSuggestions(false)
    router.push(`/shoes/${shoe.id}`)
  }

  // Enter → go to catalog with params
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    const params = new URLSearchParams()
    params.set('search', query.trim())
    if (selectedWidths.length) params.set('widths', selectedWidths.join(','))
    if (selectedCategoryIds.length) params.set('categories', selectedCategoryIds.join(','))
    router.push(`/catalog?${params.toString()}`)
    setShowSuggestions(false)
    setQuery('')
  }

  return (
    <nav className="flex justify-between items-center px-8 py-4 border-b relative bg-white z-50">

      {/* ── Logo ── */}
      <h1 className="text-2xl font-bold w-32 shrink-0">
        <Link href="/">SoleMate</Link>
      </h1>

      {/* ── Search + Filter ── */}
      <div className="flex items-center gap-2 flex-1 max-w-xl mx-8">

        {/* Search input */}
        <div ref={searchRef} className="relative flex-1">
          <form onSubmit={handleSearchSubmit}>
            <div className="relative w-full">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none"
                fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Search shoes by name..."
                className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent
                           bg-gray-50 transition"
              />
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

          {/* Dropdown */}
          {showSuggestions && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200
                            rounded-xl shadow-xl overflow-hidden z-50">
              {suggestions.length > 0 ? (
                <>
                  {suggestions.map(shoe => (
                    <button
                      key={shoe.id}
                      onMouseDown={() => handleSuggestionClick(shoe)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50
                                 border-b border-gray-50 last:border-0 transition text-left"
                    >
                      {/* Thumbnail */}
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                        {shoe.image_url ? (
                          <img
                            src={shoe.image_url}
                            alt={shoe.name}
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M3 7h18M3 12h18M3 17h18" strokeLinecap="round" />
                          </svg>
                        )}
                      </div>

                      {/* Name + model */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{shoe.name}</p>
                        <p className="text-xs text-gray-400 truncate">{shoe.model_line}</p>
                      </div>

                      {/* Badges */}
                      <div className="flex flex-col gap-1 items-end shrink-0">
                        {shoe.category_id && CATEGORY_MAP[shoe.category_id] && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                            {CATEGORY_MAP[shoe.category_id]}
                          </span>
                        )}
                        {shoe.width && shoe.width !== 'medium' && (
                          <span className="text-xs bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full capitalize">
                            {shoe.width}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}

                  {/* See all results */}
                  <button
                    onMouseDown={handleSearchSubmit as never}
                    className="w-full px-4 py-2.5 text-xs text-gray-400 hover:bg-gray-50
                               border-t border-gray-100 flex items-center gap-2 transition"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                    </svg>
                    See all results for <span className="text-gray-700 font-medium ml-1">"{query}"</span>
                  </button>
                </>
              ) : (
                <div className="px-4 py-4 text-sm text-gray-400 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                  </svg>
                  No shoes found for "{query}"
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filter button — hidden on home page */}
        {!isHomePage && (
          <div ref={filterRef} className="relative shrink-0">
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition font-medium
                          ${activeFilterCount > 0
                            ? 'bg-black text-white border-black'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                          }`}
            >
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

            {filterOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200
                              rounded-xl shadow-xl p-4 z-50">

                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Width</p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {WIDTHS.map(w => (
                    <button key={w.value} onClick={() => toggleWidth(w.value)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition font-medium
                                  ${selectedWidths.includes(w.value)
                                    ? 'bg-black text-white border-black'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                                  }`}>
                      {w.label}
                    </button>
                  ))}
                </div>

                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Activity</p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {CATEGORIES.map(c => (
                    <button key={c.id} onClick={() => toggleCategory(c.id)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition font-medium
                                  ${selectedCategoryIds.includes(c.id)
                                    ? 'bg-black text-white border-black'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                                  }`}>
                      {c.label}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2 pt-1 border-t border-gray-100">
                  {activeFilterCount > 0 && (
                    <button
                      onClick={() => { setSelectedWidths([]); setSelectedCategoryIds([]) }}
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
        )}
      </div>

      {/* ── Nav + Account ── */}
      <div className="flex gap-6 text-sm font-medium items-center w-48 justify-end shrink-0">
        <Link href="/" className="hover:text-gray-500 transition">Home</Link>
        <Link href="/catalog" className="hover:text-gray-500 transition">Catalog</Link>

        {loadingAuth ? (
          <div className="text-gray-400">...</div>
        ) : !user ? (
          <Link href="/login">Login</Link>
        ) : (
          <div ref={accountRef} className="relative">
            <button
              onClick={() => setAccountOpen(!accountOpen)}
              className="flex items-center gap-1.5 hover:text-gray-500 transition"
            >
              Account
              <svg className={`w-3 h-3 transition-transform duration-200 ${accountOpen ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {accountOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-200 shadow-lg rounded-xl p-2 z-50">
                <p className="text-xs text-gray-400 px-2 py-1.5 border-b border-gray-100 truncate mb-1">
                  {user.email}
                </p>
                <Link
                  href="/questionnaire"
                  onClick={() => setAccountOpen(false)}
                  className="flex items-center gap-2.5 px-2 py-2 text-sm text-gray-700
                             hover:bg-gray-50 rounded-lg transition w-full"
                >
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor"
                    strokeWidth={2} viewBox="0 0 24 24">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Shoe Fit Questionnaire
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 px-2 py-2 text-sm text-red-500
                             hover:bg-red-50 rounded-lg transition w-full"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor"
                    strokeWidth={2} viewBox="0 0 24 24">
                    <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
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
