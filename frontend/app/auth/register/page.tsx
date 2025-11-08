'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import Link from 'next/link'
import { Upload, FileText, Check, X, Download } from 'lucide-react'

// Document type definitions
const documentTypes = [
  // Screenshot 1 - Basic Business Documents
  { code: 'GST_CERTIFICATE', label: 'GST Registration Certificate', required: true, section: 'basic' },
  { code: 'PAN_CARD', label: 'PAN Card', required: true, section: 'basic' },
  { code: 'FACTORY_LICENSE', label: 'Factory License/ Panchayath/ Corporation Certificate', required: true, section: 'basic' },
  { code: 'FSSAI_CERTIFICATE', label: 'FSSAI Certificate', required: false, section: 'basic' },
  { code: 'CANCELLED_CHEQUE', label: 'Cancelled Cheque', required: true, section: 'basic' },
  { code: 'INDEMNITY_CERTIFICATE', label: 'Indemnity Certificate', required: true, section: 'basic' },
  { code: 'COMPANY_PROFILE', label: 'Company Profile', required: false, section: 'basic' },
  { code: 'DRUG_LICENSE_1', label: 'Drug License 1', required: true, section: 'basic' },
  { code: 'DRUG_LICENSE_2', label: 'Drug License 2', required: false, section: 'basic' },
  { code: 'DRUG_LICENSE_3', label: 'Drug License 3', required: false, section: 'basic' },
  { code: 'DRUG_LICENSE_4', label: 'Drug License 4', required: false, section: 'basic' },

  // Screenshot 2 - Authorization & Quality Documents
  { code: 'MANUFACTURER_AUTH_LETTER', label: 'Manufacturer Authorization Letter', required: true, section: 'auth' },
  { code: 'MANUFACTURER_AGREEMENT', label: 'Agreement with Manufacturer', required: false, section: 'auth' },
  { code: 'QUALITY_CERTIFICATIONS', label: 'Quality Certifications (FDA, CE, etc.)', required: false, section: 'auth' },
  { code: 'INCORPORATION_CERTIFICATE', label: 'Certificate of Incorporation', required: true, section: 'auth' },
  { code: 'MSE_CERTIFICATE', label: 'MSE Certificate', required: false, section: 'auth' },
  { code: 'UDYOG_AADHAR', label: 'Udyog Aadhar', required: false, section: 'auth' },
  { code: 'NSIC_CERTIFICATE', label: 'NSIC/KVIC/UAM Certificate', required: false, section: 'auth' },

  // Screenshot 3 - Legal & Compliance Documents
  { code: 'NON_CONVICTION_CERTIFICATE', label: 'Non-Conviction Certificate', required: true, section: 'legal' },
  { code: 'SUPPLY_ORDER', label: 'Supply Order', required: false, section: 'legal' },
  { code: 'SAMPLE_DECLARATION_FORM', label: 'Sample Declaration Form', required: false, section: 'legal' },
  { code: 'DECLARATION_FORM', label: 'Declaration Form', required: true, section: 'legal' },
]

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1) // 1: Basic Info, 2: Documents, 3: Review & Submit
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    roleCode: 'SELLER' as 'TRADER' | 'SELLER',
  })
  const [documents, setDocuments] = useState<{ [key: string]: File }>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleFileChange = (code: string, file: File | null) => {
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
      if (!allowedTypes.includes(file.type)) {
        setError(`Invalid file type for ${code}. Only PDF, JPG, PNG allowed.`)
        return
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError(`File ${file.name} is too large. Maximum size is 10MB.`)
        return
      }

      setDocuments({ ...documents, [code]: file })
      setError('')
    } else {
      const newDocs = { ...documents }
      delete newDocs[code]
      setDocuments(newDocs)
    }
  }

  const validateStep1 = () => {
    if (!formData.name || !formData.email) {
      setError('Please fill all required fields')
      return false
    }
    setError('')
    return true
  }

  const validateStep2 = () => {
    const requiredDocs = documentTypes.filter(d => d.required)
    const missingDocs = requiredDocs.filter(d => !documents[d.code])

    if (missingDocs.length > 0) {
      setError(`Please upload all required documents. Missing: ${missingDocs.map(d => d.label).join(', ')}`)
      return false
    }

    setError('')
    return true
  }

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2)
    } else if (step === 2 && validateStep2()) {
      setStep(3)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Create FormData
      const formDataToSend = new FormData()
      formDataToSend.append('name', formData.name)
      formDataToSend.append('email', formData.email)
      if (formData.phone) formDataToSend.append('phone', formData.phone)
      formDataToSend.append('roleCode', formData.roleCode)

      // Append all documents
      Object.entries(documents).forEach(([code, file]) => {
        formDataToSend.append(code, file)
      })

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'
      const response = await axios.post(`${API_URL}/auth/register`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      setSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
      setStep(1) // Go back to step 1 to see error
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
                  ⏳ Your documents are under review.<br/>
                  You'll receive an email once approved.
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-700">
                <p className="text-xs">
                  📧 Please check your email inbox (and spam folder) for your password.
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
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-5xl font-bold mb-2">
              <span className="text-[var(--ink)]">24R</span>
              <span className="text-[var(--brand-blue)]">x</span>
            </h1>
          </Link>
          <h2 className="mt-6 text-3xl font-semibold text-[var(--ink)]">
            Vendor/Trader Registration
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Already have an account?{' '}
            <Link href="/auth/login" className="font-medium text-[var(--brand-blue)] hover:text-[var(--brand-blue-hi)]">
              Sign in
            </Link>
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 1 ? 'bg-[var(--brand-blue)] text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'}`}>
                {step > 1 ? <Check className="w-5 h-5" /> : '1'}
              </div>
              <div className="text-sm ml-2 hidden sm:block">Basic Info</div>
            </div>
            <div className={`w-16 sm:w-24 h-1 mx-2 ${step >= 2 ? 'bg-[var(--brand-blue)]' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 2 ? 'bg-[var(--brand-blue)] text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'}`}>
                {step > 2 ? <Check className="w-5 h-5" /> : '2'}
              </div>
              <div className="text-sm ml-2 hidden sm:block">Documents</div>
            </div>
            <div className={`w-16 sm:w-24 h-1 mx-2 ${step >= 3 ? 'bg-[var(--brand-blue)]' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 3 ? 'bg-[var(--brand-blue)] text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'}`}>
                3
              </div>
              <div className="text-sm ml-2 hidden sm:block">Review</div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg bg-[var(--down-red)]/10 border border-[var(--down-red)]/30 p-4">
            <p className="text-sm text-[var(--down-red)]">{error}</p>
          </div>
        )}

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-[var(--ink)] mb-6">Basic Information</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[var(--ink)] mb-2">
                  Full Name / Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  className="block w-full rounded-lg border border-[var(--border)] py-3 px-3 text-[var(--ink)] bg-[var(--surface)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] focus:border-transparent transition"
                  placeholder="Enter your full name or company name"
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
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-[var(--ink)] mb-2">
                  Phone
                </label>
                <input
                  id="phone"
                  type="tel"
                  className="block w-full rounded-lg border border-[var(--border)] py-3 px-3 text-[var(--ink)] bg-[var(--surface)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] focus:border-transparent transition"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
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

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-3 bg-[var(--brand-blue)] text-white rounded-lg hover:bg-[var(--brand-blue-hi)] transition font-semibold"
              >
                Next: Upload Documents
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Document Uploads */}
        {step === 2 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-[var(--ink)]">KYC Documents</h3>
                <p className="text-sm text-[var(--muted)] mt-1">
                  Upload all required documents. Accepted formats: PDF, JPG, PNG (Max 10MB each)
                </p>
              </div>
              <a
                href="/templates/document-guide.html"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium text-sm whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                Format Guide
              </a>
            </div>

            {/* Basic Business Documents */}
            <div className="mb-8">
              <h4 className="font-semibold text-[var(--ink)] mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Basic Business Documents
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documentTypes.filter(d => d.section === 'basic').map((doc) => (
                  <DocumentUploadField
                    key={doc.code}
                    doc={doc}
                    file={documents[doc.code]}
                    onChange={handleFileChange}
                  />
                ))}
              </div>
            </div>

            {/* Authorization & Quality Documents */}
            <div className="mb-8">
              <h4 className="font-semibold text-[var(--ink)] mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Authorization & Quality Documents
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documentTypes.filter(d => d.section === 'auth').map((doc) => (
                  <DocumentUploadField
                    key={doc.code}
                    doc={doc}
                    file={documents[doc.code]}
                    onChange={handleFileChange}
                  />
                ))}
              </div>
            </div>

            {/* Legal & Compliance Documents */}
            <div className="mb-8">
              <h4 className="font-semibold text-[var(--ink)] mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Legal & Compliance Documents
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documentTypes.filter(d => d.section === 'legal').map((doc) => (
                  <DocumentUploadField
                    key={doc.code}
                    doc={doc}
                    file={documents[doc.code]}
                    onChange={handleFileChange}
                  />
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-[var(--ink)] rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-semibold"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-3 bg-[var(--brand-blue)] text-white rounded-lg hover:bg-[var(--brand-blue-hi)] transition font-semibold"
              >
                Next: Review & Submit
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Submit */}
        {step === 3 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-[var(--ink)] mb-6">Review & Submit</h3>

            {/* Basic Info Review */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <h4 className="font-semibold text-[var(--ink)] mb-3">Basic Information</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-[var(--muted)]">Name:</span>
                  <p className="font-medium text-[var(--ink)]">{formData.name}</p>
                </div>
                <div>
                  <span className="text-[var(--muted)]">Email:</span>
                  <p className="font-medium text-[var(--ink)]">{formData.email}</p>
                </div>
                <div>
                  <span className="text-[var(--muted)]">Phone:</span>
                  <p className="font-medium text-[var(--ink)]">{formData.phone || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[var(--muted)]">Account Type:</span>
                  <p className="font-medium text-[var(--ink)]">{formData.roleCode}</p>
                </div>
              </div>
            </div>

            {/* Documents Review */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <h4 className="font-semibold text-[var(--ink)] mb-3">
                Uploaded Documents ({Object.keys(documents).length} files)
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {Object.entries(documents).map(([code, file]) => {
                  const docType = documentTypes.find(d => d.code === code)
                  return (
                    <div key={code} className="flex items-center justify-between text-sm p-2 bg-white dark:bg-gray-800 rounded">
                      <div className="flex items-center">
                        <Check className="w-4 h-4 text-green-600 mr-2" />
                        <span className="text-[var(--ink)]">{docType?.label}</span>
                      </div>
                      <span className="text-[var(--muted)] text-xs">{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Submit Info */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>📧 Important:</strong> After submission, your login credentials will be sent to <strong>{formData.email}</strong>.
                Your documents will be reviewed by our admin team and you'll be notified once approved.
              </p>
            </div>

            <div className="mt-6 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-[var(--ink)] rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-semibold"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold disabled:opacity-50 shadow-lg"
              >
                {loading ? 'Submitting...' : 'Submit for Approval'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Document Upload Field Component
function DocumentUploadField({
  doc,
  file,
  onChange
}: {
  doc: typeof documentTypes[0],
  file?: File,
  onChange: (code: string, file: File | null) => void
}) {
  return (
    <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:border-[var(--brand-blue)] transition">
      <label className="block">
        <div className="flex items-start justify-between mb-2">
          <span className="text-sm font-medium text-[var(--ink)]">
            {doc.label}
            {doc.required && <span className="text-red-500 ml-1">*</span>}
          </span>
        </div>

        {!file ? (
          <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg hover:border-[var(--brand-blue)] transition cursor-pointer">
            <div className="space-y-1 text-center">
              <Upload className="mx-auto h-8 w-8 text-gray-400" />
              <div className="text-xs text-[var(--muted)]">
                <span className="text-[var(--brand-blue)] font-medium">Click to upload</span> or drag and drop
              </div>
              <p className="text-xs text-[var(--muted)]">PDF, PNG, JPG up to 10MB</p>
            </div>
            <input
              type="file"
              className="sr-only"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onChange(doc.code, file)
              }}
            />
          </div>
        ) : (
          <div className="mt-2 flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
            <div className="flex items-center">
              <Check className="w-5 h-5 text-green-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">{file.name}</p>
                <p className="text-xs text-green-600 dark:text-green-400">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onChange(doc.code, null)}
              className="text-red-600 hover:text-red-800 dark:hover:text-red-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </label>
    </div>
  )
}
