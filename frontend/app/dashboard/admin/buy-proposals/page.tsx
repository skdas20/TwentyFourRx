"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, CheckCircle, XCircle, Clock, Eye, Download } from "lucide-react";
import { buyProposalsApi } from "@/lib/api";

export default function BuyProposalsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProposal, setSelectedProposal] = useState<any>(null);
  const [reviewerNote, setReviewerNote] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      if (parsedUser.roleCode !== "ADMIN") {
        router.push("/dashboard");
        return;
      }
    } else {
      router.push("/auth/login");
      return;
    }
    loadProposals();
  }, []);

  const loadProposals = async () => {
    try {
      setLoading(true);
      const res = await buyProposalsApi.getPendingProposals();
      setProposals(res.data || []);
    } catch (error) {
      console.error("Failed to load proposals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm("Are you sure you want to approve this proposal?")) return;
    
    try {
      setProcessing(true);
      await buyProposalsApi.approveProposal(id, reviewerNote || undefined);
      alert("Proposal approved successfully!");
      setSelectedProposal(null);
      setReviewerNote("");
      loadProposals();
    } catch (error: any) {
      console.error("Failed to approve:", error);
      alert(error.response?.data?.message || "Failed to approve proposal");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (id: string) => {
    if (!reviewerNote.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }
    if (!confirm("Are you sure you want to reject this proposal?")) return;
    
    try {
      setProcessing(true);
      await buyProposalsApi.rejectProposal(id, reviewerNote);
      alert("Proposal rejected successfully!");
      setSelectedProposal(null);
      setReviewerNote("");
      loadProposals();
    } catch (error: any) {
      console.error("Failed to reject:", error);
      alert(error.response?.data?.message || "Failed to reject proposal");
    } finally {
      setProcessing(false);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Buy Proposals</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Review and approve buy proposals from users
          </p>
        </div>

        {proposals.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border border-gray-200 dark:border-gray-700">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Pending Proposals
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              All buy proposals have been reviewed
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {proposals.map((proposal) => (
              <div
                key={proposal.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {proposal.medicine?.name || "Unknown Medicine"}
                      </h3>
                      <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-xs font-medium rounded">
                        PENDING
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Submitted By</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {proposal.user?.name || "Unknown"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Quantity</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {proposal.qty} units
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Price/Unit</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          ₹{parseFloat(proposal.pricePerUnit).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Total Amount</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          ₹{(proposal.qty * parseFloat(proposal.pricePerUnit)).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {proposal.notes && (
                      <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Notes:</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{proposal.notes}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      Submitted {new Date(proposal.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    {proposal.receiptUrl && (
                      <a
                        href={proposal.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 text-sm"
                      >
                        <Download className="w-4 h-4" />
                        Receipt
                      </a>
                    )}
                    <button
                      onClick={() => setSelectedProposal(proposal)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      Review
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedProposal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Review Buy Proposal
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Medicine</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedProposal.medicine?.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Submitted By</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedProposal.user?.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Quantity</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedProposal.qty} units
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Price Per Unit</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    ₹{parseFloat(selectedProposal.pricePerUnit).toFixed(2)}
                  </p>
                </div>
              </div>

              {selectedProposal.notes && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">User Notes:</p>
                  <p className="text-gray-700 dark:text-gray-300">{selectedProposal.notes}</p>
                </div>
              )}

              {selectedProposal.receiptUrl && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Receipt:</p>
                  <a
                    href={selectedProposal.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30"
                  >
                    <Download className="w-4 h-4" />
                    View Receipt
                  </a>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reviewer Note {!reviewerNote.trim() && "(Required for rejection)"}
                </label>
                <textarea
                  value={reviewerNote}
                  onChange={(e) => setReviewerNote(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Add your review notes..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
              <button
                onClick={() => {
                  setSelectedProposal(null);
                  setReviewerNote("");
                }}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                disabled={processing}
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(selectedProposal.id)}
                disabled={processing || !reviewerNote.trim()}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                {processing ? "Processing..." : "Reject"}
              </button>
              <button
                onClick={() => handleApprove(selectedProposal.id)}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                {processing ? "Processing..." : "Approve"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
