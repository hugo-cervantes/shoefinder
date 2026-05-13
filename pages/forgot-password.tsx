import { useState } from 'react'
import Link from 'next/link'
import Navbar from '../components/Navbar'
import { supabase } from '../lib/supabase'

function sanitizeEmail(value: string): string {
  return value.replace(/[<>"'%;()&+\\]/g, '').trim().slice(0, 254)
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim()) { setError('Please enter your email address.'); return }
    if (!isValidEmail(email)) { setError('Please enter a valid email address.'); return }

    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/reset-password` }
    )

    // Don't reveal whether the email exists or not — always show success
    // This prevents email enumeration attacks
    if (error) console.error('Reset error:', error.message)

    setLoading(false)
    setSent(true)
  }

  // ── Sent state ────────────────────────────────────────────────────────
  if (sent) {
    return (
      <div>
        <Navbar />
        <div className="flex justify-center items-center h-[70vh]">
          <div className="w-80 border p-6 rounded-xl shadow-sm text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-2">Check your email</h2>
            <p className="text-gray-500 text-sm mb-5">
              If an account exists for <span className="font-medium text-gray-700">{email}</span>,
              we've sent a password reset link. Check your inbox and spam folder.
            </p>
            <Link href="/login" className="text-sm text-black underline hover:text-gray-600 transition">
              ← Back to login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Navbar />

      <div className="flex justify-center items-center h-[70vh]">
        <div className="w-80 border p-6 rounded-xl shadow-sm">
          <h1 className="text-xl font-bold mb-1">Forgot Password</h1>
          <p className="text-sm text-gray-400 mb-5">
            Enter your email and we'll send you a reset link.
          </p>

          <form onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => { setEmail(sanitizeEmail(e.target.value)); setError(null) }}
              maxLength={254}
              autoComplete="email"
              disabled={loading}
              className={`w-full border p-2 rounded-lg text-sm mb-1 transition
                focus:outline-none focus:ring-2 focus:ring-black
                ${error ? 'border-red-400 bg-red-50' : 'border-gray-200'}
                ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            />

            {error && (
              <p className="text-red-500 text-xs mb-3 flex items-center gap-1">
                <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" strokeLinecap="round" />
                </svg>
                {error}
              </p>
            )}

            {!error && <div className="mb-3" />}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800
                         disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <p className="text-sm text-center mt-4">
            <Link href="/login" className="text-gray-400 hover:text-black transition">
              ← Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
