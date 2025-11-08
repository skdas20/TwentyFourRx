'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link')
      setValidating(false)
      return
    }

    // Validate token
    api.get(`/auth/validate-reset-token/${token}`)
      .then((res) => {
        setTokenValid(res.data.valid)
        if (!res.data.valid) {
          setError('This reset link is invalid or has expired')
        }
      })
      .catch(() => {
        setError('Failed to validate reset link')
      })
      .finally(() => {
        setValidating(false)
      })
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    setLoading(true)

    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword,
      })
      setSuccess(true)
      setTimeout(() => {
        router.push('/auth/login')
      }, 3000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (validating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand-blue)] mx-auto mb-4"></div>
          <p className="text-[var(--muted)]">Validating reset link...</p>
        </div>
      </div>
    )
  }

  if (!tokenValid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6">
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 p-8 text-center">
            <div className="text-6xl mb-4">❌</div>
            <h3 className="text-2xl font-bold text-red-800 dark:text-red-200 mb-4">Invalid Reset Link</h3>
            <p className="text-sm text-red-700 dark:text-red-300 mb-6">
              {error || 'This password reset link is invalid or has expired.'}
            </p>
            <Link
              href="/auth/forgot-password"
              className="inline-block px-6 py-3 bg-[var(--brand-blue)] text-white rounded-lg hover:bg-[var(--brand-blue-hi)] transition font-semibold"
            >
              Request New Link
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6">
          <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 p-8 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-2xl font-bold text-green-800 dark:text-green-200 mb-4">Password Reset Successful!</h3>
            <p className="text-sm text-green-700 dark:text-green-300 mb-6">
              Your password has been changed successfully. You can now log in with your new password.
            </p>
            <p className="text-xs text-green-600 dark:text-green-400">
              Redirecting to login page...
            </p>
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
            Set new password
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Enter your new password below
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 p-4">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-[var(--ink)] mb-2">
              New Password
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              className="block w-full rounded-lg border border-[var(--border)] py-3 px-3 text-[var(--ink)] bg-[var(--surface)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] focus:border-transparent transition"
              placeholder="Enter new password"
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
            />
            <p className="mt-1 text-xs text-[var(--muted)]">
              Must be at least 8 characters long
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--ink)] mb-2">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              className="block w-full rounded-lg border border-[var(--border)] py-3 px-3 text-[var(--ink)] bg-[var(--surface)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] focus:border-transparent transition"
              placeholder="Confirm new password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-lg bg-[var(--brand-blue)] py-3 px-3 text-base font-semibold text-white hover:bg-[var(--brand-blue-hi)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-blue)] disabled:opacity-50 transition shadow-lg shadow-[var(--brand-blue)]/25"
            >
              {loading ? 'Resetting password...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand-blue)]"></div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
