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


// -- Search sanitization ---------------------------------------------------
const SEARCH_MAX_LENGTH = 50

function sanitizeSearch(value: string): string {
  return value
    .replace(/[<>"'%;()&+\\]/g, '')
    .replace(/\s{2,}/g, ' ')
    .slice(0, SEARCH_MAX_LENGTH)
}

const CATEGORY_MAP: Record<number, string> = {
  1: 'Running',
  2: 'Casual',
  3: 'Sports',
  4: 'Hiking',
}

export default function Navbar() {
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [accountOpen, setAccountOpen] = useState(false)
  const [mobileOpen, setMobileOpen]   = useState(false)

  // Search
  const [query, setQuery] = useState('')
  const [allShoes, setAllShoes] = useState<Shoe[]>([])
  const [suggestions, setSuggestions] = useState<Shoe[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Wishlist count badge
  const [wishlistCount, setWishlistCount] = useState(0)

  const searchRef  = useRef<HTMLDivElement>(null)
  const accountRef = useRef<HTMLDivElement>(null)

  // -- Auth --------------------------------------------------------------
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

  // -- Load shoes for search ---------------------------------------------
  useEffect(() => {
    supabase.from('shoe').select('id, name, model_line, image_url, category_id, width')
      .then(({ data }) => { if (data) setAllShoes(data) })
  }, [])

  // -- Wishlist count - fetch + re-fetch on wishlist-updated event -------
  const fetchWishlistCount = async (uid: string) => {
    const { count } = await supabase
      .from('wishlist')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
    setWishlistCount(count ?? 0)
  }

  useEffect(() => {
    if (!user) { setWishlistCount(0); return }
    fetchWishlistCount(user.id)

    // Listen for heart button saves/removes on the shoe page
    const handler = () => fetchWishlistCount(user.id)
    window.addEventListener('wishlist-updated', handler)
    return () => window.removeEventListener('wishlist-updated', handler)
  }, [user])

  // -- Suggestions -------------------------------------------------------
  useEffect(() => {
    const q = query.trim().toLowerCase()
    if (!q) { setSuggestions([]); setShowSuggestions(false); return }

    const matched = allShoes.filter(shoe =>
      shoe.name.toLowerCase().includes(q) ||
      (shoe.model_line?.toLowerCase().includes(q) ?? false)
    )
    setSuggestions(matched.slice(0, 7))
    setShowSuggestions(true)
  }, [query, allShoes])

  // -- Close on outside click --------------------------------------------
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current  && !searchRef.current.contains(e.target as Node))  setShowSuggestions(false)
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setAccountOpen(false)
    router.push('/')
  }

  const handleSuggestionClick = (shoe: Shoe) => {
    setQuery(''); setSuggestions([]); setShowSuggestions(false)
    router.push(`/shoes/${shoe.id}`)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    router.push(`/catalog?search=${encodeURIComponent(query.trim())}`)
    setShowSuggestions(false)
    setQuery('')
  }

  return (
    <nav className="border-b bg-white z-50 relative">
      <div className="flex justify-between items-center px-4 md:px-8 py-4">

      {/* Logo */}
      <h1 className="text-2xl font-bold w-32 shrink-0">
        <Link href="/">SoleMate</Link>
      </h1>

      {/* Hamburger - mobile only */}
      <button className="md:hidden ml-auto mr-2" onClick={() => setMobileOpen(o => !o)} aria-label="Menu">
        {mobileOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        )}
      </button>

      {/* Search - hidden on mobile, shown on md+ */}
      <div className="hidden md:flex items-center flex-1 max-w-xl mx-8">
        <div ref={searchRef} className="relative w-full">
          <form onSubmit={handleSearchSubmit}>
            <div className="relative w-full">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none"
                fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text" value={query}
                onChange={e => setQuery(sanitizeSearch(e.target.value))}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Search shoes by name..."
                maxLength={SEARCH_MAX_LENGTH}
                autoComplete="off"
                spellCheck={false}
                className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent
                           bg-gray-50 transition"
              />
              {query && (
                <button type="button"
                  onClick={() => { setQuery(''); setSuggestions([]); setShowSuggestions(false) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </form>

          {/* Suggestions dropdown */}
          {showSuggestions && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200
                            rounded-xl shadow-xl overflow-hidden z-50">
              {suggestions.length > 0 ? (
                <>
                  {suggestions.map(shoe => (
                    <button key={shoe.id} onMouseDown={() => handleSuggestionClick(shoe)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50
                                 border-b border-gray-50 last:border-0 transition text-left">
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                        {shoe.image_url
                          ? <img src={shoe.image_url} alt={shoe.name} className="w-full h-full object-contain p-1" />
                          : <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path d="M3 7h18M3 12h18M3 17h18" strokeLinecap="round" />
                            </svg>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{shoe.name}</p>
                        <p className="text-xs text-gray-400 truncate">{shoe.model_line}</p>
                      </div>
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
                  <button onMouseDown={handleSearchSubmit as never}
                    className="w-full px-4 py-2.5 text-xs text-gray-400 hover:bg-gray-50
                               border-t border-gray-100 flex items-center gap-2 transition">
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
      </div>

      {/* Nav links + Account - hidden on mobile */}
      <div className="hidden md:flex gap-6 text-sm font-medium items-center w-48 justify-end shrink-0">
        <Link href="/" className="hover:text-gray-500 transition">Home</Link>
        <Link href="/catalog" className="hover:text-gray-500 transition">Catalog</Link>

        {loadingAuth ? (
          <div className="text-gray-400">...</div>
        ) : !user ? (
          <Link href="/login">Login</Link>
        ) : (
          <div ref={accountRef} className="relative">
            <button onClick={() => setAccountOpen(!accountOpen)}
              className="flex items-center gap-1.5 hover:text-gray-500 transition">
              Account
              <svg className={`w-3 h-3 transition-transform duration-200 ${accountOpen ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {accountOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-200 shadow-lg rounded-xl p-2 z-50">

                {/* Email */}
                <p className="text-xs text-gray-400 px-2 py-1.5 border-b border-gray-100 truncate mb-1">
                  {user.email}
                </p>

                {/* Saved Shoes */}
                <Link href="/wishlist" onClick={() => setAccountOpen(false)}
                  className="flex items-center justify-between px-2 py-2 text-sm text-gray-700
                             hover:bg-gray-50 rounded-lg transition w-full">
                  <span className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor"
                      strokeWidth={2} viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5
                               2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09
                               C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5
                               c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                        strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Saved Shoes
                  </span>
                  {wishlistCount > 0 && (
                    <span className="text-xs bg-red-100 text-red-500 font-semibold px-2 py-0.5 rounded-full">
                      {wishlistCount}
                    </span>
                  )}
                </Link>

                {/* Questionnaire */}
                <Link href="/questionnaire" onClick={() => setAccountOpen(false)}
                  className="flex items-center gap-2.5 px-2 py-2 text-sm text-gray-700
                             hover:bg-gray-50 rounded-lg transition w-full">
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor"
                    strokeWidth={2} viewBox="0 0 24 24">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Shoe Fit Questionnaire
                </Link>

                {/* AI Recommendations */}
                <Link href="/recommendations" onClick={() => setAccountOpen(false)}
                  className="flex items-center gap-2.5 px-2 py-2 text-sm text-gray-700
                             hover:bg-gray-50 rounded-lg transition w-full">
                  <svg className="w-4 h-4 text-purple-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
                  </svg>
                  My Recommendations
                </Link>


                {/* Account Settings */}
                <Link href="/settings" onClick={() => setAccountOpen(false)}
                  className="flex items-center gap-2.5 px-2 py-2 text-sm text-gray-700
                             hover:bg-gray-50 rounded-lg transition w-full">
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor"
                    strokeWidth={2} viewBox="0 0 24 24">
                    <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Account Settings
                </Link>

                {/* Logout */}
                <button onClick={handleLogout}
                  className="flex items-center gap-2.5 px-2 py-2 text-sm text-red-500
                             hover:bg-red-50 rounded-lg transition w-full">
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
      </div>

      {/* Mobile search bar */}
      <div className="md:hidden px-4 pb-3">
        <div ref={searchRef} className="relative w-full">
          <form onSubmit={handleSearchSubmit}>
            <div className="relative w-full">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none"
                fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input type="text" value={query}
                onChange={e => setQuery(sanitizeSearch(e.target.value))}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Search shoes..."
                maxLength={SEARCH_MAX_LENGTH}
                autoComplete="off"
                className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-black bg-gray-50" />
              {query && (
                <button type="button"
                  onClick={() => { setQuery(''); setSuggestions([]); setShowSuggestions(false) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </form>
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200
                            rounded-xl shadow-xl overflow-hidden z-50">
              {suggestions.map(shoe => (
                <button key={shoe.id} onMouseDown={() => handleSuggestionClick(shoe)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0 text-left">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                    {shoe.image_url && <img src={shoe.image_url} alt={shoe.name} className="w-full h-full object-contain p-1" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{shoe.name}</p>
                    <p className="text-xs text-gray-400 truncate">{shoe.model_line}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 px-4 py-4 space-y-2 bg-white">
          <Link href="/" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-gray-700">Home</Link>
          <Link href="/catalog" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-gray-700">Catalog</Link>
          {user ? (
            <>
              <Link href="/wishlist" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-gray-700">Saved Shoes</Link>
              <Link href="/recommendations" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-gray-700">My Recommendations</Link>
              <Link href="/questionnaire" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-gray-700">Questionnaire</Link>
              <Link href="/settings" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-gray-700">Account Settings</Link>
              <button onClick={() => { handleLogout(); setMobileOpen(false) }} className="block py-2 text-sm font-medium text-red-500 w-full text-left">Logout</button>
            </>
          ) : (
            <Link href="/login" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-gray-700">Login</Link>
          )}
        </div>
      )}
    </nav>
  )
}
