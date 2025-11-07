'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    roleCode: 'TRADER' as 'TRADER' | 'SELLER',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      await authApi.register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        roleCode: formData.roleCode,
      })

      setSuccess(true)
      setTimeout(() => {
        router.push('/auth/login')
      }, 3000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-4">
          <div className="rounded-lg bg-green-50 border border-green-200 p-6">
            <h3 className="text-lg font-semibold text-green-800 mb-2">✅ Registration Successful!</h3>
            <div className="space-y-2 text-sm text-green-700">
              <p className="font-medium">📧 Check your email for your login credentials!</p>
              <p>We've sent your username and password to <span className="font-semibold">{formData.email}</span></p>
              <p className="mt-3 pt-3 border-t border-green-200 text-green-600">
                ⏳ Your account is pending admin approval. You'll receive another email once approved.
              </p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm text-[var(--muted)]">Redirecting to login page...</p>
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
            Create your account
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Already have an account?{' '}
            <Link href="/auth/login" className="font-medium text-[var(--brand-blue)] hover:text-[var(--brand-blue-hi)]">
              Sign in
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-lg bg-[var(--down-red)]/10 border border-[var(--down-red)]/30 p-4">
              <p className="text-sm text-[var(--down-red)]">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-[var(--ink)] mb-2">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="block w-full rounded-lg border border-[var(--border)] py-3 px-3 text-[var(--ink)] bg-[var(--surface)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] focus:border-transparent transition"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--ink)] mb-2">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="block w-full rounded-lg border border-[var(--border)] py-3 px-3 text-[var(--ink)] bg-[var(--surface)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] focus:border-transparent transition"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-[var(--ink)] mb-2">
                Phone (Optional)
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="block w-full rounded-lg border border-[var(--border)] py-3 px-3 text-[var(--ink)] bg-[var(--surface)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] focus:border-transparent transition"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="roleCode" className="block text-sm font-medium text-[var(--ink)] mb-2">
                Account Type
              </label>
              <select
                id="roleCode"
                name="roleCode"
                className="block w-full rounded-lg border border-[var(--border)] py-3 px-3 text-[var(--ink)] bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] focus:border-transparent transition"
                value={formData.roleCode}
                onChange={(e) => setFormData({ ...formData, roleCode: e.target.value as any })}
              >
                <option value="TRADER">Trader</option>
                <option value="SELLER">Seller</option>
              </select>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--ink)] mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="block w-full rounded-lg border border-[var(--border)] py-3 px-3 text-[var(--ink)] bg-[var(--surface)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] focus:border-transparent transition"
                placeholder="Create a password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--ink)] mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="block w-full rounded-lg border border-[var(--border)] py-3 px-3 text-[var(--ink)] bg-[var(--surface)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] focus:border-transparent transition"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-lg bg-[var(--brand-blue)] py-3 px-3 text-base font-semibold text-white hover:bg-[var(--brand-blue-hi)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-blue)] disabled:opacity-50 transition shadow-lg shadow-[var(--brand-blue)]/25"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
