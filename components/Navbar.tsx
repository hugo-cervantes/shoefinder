'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setOpen(false)
  }

  return (
    <nav className="flex justify-between items-center px-8 py-4 border-b relative">
      <h1 className="text-2xl font-bold">SoleMate</h1>

      <div className="flex gap-6 text-sm font-medium items-center">
        <Link href="/">Home</Link>
        <Link href="/catalog">Catalog</Link>

        {/* IMPORTANT: prevents login flash */}
        {loading ? (
          <div className="text-gray-400">...</div>
        ) : !user ? (
          <Link href="/login">Login</Link>
        ) : (
          <div className="relative">
            <button onClick={() => setOpen(!open)}>
              Account
            </button>

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
