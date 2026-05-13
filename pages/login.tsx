'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'

// ── Config ────────────────────────────────────────────────────────────────
const FREE_ATTEMPTS     = 5      // no punishment for first 5 fails
const RESET_AFTER_MS    = 30 * 60 * 1000  // reset attempt count after 30 min of inactivity

// Lockout durations for attempts beyond FREE_ATTEMPTS (in seconds)
// attempt 6 → 15s, 7 → 30s, 8 → 60s, 9 → 120s, 10+ → 300s
const LOCKOUT_SCHEDULE  = [15, 30, 60, 120, 300]

// ── Input sanitization ────────────────────────────────────────────────────
function sanitizeEmail(value: string): string {
  // Allow only valid email characters — strip anything suspicious
  return value
    .replace(/[<>"'%;()&+\\]/g, '')   // strip common injection chars
    .trim()
    .slice(0, 254)                     // max email length per RFC 5321
}

function sanitizePassword(value: string): string {
  // Passwords can have most chars, but strip null bytes and control characters
  // Also cap length to prevent DoS via huge password hashing
  return value
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')  // strip control chars
    .slice(0, 128)                                          // max 128 chars
}

function isValidEmail(email: string): boolean {
  // Basic email format check — not exhaustive but catches obvious bad input
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function Login() {
  const router = useRouter()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  // Brute force state — stored in refs so they survive re-renders but don't cause extra ones
  const attemptsRef     = useRef(0)
  const lastAttemptRef  = useRef<number | null>(null)  // timestamp of last failed attempt
  const [attempts, setAttempts] = useState(0)          // mirror for rendering
  const [cooldown, setCooldown] = useState(0)
  const [lockedOut, setLockedOut] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // ── Attempt counter auto-reset after 30 min of no activity ───────────
  const checkAndResetAttempts = () => {
    if (lastAttemptRef.current === null) return
    const elapsed = Date.now() - lastAttemptRef.current
    if (elapsed >= RESET_AFTER_MS) {
      attemptsRef.current = 0
      setAttempts(0)
      lastAttemptRef.current = null
      setError(null)
    }
  }

  // ── Countdown ticker ──────────────────────────────────────────────────
  useEffect(() => {
    if (cooldown <= 0) {
      setLockedOut(false)
      return
    }
    setLockedOut(true)
    timerRef.current = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [cooldown])

  // ── Handle email input ────────────────────────────────────────────────
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeEmail(e.target.value)
    setEmail(sanitized)
    if (!lockedOut) setError(null)
  }

  // ── Handle password input ─────────────────────────────────────────────
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizePassword(e.target.value)
    setPassword(sanitized)
    if (!lockedOut) setError(null)
  }

  // ── Login handler ─────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (lockedOut) return

    // Check if attempts should be reset due to inactivity
    checkAndResetAttempts()

    // Client-side validation before hitting Supabase
    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.')
      return
    }

    if (!password) {
      setError('Please enter your password.')
      return
    }

    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (error) {
      const newAttempts = attemptsRef.current + 1
      attemptsRef.current = newAttempts
      setAttempts(newAttempts)
      lastAttemptRef.current = Date.now()

      if (newAttempts <= FREE_ATTEMPTS) {
        // ── Free attempts: just show remaining count, no lockout ──
        const remaining = FREE_ATTEMPTS - newAttempts
        if (remaining === 0) {
          setError(`Incorrect email or password. This is your last free attempt — you will be locked out next time.`)
        } else {
          setError(`Incorrect email or password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining before lockout.`)
        }
      } else {
        // ── Lockout phase: escalating wait times ──
        const lockoutIndex = Math.min(newAttempts - FREE_ATTEMPTS - 1, LOCKOUT_SCHEDULE.length - 1)
        const waitSeconds  = LOCKOUT_SCHEDULE[lockoutIndex]
        setCooldown(waitSeconds)
        setError(`Too many failed attempts. Please wait ${waitSeconds} seconds before trying again.`)
      }

      setLoading(false)
      return
    }

    // ── Success ──
    attemptsRef.current  = 0
    lastAttemptRef.current = null
    setAttempts(0)
    await supabase.auth.getSession()
    router.push('/')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !lockedOut && !loading) handleLogin()
  }

  const isDisabled      = loading || lockedOut
  const inWarningZone   = attempts > 0 && attempts <= FREE_ATTEMPTS
  const lockoutIndex    = Math.min(attempts - FREE_ATTEMPTS - 1, LOCKOUT_SCHEDULE.length - 1)
  const maxCooldown     = lockoutIndex >= 0 ? LOCKOUT_SCHEDULE[lockoutIndex] : 1

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
            onChange={handleEmailChange}
            onKeyDown={handleKeyDown}
            disabled={isDisabled}
            maxLength={254}
            autoComplete="email"
            className={`w-full border p-2 mb-3 rounded transition
              ${error && !lockedOut ? 'border-red-400 bg-red-50' : ''}
              ${lockedOut ? 'border-orange-300 bg-orange-50' : ''}
              ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
          />

          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={handlePasswordChange}
            onKeyDown={handleKeyDown}
            disabled={isDisabled}
            maxLength={128}
            autoComplete="current-password"
            className={`w-full border p-2 mb-1 rounded transition
              ${error && !lockedOut ? 'border-red-400 bg-red-50' : ''}
              ${lockedOut ? 'border-orange-300 bg-orange-50' : ''}
              ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
          />

          {/* Error / warning message */}
          {error && (
            <div className={`text-sm mt-2 mb-3 flex items-start gap-1.5 rounded-lg p-2.5
              ${lockedOut
                ? 'bg-orange-50 text-orange-600 border border-orange-200'
                : inWarningZone
                  ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                  : 'bg-red-50 text-red-500 border border-red-200'
              }`}>
              <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" stroke="currentColor"
                strokeWidth={2.5} viewBox="0 0 24 24">
                {lockedOut ? (
                  <>
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round" />
                  </>
                ) : (
                  <>
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
                  </>
                )}
              </svg>
              <span>{error}</span>
            </div>
          )}

          {!error && <div className="mb-3" />}

          {/* Countdown bar during lockout */}
          {lockedOut && cooldown > 0 && (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-orange-500 mb-1">
                <span>🔒 Locked out</span>
                <span>{cooldown}s remaining</span>
              </div>
              <div className="w-full bg-orange-100 rounded-full h-1.5">
                <div
                  className="bg-orange-400 h-1.5 rounded-full transition-all duration-1000"
                  style={{ width: `${(cooldown / maxCooldown) * 100}%` }}
                />
              </div>
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={isDisabled}
            className="w-full bg-black text-white py-2 rounded hover:bg-gray-800
                       disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Logging in...' : lockedOut ? `Wait ${cooldown}s` : 'Login'}
          </button>

          <div className="mt-4 space-y-2 text-center">
            <p className="text-sm">
              <Link href="/forgot-password" className="text-gray-400 hover:text-black transition text-sm">
                Forgot your password?
              </Link>
            </p>
            <p className="text-sm">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-blue-500 hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
