"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, Clock, CheckCircle, XCircle, Download, ArrowLeft, PlayCircle } from "lucide-react";
import { buyProposalsApi } from "@/lib/api";
import { showToast } from "@/lib/toast";
import ThemeToggle from "@/components/ThemeToggle";
import BuyProposalModal from "@/components/BuyProposalModal";

export default function MyProposalsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for resuming drafts
  const [selectedDraft, setSelectedDraft] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      router.push("/auth/login");
      return;
    }
    loadProposals();
  }, []);

  const loadProposals = async () => {
    try {
      setLoading(true);
      const res = await buyProposalsApi.getMyProposals();
      setProposals(res.data || []);
    } catch (error) {
      console.error("Failed to load proposals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResumeDraft = (proposal: any) => {
    setSelectedDraft(proposal);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedDraft(null);
    // Refresh list to remove draft if it was submitted
    loadProposals();
  };

  const drafts = proposals.filter(p => p.status === 'AWAITING_PAYMENT');
  const history = proposals.filter(p => p.status !== 'AWAITING_PAYMENT');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "AWAITING_PAYMENT":
        return (
          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-medium rounded flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Payment Pending
          </span>
        );
      case "AWAITING_SELLER":
        return (
          <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-xs font-medium rounded flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Awaiting Seller
          </span>
        );
      case "SELLER_CONFIRMED":
        return (
          <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-xs font-medium rounded flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Awaiting Seller Invoice
          </span>
        );
      case "QUANTITY_MODIFIED":
        return (
          <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 text-xs font-medium rounded flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Action Required
          </span>
        );
      case "PENDING":
        return (
          <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-xs font-medium rounded flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Approval Pending
          </span>
        );
      case "AWAITING_PAYMENT":
        return (
          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-medium rounded flex items-center gap-1">
            <FileText className="w-3 h-3" />
            PI Sent - Payment Required
          </span>
        );
      case "APPROVED":
        return (
          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs font-medium rounded flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Completed
          </span>
        );
      case "REJECTED":
        return (
          <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs font-medium rounded flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  const handleApproveQty = async (proposalId: string) => {
    try {
      await buyProposalsApi.buyerApproveModifiedQty(proposalId);
      showToast.success("Quantity approved! The proposal will proceed to admin review.");
      loadProposals();
    } catch (error: any) {
      console.error("Failed to approve quantity:", error);
      showToast.error(error.response?.data?.message || "Failed to approve quantity");
    }
  };

  const handleRejectQty = async (proposalId: string) => {
    const reason = prompt("Please enter rejection reason (optional):");
    if (reason === null) return; // User cancelled

    try {
      await buyProposalsApi.buyerRejectModifiedQty(proposalId, reason || undefined);
      showToast.success("Proposal rejected successfully.");
      loadProposals();
    } catch (error: any) {
      console.error("Failed to reject proposal:", error);
      showToast.error(error.response?.data?.message || "Failed to reject proposal");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/seller" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Buy Proposals</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Track your submitted buy proposals</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Drafts Section */}
        {drafts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-blue-600" />
              Payment Drafts (Action Required)
            </h2>
            <div className="grid gap-4">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-6 border border-blue-200 dark:border-blue-800"
                >
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {draft.listing?.medicine?.name || "Unknown Medicine"}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {draft.qty} units • ₹{Number(draft.listing?.listPrice || 0).toLocaleString()}/unit
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                       <span className="text-sm text-gray-500 dark:text-gray-400">
                        Created {new Date(draft.createdAt).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => handleResumeDraft(draft)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                      >
                        Complete Payment
                        <ArrowLeft className="w-4 h-4 rotate-180" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Submission History</h2>

        {history.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border border-gray-200 dark:border-gray-700">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No History Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You haven't submitted any buy proposals yet
            </p>
            <button
              onClick={() => router.push("/medicines")}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Browse Medicines
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {history.map((proposal) => (
              <div
                key={proposal.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {proposal.listing?.medicine?.name || "Unknown Medicine"}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Submitted {new Date(proposal.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(proposal.status)}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Quantity</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {proposal.qty} units
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Order Type</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                      {proposal.orderType}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {proposal.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Submitted</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {new Date(proposal.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {proposal.notes && (
                  <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Your Notes:</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{proposal.notes}</p>
                  </div>
                )}

                {proposal.status === "QUANTITY_MODIFIED" && (
                  <div className="mb-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <p className="text-sm font-semibold text-orange-900 dark:text-orange-100 mb-2">
                      ⚠️ Seller Modified Quantity
                    </p>
                    <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Requested:</p>
                        <p className="font-medium text-gray-900 dark:text-white">{proposal.qty} units</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Available:</p>
                        <p className="font-medium text-green-600 dark:text-green-400">{proposal.confirmedQty} units</p>
                      </div>
                      {proposal.confirmedBatchNo && (
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Batch No:</p>
                          <p className="font-medium text-gray-900 dark:text-white">{proposal.confirmedBatchNo}</p>
                        </div>
                      )}
                      {proposal.confirmedExpiryDate && (
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Expiry Date:</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {new Date(proposal.confirmedExpiryDate).toLocaleDateString('en-GB')}
                          </p>
                        </div>
                      )}
                    </div>
                    {proposal.sellerNote && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                        <span className="font-medium">Note:</span> {proposal.sellerNote}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveQty(proposal.id)}
                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors text-sm"
                      >
                        Approve Modified Qty
                      </button>
                      <button
                        onClick={() => handleRejectQty(proposal.id)}
                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors text-sm"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}

                {proposal.sellerNote && proposal.status !== "QUANTITY_MODIFIED" && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Seller Note:</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{proposal.sellerNote}</p>
                  </div>
                )}

                {proposal.reviewerNote && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Admin Review:</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{proposal.reviewerNote}</p>
                  </div>
                )}

                {/* Complete Payment Section for AWAITING_PAYMENT proposals */}
                {proposal.status === "AWAITING_PAYMENT" && (
                  <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      📄 Proforma Invoice Sent
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                      Check your email for the PI. Complete payment and upload receipt to proceed.
                    </p>
                    <button
                      onClick={() => handleResumeDraft(proposal)}
                      className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Upload Payment Receipt
                    </button>
                  </div>
                )}

                {/* Order Completed Section for APPROVED proposals */}
                {proposal.status === "APPROVED" && (
                  <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">
                      ✅ Order Completed
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Payment received. Tax invoice sent to your email. Delivery will be arranged soon.
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {proposal.reviewedAt && (
                      <span>Reviewed {new Date(proposal.reviewedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                  {proposal.receiptUrl && (
                    <a
                      href={proposal.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
                    >
                      <Download className="w-4 h-4" />
                      View Receipt
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Resume Modal */}
        {selectedDraft && (
          <BuyProposalModal
            isOpen={isModalOpen}
            onClose={handleModalClose}
            listingId={selectedDraft.listingId}
            medicineName={selectedDraft.listing?.medicine?.name}
            listPrice={selectedDraft.listing?.listPrice}
            medicineImage={selectedDraft.listing?.medicine?.imageUrl}
            gstPercentage={selectedDraft.listing?.gstPercentage}
            initialProposal={selectedDraft}
          />
        )}
      </main>
    </div>
  );
}
