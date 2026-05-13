'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'

// ── Brute force config ────────────────────────────────────────────────────
const MAX_ATTEMPTS   = 5                     // lock out after this many fails
const LOCKOUT_SECONDS = [0, 0, 10, 30, 60, 120]  // wait time per attempt count
// attempt 1 & 2: no wait, attempt 3: 10s, 4: 30s, 5+: 60–120s

export default function Login() {
  const router = useRouter()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  // Brute force state
  const [attempts, setAttempts]     = useState(0)
  const [cooldown, setCooldown]     = useState(0)   // seconds remaining
  const [lockedOut, setLockedOut]   = useState(false)
  const cooldownRef = useRef<NodeJS.Timeout | null>(null)

  // ── Countdown ticker ──────────────────────────────────────────────────
  useEffect(() => {
    if (cooldown <= 0) {
      setLockedOut(false)
      return
    }
    setLockedOut(true)
    cooldownRef.current = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => { if (cooldownRef.current) clearTimeout(cooldownRef.current) }
  }, [cooldown])

  // ── Login handler ─────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (lockedOut) return

    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      const newAttempts = attempts + 1
      setAttempts(newAttempts)

      if (newAttempts >= MAX_ATTEMPTS) {
        // Full lockout after max attempts
        const wait = LOCKOUT_SECONDS[Math.min(newAttempts, LOCKOUT_SECONDS.length - 1)]
        setCooldown(wait)
        setError(`Too many failed attempts. Please wait ${wait} seconds before trying again.`)
      } else {
        const wait = LOCKOUT_SECONDS[Math.min(newAttempts, LOCKOUT_SECONDS.length - 1)]
        if (wait > 0) {
          setCooldown(wait)
          setError(`Incorrect email or password. Please wait ${wait} seconds before trying again.`)
        } else {
          setError(`Incorrect email or password. ${MAX_ATTEMPTS - newAttempts} attempt${MAX_ATTEMPTS - newAttempts !== 1 ? 's' : ''} remaining.`)
        }
      }

      setLoading(false)
      return
    }

    // Success — reset attempt counter and redirect
    setAttempts(0)
    await supabase.auth.getSession()
    router.push('/')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !lockedOut) handleLogin()
  }

  const isDisabled = loading || lockedOut

  return (
    <div>
      <Navbar />

      <div className="flex justify-center items-center h-[70vh]">
        <div className="w-80 border p-6 rounded-xl shadow-sm">
          <h1 className="text-xl font-bold mb-4">Login</h1>

          <input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (!lockedOut) setError(null) }}
            onKeyDown={handleKeyDown}
            disabled={isDisabled}
            className={`w-full border p-2 mb-3 rounded transition
              ${error ? 'border-red-400 bg-red-50' : ''}
              ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          />

          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); if (!lockedOut) setError(null) }}
            onKeyDown={handleKeyDown}
            disabled={isDisabled}
            className={`w-full border p-2 mb-1 rounded transition
              ${error ? 'border-red-400 bg-red-50' : ''}
              ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          />

          {/* Error / lockout message */}
          {error && (
            <div className={`text-sm mb-3 mt-2 flex items-start gap-1.5 rounded-lg p-2.5
              ${lockedOut ? 'bg-orange-50 text-orange-600' : 'bg-red-50 text-red-500'}`}>
              <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" stroke="currentColor"
                strokeWidth={2.5} viewBox="0 0 24 24">
                {lockedOut
                  ? <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round"/></>
                  : <><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01" strokeLinecap="round"/></>
                }
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Cooldown timer bar */}
          {lockedOut && cooldown > 0 && (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-orange-500 mb-1">
                <span>🔒 Locked out</span>
                <span>{cooldown}s remaining</span>
              </div>
              <div className="w-full bg-orange-100 rounded-full h-1.5">
                <div
                  className="bg-orange-400 h-1.5 rounded-full transition-all duration-1000"
                  style={{
                    width: `${(cooldown / LOCKOUT_SECONDS[Math.min(attempts, LOCKOUT_SECONDS.length - 1)]) * 100}%`
                  }}
                />
              </div>
            </div>
          )}

          {!error && <div className="mb-3" />}

          <button
            onClick={handleLogin}
            disabled={isDisabled}
            className="w-full bg-black text-white py-2 rounded hover:bg-gray-800
                       disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Logging in...' : lockedOut ? `Wait ${cooldown}s` : 'Login'}
          </button>

          <p className="text-sm text-center mt-4">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-blue-500 hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
