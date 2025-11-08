'use client'

import { useState, useEffect } from 'react'
import { usersApi } from '@/lib/api'
import { X, FileText, Check, XCircle, Clock, Eye, Download } from 'lucide-react'

interface Document {
  id: string
  fileUrl: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewerNote?: string
  uploadedAt: string
  reviewedAt?: string
  docType: {
    id: string
    code: string
    label: string
    isRequired: boolean
  }
}

interface UserDocumentsModalProps {
  userId: string
  userName: string
  onClose: () => void
  onDocumentReviewed?: () => void
}

export default function UserDocumentsModal({
  userId,
  userName,
  onClose,
  onDocumentReviewed,
}: UserDocumentsModalProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [reviewerNote, setReviewerNote] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchDocuments()
  }, [userId])

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const response = await usersApi.getUserDocuments(userId)
      setDocuments(response.data.documents)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (documentId: string) => {
    try {
      setProcessing(true)
      await usersApi.approveDocument(userId, documentId, reviewerNote || undefined)
      await fetchDocuments()
      setSelectedDoc(null)
      setReviewerNote('')
      onDocumentReviewed?.()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to approve document')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async (documentId: string) => {
    if (!reviewerNote.trim()) {
      setError('Please provide a reason for rejection')
      return
    }

    try {
      setProcessing(true)
      await usersApi.rejectDocument(userId, documentId, reviewerNote)
      await fetchDocuments()
      setSelectedDoc(null)
      setReviewerNote('')
      onDocumentReviewed?.()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject document')
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        )
      case 'APPROVED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <Check className="w-3 h-3 mr-1" />
            Approved
          </span>
        )
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </span>
        )
    }
  }

  const pendingCount = documents.filter(d => d.status === 'PENDING').length
  const approvedCount = documents.filter(d => d.status === 'APPROVED').length
  const rejectedCount = documents.filter(d => d.status === 'REJECTED').length

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-[var(--ink)]">KYC Documents</h2>
            <p className="text-sm text-[var(--muted)] mt-1">{userName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Stats */}
        <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
              <div className="text-sm text-[var(--muted)]">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
              <div className="text-sm text-[var(--muted)]">Approved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
              <div className="text-sm text-[var(--muted)]">Rejected</div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="m-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            <button
              onClick={() => setError('')}
              className="text-xs text-red-600 dark:text-red-400 underline mt-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-250px)]">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
              <p className="mt-2 text-[var(--muted)]">Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-[var(--muted)]">No documents uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-[var(--brand-blue)] transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-5 h-5 text-[var(--brand-blue)]" />
                        <h3 className="font-semibold text-[var(--ink)]">{doc.docType.label}</h3>
                        {doc.docType.isRequired && (
                          <span className="text-xs text-red-500">*Required</span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-[var(--muted)] mb-2">
                        <span>Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                        {doc.reviewedAt && (
                          <span>Reviewed: {new Date(doc.reviewedAt).toLocaleDateString()}</span>
                        )}
                        {getStatusBadge(doc.status)}
                      </div>

                      {doc.reviewerNote && (
                        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900/50 rounded text-sm">
                          <p className="text-[var(--muted)] text-xs mb-1">Reviewer Note:</p>
                          <p className="text-[var(--ink)]">{doc.reviewerNote}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition"
                        title="View Document"
                      >
                        <Eye className="w-5 h-5" />
                      </a>

                      {doc.status === 'PENDING' && (
                        <button
                          onClick={() => {
                            setSelectedDoc(doc)
                            setReviewerNote('')
                            setError('')
                          }}
                          className="px-4 py-2 bg-[var(--brand-blue)] text-white rounded-lg hover:bg-[var(--brand-blue-hi)] transition font-medium text-sm"
                        >
                          Review
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-[var(--ink)] mb-4">
              Review: {selectedDoc.docType.label}
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-[var(--ink)] mb-2">
                Reviewer Note (Optional)
              </label>
              <textarea
                value={reviewerNote}
                onChange={(e) => setReviewerNote(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] p-3 text-[var(--ink)] bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] resize-none"
                rows={3}
                placeholder="Add a note (required for rejection)..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleApprove(selectedDoc.id)}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Approve'}
              </button>
              <button
                onClick={() => handleReject(selectedDoc.id)}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Reject'}
              </button>
              <button
                onClick={() => {
                  setSelectedDoc(null)
                  setReviewerNote('')
                }}
                disabled={processing}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-[var(--ink)] rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-medium disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
