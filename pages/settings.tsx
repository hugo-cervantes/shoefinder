import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Navbar from '../components/Navbar'
import { supabase } from '../lib/supabase'

// ── Sanitization (same as register) ──────────────────────────────────────
function sanitizeName(value: string): string {
  return value.replace(/[<>"'%;()&+\\0-9]/g, '').slice(0, 50)
}
function sanitizeEmail(value: string): string {
  return value.replace(/[<>"'%;()&+\\]/g, '').trim().slice(0, 254)
}
function sanitizePassword(value: string): string {
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').slice(0, 128)
}
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export default function AccountSettings() {
  const router = useRouter()

  // Profile fields
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [email,     setEmail]     = useState('')

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // UI state per section
  const [nameSave,     setNameSave]     = useState<SaveState>('idle')
  const [emailSave,    setEmailSave]    = useState<SaveState>('idle')
  const [passwordSave, setPasswordSave] = useState<SaveState>('idle')

  const [nameError,     setNameError]     = useState<string | null>(null)
  const [emailError,    setEmailError]    = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)

  // ── Load current user data ──────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      setEmail(user.email ?? '')

      const { data: profile } = await supabase
        .from('user_profile')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single()

      if (profile) {
        setFirstName(profile.first_name ?? '')
        setLastName(profile.last_name  ?? '')
      }

      setLoading(false)
    }
    load()
  }, [])

  // ── Save name ─────────────────────────────────────────────────────────
  const handleSaveName = async () => {
    setNameError(null)

    if (!firstName.trim() || firstName.trim().length < 2) {
      setNameError('First name must be at least 2 characters.')
      return
    }
    if (!lastName.trim() || lastName.trim().length < 2) {
      setNameError('Last name must be at least 2 characters.')
      return
    }

    setNameSave('saving')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('user_profile')
      .update({ first_name: firstName.trim(), last_name: lastName.trim() })
      .eq('id', user.id)

    if (error) {
      setNameError('Failed to update name. Please try again.')
      setNameSave('error')
    } else {
      setNameSave('saved')
      setTimeout(() => setNameSave('idle'), 3000)
    }
  }

  // ── Save email ────────────────────────────────────────────────────────
  const handleSaveEmail = async () => {
    setEmailError(null)

    if (!email.trim()) { setEmailError('Email is required.'); return }
    if (!isValidEmail(email)) { setEmailError('Please enter a valid email address.'); return }

    setEmailSave('saving')

    // Update in Supabase Auth
    const { error: authError } = await supabase.auth.updateUser({ email: email.trim().toLowerCase() })

    if (authError) {
      setEmailError(
        authError.message.includes('already')
          ? 'This email is already in use.'
          : 'Failed to update email. Please try again.'
      )
      setEmailSave('error')
      return
    }

    // Also update in user_profile
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('user_profile').update({ email: email.trim().toLowerCase() }).eq('id', user.id)
    }

    setEmailSave('saved')
    setTimeout(() => setEmailSave('idle'), 3000)
  }

  // ── Save password ─────────────────────────────────────────────────────
  const handleSavePassword = async () => {
    setPasswordError(null)

    if (!currentPassword)    { setPasswordError('Please enter your current password.'); return }
    if (!newPassword)        { setPasswordError('Please enter a new password.'); return }
    if (newPassword.length < 8) { setPasswordError('New password must be at least 8 characters.'); return }
    if (newPassword !== confirmPassword) { setPasswordError('New passwords do not match.'); return }
    if (newPassword === currentPassword) { setPasswordError('New password must be different from your current password.'); return }

    setPasswordSave('saving')

    // Re-authenticate with current password first
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })

    if (signInError) {
      setPasswordError('Current password is incorrect.')
      setPasswordSave('error')
      return
    }

    // Update to new password
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })

    if (updateError) {
      setPasswordError('Failed to update password. Please try again.')
      setPasswordSave('error')
    } else {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordSave('saved')
      setTimeout(() => setPasswordSave('idle'), 3000)
    }
  }

  // ── Reusable status button label ──────────────────────────────────────
  const btnLabel = (state: SaveState, idle: string) => {
    if (state === 'saving') return 'Saving...'
    if (state === 'saved')  return '✓ Saved'
    return idle
  }

  const btnClass = (state: SaveState) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition disabled:cursor-not-allowed
     ${state === 'saved'
       ? 'bg-green-500 text-white'
       : state === 'error'
         ? 'bg-red-500 text-white'
         : 'bg-black text-white hover:bg-gray-800 disabled:opacity-50'
     }`

  const fieldClass = (hasError: boolean) =>
    `w-full border p-2 rounded-lg text-sm transition focus:outline-none focus:ring-2
     ${hasError ? 'border-red-400 bg-red-50 focus:ring-red-300' : 'border-gray-200 focus:ring-black'}`

  if (loading) return (
    <div className="min-h-screen bg-gray-50"><Navbar />
      <p className="text-center mt-20 text-gray-400">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-8">Account Settings</h1>

        {/* ── Name ── */}
        <section className="bg-white rounded-2xl p-6 shadow-sm mb-4">
          <h2 className="text-base font-semibold mb-4">Name</h2>

          <div className="flex gap-3 mb-2">
            <div className="flex-1">
              <input
                value={firstName}
                onChange={e => { setFirstName(sanitizeName(e.target.value)); setNameError(null) }}
                placeholder="First name"
                maxLength={50}
                className={fieldClass(!!nameError && !firstName.trim())}
              />
            </div>
            <div className="flex-1">
              <input
                value={lastName}
                onChange={e => { setLastName(sanitizeName(e.target.value)); setNameError(null) }}
                placeholder="Last name"
                maxLength={50}
                className={fieldClass(!!nameError && !lastName.trim())}
              />
            </div>
          </div>

          {nameError && <p className="text-red-500 text-xs mb-2">{nameError}</p>}

          <div className="flex justify-end mt-3">
            <button
              onClick={handleSaveName}
              disabled={nameSave === 'saving'}
              className={btnClass(nameSave)}
            >
              {btnLabel(nameSave, 'Save Name')}
            </button>
          </div>
        </section>

        {/* ── Email ── */}
        <section className="bg-white rounded-2xl p-6 shadow-sm mb-4">
          <h2 className="text-base font-semibold mb-4">Email Address</h2>

          <input
            type="email"
            value={email}
            onChange={e => { setEmail(sanitizeEmail(e.target.value)); setEmailError(null) }}
            placeholder="Email"
            maxLength={254}
            autoComplete="email"
            className={fieldClass(!!emailError)}
          />

          {emailError && <p className="text-red-500 text-xs mt-1 mb-1">{emailError}</p>}

          <p className="text-xs text-gray-400 mt-2">
            A confirmation link will be sent to your new email address.
          </p>

          <div className="flex justify-end mt-3">
            <button
              onClick={handleSaveEmail}
              disabled={emailSave === 'saving'}
              className={btnClass(emailSave)}
            >
              {btnLabel(emailSave, 'Save Email')}
            </button>
          </div>
        </section>

        {/* ── Password ── */}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-semibold mb-4">Change Password</h2>

          <div className="space-y-2">
            <input
              type="password"
              value={currentPassword}
              onChange={e => { setCurrentPassword(sanitizePassword(e.target.value)); setPasswordError(null) }}
              placeholder="Current password"
              maxLength={128}
              autoComplete="current-password"
              className={fieldClass(!!passwordError && !currentPassword)}
            />
            <input
              type="password"
              value={newPassword}
              onChange={e => { setNewPassword(sanitizePassword(e.target.value)); setPasswordError(null) }}
              placeholder="New password"
              maxLength={128}
              autoComplete="new-password"
              className={fieldClass(!!passwordError && !!currentPassword && !newPassword)}
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={e => { setConfirmPassword(sanitizePassword(e.target.value)); setPasswordError(null) }}
              placeholder="Confirm new password"
              maxLength={128}
              autoComplete="new-password"
              className={fieldClass(!!passwordError && newPassword !== confirmPassword)}
            />
          </div>

          {passwordError && <p className="text-red-500 text-xs mt-2">{passwordError}</p>}

          <div className="flex justify-end mt-3">
            <button
              onClick={handleSavePassword}
              disabled={passwordSave === 'saving'}
              className={btnClass(passwordSave)}
            >
              {btnLabel(passwordSave, 'Update Password')}
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
