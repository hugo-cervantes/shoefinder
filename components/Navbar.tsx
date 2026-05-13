'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

type Shoe = {
  id: string
  name: string
}

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  // search state
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Shoe[]>([])
  const [searchOpen, setSearchOpen] = useState(false)

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

    return () => {
      data.subscription.unsubscribe()
    }
  }, [])

  // search handler
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const delay = setTimeout(async () => {
      const { data, error } = await supabase
        .from('shoe')
        .select('id, name')
        .ilike('name', `%${query}%`)
        .limit(5)

      if (!error && data) {
        setResults(data)
        setSearchOpen(true)
      }
    }, 300)

    return () => clearTimeout(delay)
  }, [query])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setOpen(false)
  }

  return (
    <nav className="flex justify-between items-center px-8 py-4 border-b relative">
      
      {/* LEFT */}
      <h1 className="text-2xl font-bold">SoleMate</h1>

      {/* CENTER SEARCH */}
      <div className="relative w-1/3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search shoes..."
          className="w-full border rounded-md px-3 py-2 text-sm"
          onFocus={() => query && setSearchOpen(true)}
          onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
        />

        {searchOpen && results.length > 0 && (
          <div className="absolute left-0 right-0 mt-2 bg-white border rounded-md shadow-md z-50 max-h-96 overflow-y-auto">
            {results.map((shoe) => (
              <Link
                key={shoe.id}
                href={`/shoes/${shoe.id}`}
                className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100"
                onClick={() => setSearchOpen(false)}
              >
                {/* IMAGE */}
                <div className="w-10 h-10 bg-gray-100 rounded overflow-hidden flex items-center justify-center flex-shrink-0">
                  <img
                    src={shoe.image_url}
                    alt={shoe.name}
                    className="w-full h-full object-contain"
                  />
                </div>

        {/* TEXT */}
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900">
            {shoe.name}
          </span>
        </div>
      </Link>
    ))}
  </div>
)}

      {/* RIGHT NAV */}
      <div className="flex gap-6 text-sm font-medium items-center">
        <Link href="/">Home</Link>
        <Link href="/catalog">Catalog</Link>

        {loading ? (
          <div className="text-gray-400">...</div>
        ) : !user ? (
          <Link href="/login">Login</Link>
        ) : (
          <div className="relative">
            <button onClick={() => setOpen(!open)}>Account</button>

            {open && (
              <div className="absolute right-0 mt-2 w-48 border bg-white shadow-md rounded-md p-3 z-50">
                <p className="text-sm mb-2">{user.email}</p>

                <button
                  onClick={handleLogout}
                  className="text-red-500 text-sm"
                >
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
