'use client'

import { useState } from 'react'
import { useRouter } from 'next/router'
import { register } from '../lib/supabase'
import Navbar from '../components/Navbar'
import Link from 'next/link'

// -- Sanitization ----------------------------------------------------------
function sanitizeName(value: string): string {
  return value
    .replace(/[<>"'%;()&+\\0-9]/g, '')  // no numbers or injection chars in names
    .slice(0, 50)
}

function sanitizeEmail(value: string): string {
  return value
    .replace(/[<>"'%;()&+\\]/g, '')
    .trim()
    .slice(0, 254)
}

function sanitizePassword(value: string): string {
  return value
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')  // strip control chars
    .slice(0, 128)
}

// -- Validation ------------------------------------------------------------
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function getPasswordStrength(password: string): {
  score: number       // 0-4
  label: string
  color: string
  feedback: string | null
} {
  if (password.length === 0) return { score: 0, label: '', color: '', feedback: null }

  let score = 0
  if (password.length >= 8)  score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  // Cap at 4
  score = Math.min(score, 4)

  const levels = [
    { label: 'Too short',  color: 'bg-red-400',    feedback: 'Use at least 8 characters.' },
    { label: 'Weak',       color: 'bg-red-400',    feedback: 'Add uppercase and lowercase letters.' },
    { label: 'Fair',       color: 'bg-yellow-400', feedback: 'Add numbers or symbols to strengthen it.' },
    { label: 'Good',       color: 'bg-blue-400',   feedback: 'Almost there - try adding a symbol.' },
    { label: 'Strong',     color: 'bg-green-400',  feedback: null },
  ]

  return { score, ...levels[score] }
}

interface FieldErrors {
  firstName?: string
  lastName?: string
  email?: string
  password?: string
  general?: string
}

export default function Register() {
  const router = useRouter()

  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')

  const [errors,  setErrors]  = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const passwordStrength = getPasswordStrength(password)

  // -- Validate all fields -----------------------------------------------
  const validate = (): FieldErrors => {
    const e: FieldErrors = {}

    if (!firstName.trim())
      e.firstName = 'First name is required.'
    else if (firstName.trim().length < 2)
      e.firstName = 'First name must be at least 2 characters.'

    if (!lastName.trim())
      e.lastName = 'Last name is required.'
    else if (lastName.trim().length < 2)
      e.lastName = 'Last name must be at least 2 characters.'

    if (!email.trim())
      e.email = 'Email is required.'
    else if (!isValidEmail(email))
      e.email = 'Please enter a valid email address.'

    if (!password)
      e.password = 'Password is required.'
    else if (password.length < 8)
      e.password = 'Password must be at least 8 characters.'
    else if (passwordStrength.score < 2)
      e.password = 'Password is too weak. Add uppercase letters, numbers, or symbols.'

    return e
  }

  // -- Submit ------------------------------------------------------------
  const handleRegister = async () => {
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setErrors({})
    setLoading(true)

    try {
      const user = await register(
        email.trim().toLowerCase(),
        password,
        firstName.trim(),
        lastName.trim()
      )

      if (user) {
        setSuccess(true)
        setTimeout(() => router.push('/'), 1500)
      }
    } catch (error: any) {
      // Supabase errors come through as thrown errors from your register() helper
      const msg: string = error?.message ?? ''

      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists')) {
        setErrors({ email: 'An account with this email already exists.' })
      } else if (msg.toLowerCase().includes('password')) {
        setErrors({ password: 'Password does not meet requirements.' })
      } else {
        setErrors({ general: 'Something went wrong. Please try again.' })
      }
    }

    setLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) handleRegister()
  }

  const fieldClass = (hasError: boolean) =>
    `w-full border p-2 rounded transition focus:outline-none focus:ring-2
     ${hasError
       ? 'border-red-400 bg-red-50 focus:ring-red-300'
       : 'border-gray-200 focus:ring-black'
     }`

  // -- Success state -----------------------------------------------------
  if (success) {
    return (
      <div>
        <Navbar />
        <div className="flex justify-center items-center h-[70vh]">
          <div className="w-80 border p-6 rounded-xl shadow-sm text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-1">Account created!</h2>
            <p className="text-gray-400 text-sm">Redirecting you to the home page...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Navbar />

      <div className="flex justify-center items-center h-[80vh]">
        <div className="w-80 border p-6 rounded-xl shadow-sm">
          <h1 className="text-xl font-bold mb-4">Create Account</h1>

          {/* General error */}
          {errors.general && (
            <div className="mb-3 text-sm bg-red-50 border border-red-200 text-red-500
                            rounded-lg p-2.5 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" strokeLinecap="round" />
              </svg>
              {errors.general}
            </div>
          )}

          {/* First Name */}
          <div className="mb-2">
            <input
              placeholder="First Name"
              value={firstName}
              onChange={(e) => { setFirstName(sanitizeName(e.target.value)); setErrors(p => ({ ...p, firstName: undefined })) }}
              onKeyDown={handleKeyDown}
              disabled={loading}
              maxLength={50}
              className={fieldClass(!!errors.firstName)}
            />
            {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
          </div>

          {/* Last Name */}
          <div className="mb-2">
            <input
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => { setLastName(sanitizeName(e.target.value)); setErrors(p => ({ ...p, lastName: undefined })) }}
              onKeyDown={handleKeyDown}
              disabled={loading}
              maxLength={50}
              className={fieldClass(!!errors.lastName)}
            />
            {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
          </div>

          {/* Email */}
          <div className="mb-2">
            <input
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(sanitizeEmail(e.target.value)); setErrors(p => ({ ...p, email: undefined })) }}
              onKeyDown={handleKeyDown}
              disabled={loading}
              maxLength={254}
              autoComplete="email"
              className={fieldClass(!!errors.email)}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          {/* Password */}
          <div className="mb-1">
            <input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(sanitizePassword(e.target.value)); setErrors(p => ({ ...p, password: undefined })) }}
              onKeyDown={handleKeyDown}
              disabled={loading}
              maxLength={128}
              autoComplete="new-password"
              className={fieldClass(!!errors.password)}
            />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>

          {/* Password strength meter */}
          {password.length > 0 && (
            <div className="mb-3 mt-2">
              <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4].map((bar) => (
                  <div key={bar}
                    className={`h-1 flex-1 rounded-full transition-all duration-300
                      ${passwordStrength.score >= bar ? passwordStrength.color : 'bg-gray-200'}`}
                  />
                ))}
              </div>
              <div className="flex justify-between items-center">
                <span className={`text-xs font-medium
                  ${passwordStrength.score <= 1 ? 'text-red-400'
                    : passwordStrength.score === 2 ? 'text-yellow-500'
                    : passwordStrength.score === 3 ? 'text-blue-400'
                    : 'text-green-500'}`}>
                  {passwordStrength.label}
                </span>
                {passwordStrength.feedback && (
                  <span className="text-xs text-gray-400">{passwordStrength.feedback}</span>
                )}
              </div>
            </div>
          )}

          {!password && <div className="mb-3" />}

          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full bg-black text-white py-2 rounded hover:bg-gray-800
                       disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <p className="text-sm text-center mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-500 hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
