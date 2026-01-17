'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import Link from 'next/link'
import Logo from '@/components/Logo'

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    roleCode: 'SELLER' as 'TRADER' | 'SELLER',
    dlNumber: '',
    gstin: '',
    address: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [credentials, setCredentials] = useState<{password?: string} | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // ... (formData creation) ...
      const formDataToSend = new FormData()
      formDataToSend.append('name', formData.name)
      formDataToSend.append('email', formData.email)
      if (formData.phone) formDataToSend.append('phone', formData.phone)
      formDataToSend.append('roleCode', formData.roleCode)
      formDataToSend.append('dlNumber', formData.dlNumber)
      formDataToSend.append('gstin', formData.gstin)
      formDataToSend.append('address', formData.address)

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'
      const response = await axios.post(`${API_URL}/auth/register`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      if (response.data?.credentials) {
        setCredentials(response.data.credentials)
      }
      setSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6">
          <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 p-8 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-2xl font-bold text-green-800 dark:text-green-200 mb-4">Registration Successful!</h3>
            <div className="space-y-3 text-sm text-green-700 dark:text-green-300">
              <p className="text-base">
                Your login credentials have been sent to:<br/>
                <span className="font-semibold text-green-900 dark:text-green-100">{formData.email}</span>
              </p>

              <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-700">
                <p>
                  🚀 You can now login to explore the platform.<br/>
                  <span className="font-semibold">Note:</span> You'll need to upload KYC documents in your dashboard to unlock trading features.
                </p>
              </div>
            </div>
          </div>
          <div className="text-center">
            <Link
              href="/auth/login"
              className="inline-block px-6 py-3 bg-[var(--brand-blue)] text-white rounded-lg hover:bg-[var(--brand-blue-hi)] transition font-semibold"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <Logo size="lg" href="/" isLoggedIn={false} />
          </div>
          <h2 className="mt-6 text-3xl font-semibold text-[var(--ink)]">
            Create Your Account
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Already have an account?{' '}
            <Link href="/auth/login" className="font-medium text-[var(--brand-blue)] hover:text-[var(--brand-blue-hi)]">
              Sign in
            </Link>
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg bg-[var(--down-red)]/10 border border-[var(--down-red)]/30 p-4">
            <p className="text-sm text-[var(--down-red)]">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-[var(--ink)] mb-6 text-center">Basic Information</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[var(--ink)] mb-2">
                  Full Name / Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  className="block w-full rounded-lg border border-[var(--border)] py-3 px-3 text-[var(--ink)] bg-[var(--surface)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] focus:border-transparent transition"
                  placeholder="Full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[var(--ink)] mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  className="block w-full rounded-lg border border-[var(--border)] py-3 px-3 text-[var(--ink)] bg-[var(--surface)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] focus:border-transparent transition"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="dlNumber" className="block text-sm font-medium text-[var(--ink)] mb-2">
                  Drug License Number (D.L.) <span className="text-red-500">*</span>
                </label>
                <input
                  id="dlNumber"
                  type="text"
                  required
                  className="block w-full rounded-lg border border-[var(--border)] py-3 px-3 text-[var(--ink)] bg-[var(--surface)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] focus:border-transparent transition"
                  placeholder="Enter DL Number"
                  value={formData.dlNumber}
                  onChange={(e) => setFormData({ ...formData, dlNumber: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="gstin" className="block text-sm font-medium text-[var(--ink)] mb-2">
                  GSTIN <span className="text-red-500">*</span>
                </label>
                <input
                  id="gstin"
                  type="text"
                  required
                  className="block w-full rounded-lg border border-[var(--border)] py-3 px-3 text-[var(--ink)] bg-[var(--surface)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] focus:border-transparent transition"
                  placeholder="Enter GSTIN"
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-[var(--ink)] mb-2">
                Address <span className="text-red-500">*</span>
              </label>
              <textarea
                id="address"
                required
                className="block w-full rounded-lg border border-[var(--border)] py-3 px-3 text-[var(--ink)] bg-[var(--surface)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] focus:border-transparent transition resize-none"
                placeholder="Enter full address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-[var(--ink)] mb-2">
                  Phone Number (India +91)
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-[var(--border)] bg-gray-50 dark:bg-gray-700 text-[var(--muted)] text-sm">
                    +91
                  </span>
                  <input
                    id="phone"
                    type="tel"
                    maxLength={10}
                    pattern="[0-9]{10}"
                    className="block w-full rounded-r-lg border border-[var(--border)] py-3 px-3 text-[var(--ink)] bg-[var(--surface)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] focus:border-transparent transition"
                    placeholder="10-digit mobile"
                    value={formData.phone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData({ ...formData, phone: value });
                    }}
                  />
                </div>
                <p className="mt-1 text-xs text-[var(--muted)]">Enter 10-digit mobile number</p>
              </div>

              <div>
                <label htmlFor="roleCode" className="block text-sm font-medium text-[var(--ink)] mb-2">
                  Account Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="roleCode"
                  className="block w-full rounded-lg border border-[var(--border)] py-3 px-3 text-[var(--ink)] bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] focus:border-transparent transition"
                  value={formData.roleCode}
                  onChange={(e) => setFormData({ ...formData, roleCode: e.target.value as any })}
                >
                  <option value="SELLER">Seller</option>
                  <option value="TRADER">Trader</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <button
              type="submit"
              disabled={loading}
              className="w-full group relative px-8 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl transition-all font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.01] disabled:opacity-50 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <span className="relative">{loading ? 'Creating Account...' : 'Register Now'}</span>
            </button>
            <p className="mt-4 text-xs text-center text-[var(--muted)]">
              By registering, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
