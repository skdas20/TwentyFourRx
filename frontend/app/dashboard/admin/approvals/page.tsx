'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Package, CheckCircle, XCircle, ArrowLeft, FileText, LogOut, Bell } from 'lucide-react'
import { listingsApi } from '@/lib/api'
import ThemeToggle from '@/components/ThemeToggle'
import Logo from '@/components/Logo'
import MarkupInputModal from '@/components/admin/MarkupInputModal'
import TextInputModal from '@/components/admin/TextInputModal'
import { showToast } from '@/lib/toast'

export default function ListingApprovalsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [listings, setListings] = useState<any[]>([])
  const [proposals, setProposals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'listings' | 'proposals'>('listings')
  
  // Modal states
  const [showMarkupModal, setShowMarkupModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [currentActionId, setCurrentActionId] = useState<string | null>(null)
  const [actionType, setActionType] = useState<'listing' | 'proposal'>('listing')

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/auth/login')
      return
    }
    const parsed = JSON.parse(userData)
    if (parsed.roleCode !== 'ADMIN') {
      router.push('/dashboard')
      return
    }
    setUser(parsed)
    loadData()
  }, [router])

  const loadData = async () => {
    try {
      setLoading(true)
      const [listingsRes, proposalsRes] = await Promise.all([
        listingsApi.getPendingListings(),
        listingsApi.getPendingProposals()
      ])
      setListings(listingsRes.data)
      setProposals(proposalsRes.data)
    } catch (error) {
      console.error('Failed to load data:', error)
      showToast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleApproveListing = (id: string) => {
    setCurrentActionId(id)
    setActionType('listing')
    setShowMarkupModal(true)
  }

  const handleRejectListing = (id: string) => {
    setCurrentActionId(id)
    setActionType('listing')
    setShowRejectModal(true)
  }

  const handleApproveProposal = (id: string) => {
    setCurrentActionId(id)
    setActionType('proposal')
    setShowMarkupModal(true)
  }

  const handleRejectProposal = (id: string) => {
    setCurrentActionId(id)
    setActionType('proposal')
    setShowRejectModal(true)
  }

  const confirmApprove = async (markup: number) => {
    if (!currentActionId) return

    try {
      if (actionType === 'listing') {
        await listingsApi.approveListing(currentActionId, { adminMarkupPct: markup })
        showToast.success(`Listing approved with ${markup}% markup!`)
      } else {
        await listingsApi.approveMedicineProposal(currentActionId, markup)
        showToast.success('Medicine proposal approved and listing activated!')
      }
      loadData()
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Failed to approve')
    } finally {
      setShowMarkupModal(false)
      setCurrentActionId(null)
    }
  }

  const confirmReject = async (reason: string) => {
    if (!currentActionId) return

    try {
      if (actionType === 'listing') {
        await listingsApi.rejectListing(currentActionId, reason || 'Rejected by admin')
        showToast.success('Listing rejected')
      } else {
        await listingsApi.rejectMedicineProposal(currentActionId, reason || 'Rejected by admin')
        showToast.success('Medicine proposal rejected')
      }
      loadData()
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Failed to reject')
    } finally {
      setShowRejectModal(false)
      setCurrentActionId(null)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Logo size="sm" href="/" isLoggedIn={true} />
              <span className="text-sm text-gray-500 dark:text-gray-400">Admin - Listing Approvals</span>
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-700 dark:text-gray-300">{user?.name}</span>
                <button
                  onClick={handleLogout}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link
              href="/dashboard/admin"
              className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Listing Approvals</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('listings')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'listings'
                ? 'bg-green-600 text-white shadow-lg'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              <span>Pending Listings ({listings.length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('proposals')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'proposals'
                ? 'bg-orange-600 text-white shadow-lg'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              <span>Medicine Proposals ({proposals.length})</span>
            </div>
          </button>
        </div>

        {/* Listings Tab */}
        {activeTab === 'listings' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            {listings.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No pending listings</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {listings.map((listing: any) => (
                  <div key={listing.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow">
                    <div className="mb-3">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {listing.medicine?.name || 'Medicine'}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        by {listing.seller?.name || 'Unknown'}
                      </p>
                      {listing.medicine?.manufacturer && (
                        <p className="text-xs text-gray-500 mt-1">
                          {listing.medicine.manufacturer.name}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                      <div>
                        <span className="text-gray-500">Price:</span>
                        <p className="font-medium">₹{listing.basePrice}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Stock:</span>
                        <p className="font-medium">{listing.stock} units</p>
                      </div>
                    </div>
                    {listing.documentUrl && (
                      <a
                        href={listing.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline mb-3 block"
                      >
                        📄 View Document
                      </a>
                    )}
                    <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => handleApproveListing(listing.id)}
                        className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectListing(listing.id)}
                        className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Proposals Tab */}
        {activeTab === 'proposals' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            {proposals.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No pending proposals</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {proposals.map((proposal: any) => (
                  <div key={proposal.id} className="p-4 border border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:shadow-md transition-shadow">
                    <div className="mb-3">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {proposal.name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {proposal.form} {proposal.strength && `- ${proposal.strength}`}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        by {proposal.seller?.name || 'Unknown'}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                      <div>
                        <span className="text-gray-500">Manufacturer:</span>
                        <p className="font-medium text-xs">{proposal.manufacturerName}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Price:</span>
                        <p className="font-medium">₹{proposal.basePrice}</p>
                      </div>
                    </div>
                    {proposal.documentUrl && (
                      <a
                        href={proposal.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline mb-3 block"
                      >
                        📄 View Document
                      </a>
                    )}
                    <div className="flex gap-2 pt-3 border-t border-orange-200 dark:border-orange-700">
                      <button
                        onClick={() => handleApproveProposal(proposal.id)}
                        className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectProposal(proposal.id)}
                        className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <MarkupInputModal
        isOpen={showMarkupModal}
        onConfirm={confirmApprove}
        onClose={() => {
          setShowMarkupModal(false)
          setCurrentActionId(null)
        }}
        defaultMarkup={0}
        title={actionType === 'listing' ? 'Approve Listing' : 'Approve Medicine Proposal'}
      />

      <TextInputModal
        isOpen={showRejectModal}
        title={actionType === 'listing' ? 'Reject Listing' : 'Reject Medicine Proposal'}
        label="Rejection Reason (optional)"
        placeholder="Enter reason for rejection..."
        onConfirm={confirmReject}
        onClose={() => {
          setShowRejectModal(false)
          setCurrentActionId(null)
        }}
        confirmText="Reject"
      />
    </div>
  )
}
