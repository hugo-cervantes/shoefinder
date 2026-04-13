'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [open, setOpen] = useState<boolean>(false)

  useEffect(() => {
    // Get current session on load
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null)
    })

    // Listen for login/logout changes
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    const { subscription } = data

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleLogout = async (): Promise<void> => {
    await supabase.auth.signOut()
    setOpen(false)
  }

  return (
    <nav className="flex justify-between items-center px-8 py-4 border-b relative">
      <h1 className="text-2xl font-bold">SoleMate</h1>

      <div className="flex gap-6 text-sm font-medium items-center">
        <Link href="/">Home</Link>
        <Link href="/catalog">Catalog</Link>

        {!user ? (
          <Link href="/login">Login</Link>
        ) : (
          <div className="relative">
            <button
              onClick={() => setOpen(!open)}
              className="hover:underline"
            >
              Account
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-48 border bg-white shadow-md rounded-md p-3 z-50">
                <p className="text-sm mb-2">{user?.email}</p>

                <button
                  onClick={handleLogout}
                  className="text-red-500 text-sm hover:underline"
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
