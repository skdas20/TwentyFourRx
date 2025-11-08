'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await api.post('/auth/forgot-password', { email })
      setSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send reset email. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6">
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 p-8 text-center">
            <div className="text-6xl mb-4">📧</div>
            <h3 className="text-2xl font-bold text-blue-800 dark:text-blue-200 mb-4">Check Your Email</h3>
            <div className="space-y-3 text-sm text-blue-700 dark:text-blue-300">
              <p className="text-base">
                If an account exists for <span className="font-semibold text-blue-900 dark:text-blue-100">{email}</span>, you will receive a password reset link shortly.
              </p>
              <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
                <p className="text-xs">
                  ⏰ The reset link will expire in 1 hour for security reasons.
                </p>
              </div>
            </div>
          </div>
          <div className="text-center">
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 text-[var(--brand-blue)] hover:text-[var(--brand-blue-hi)] font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <h1 className="text-5xl font-bold mb-2">
              <span className="text-[var(--ink)]">24R</span>
              <span className="text-[var(--brand-blue)]">x</span>
            </h1>
          </Link>
          <h2 className="mt-6 text-3xl font-semibold text-[var(--ink)]">
            Reset your password
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 p-4">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[var(--ink)] mb-2">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="block w-full rounded-lg border border-[var(--border)] py-3 px-3 text-[var(--ink)] bg-[var(--surface)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] focus:border-transparent transition"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-lg bg-[var(--brand-blue)] py-3 px-3 text-base font-semibold text-white hover:bg-[var(--brand-blue-hi)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-blue)] disabled:opacity-50 transition shadow-lg shadow-[var(--brand-blue)]/25"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </div>

          <div className="text-center">
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 text-sm text-[var(--brand-blue)] hover:text-[var(--brand-blue-hi)] font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
