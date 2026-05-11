'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'

export default function Login() {
  const router = useRouter()

  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')

  const handleLogin = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('Error logging in:', error.message)
        return
      }

      // redirect on success
      await supabase.auth.getSession()
      router.push('/')
    } catch (error) {
      console.error('Error logging in:', error)
    }
  }

  return (
    <div>
      <Navbar />

      <div className="flex justify-center items-center h-[70vh]">
        <div className="w-80 border p-6 rounded-xl">
          <h1 className="text-xl font-bold mb-4">Login</h1>

          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border p-2 mb-3 rounded"
          />

          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border p-2 mb-4 rounded"
          />

          <button
            onClick={handleLogin}
            className="w-full bg-black text-white py-2 rounded"
          >
            Login
          </button>

          {/* SIGNUP LINK */}
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
