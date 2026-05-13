import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Navbar from '../components/Navbar'
import { supabase } from '../lib/supabase'

function sanitizePassword(value: string): string {
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').slice(0, 128)
}

export default function ResetPassword() {
  const router = useRouter()

  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [success,  setSuccess]  = useState(false)
  const [validSession, setValidSession] = useState(false)
  const [checking,     setChecking]     = useState(true)

  // ── Supabase sends the token in the URL hash — exchange it for a session
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'PASSWORD_RECOVERY' && session) {
          setValidSession(true)
        }
        setChecking(false)
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!newPassword)            { setError('Please enter a new password.'); return }
    if (newPassword.length < 8)  { setError('Password must be at least 8 characters.'); return }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setError('Failed to reset password. Your link may have expired — request a new one.')
      setLoading(false)
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/'), 2500)
  }

  const fieldClass = (hasError: boolean) =>
    `w-full border p-2 rounded-lg text-sm transition focus:outline-none focus:ring-2 focus:ring-black
     ${hasError ? 'border-red-400 bg-red-50' : 'border-gray-200'}`

  // ── Checking session ──────────────────────────────────────────────────
  if (checking) return (
    <div><Navbar />
      <div className="flex justify-center items-center h-[70vh]">
        <p className="text-gray-400 text-sm">Verifying reset link...</p>
      </div>
    </div>
  )

  // ── Invalid / expired link ────────────────────────────────────────────
  if (!validSession && !checking) return (
    <div><Navbar />
      <div className="flex justify-center items-center h-[70vh]">
        <div className="w-80 border p-6 rounded-xl shadow-sm text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold mb-2">Link expired or invalid</h2>
          <p className="text-gray-400 text-sm mb-5">
            This reset link has expired or already been used. Request a new one.
          </p>
          <Link href="/forgot-password"
            className="inline-block bg-black text-white px-5 py-2 rounded-lg text-sm hover:bg-gray-800 transition">
            Request New Link
          </Link>
        </div>
      </div>
    </div>
  )

  // ── Success ───────────────────────────────────────────────────────────
  if (success) return (
    <div><Navbar />
      <div className="flex justify-center items-center h-[70vh]">
        <div className="w-80 border p-6 rounded-xl shadow-sm text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold mb-1">Password updated!</h2>
          <p className="text-gray-400 text-sm">Redirecting you to the home page...</p>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <Navbar />
      <div className="flex justify-center items-center h-[70vh]">
        <div className="w-80 border p-6 rounded-xl shadow-sm">
          <h1 className="text-xl font-bold mb-1">Reset Password</h1>
          <p className="text-sm text-gray-400 mb-5">Enter your new password below.</p>

          <form onSubmit={handleReset} className="space-y-2">
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={e => { setNewPassword(sanitizePassword(e.target.value)); setError(null) }}
              maxLength={128}
              autoComplete="new-password"
              className={fieldClass(!!error && !newPassword)}
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={e => { setConfirmPassword(sanitizePassword(e.target.value)); setError(null) }}
              maxLength={128}
              autoComplete="new-password"
              className={fieldClass(!!error && newPassword !== confirmPassword)}
            />

            {error && (
              <p className="text-red-500 text-xs flex items-center gap-1 pt-1">
                <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" strokeLinecap="round" />
                </svg>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800
                         disabled:opacity-50 disabled:cursor-not-allowed transition text-sm mt-4"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
