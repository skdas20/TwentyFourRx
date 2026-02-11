"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Clock, Package, User, Calendar, AlertCircle, ArrowLeft } from "lucide-react";
import { buyProposalsApi } from "@/lib/api";
import { showToast } from "@/lib/toast";
import ConfirmProposalModal from "@/components/seller/ConfirmProposalModal";

export default function SellerProposalsPage() {
  const router = useRouter();
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProposal, setSelectedProposal] = useState<any>(null);

  useEffect(() => {
    loadPendingProposals();
  }, []);

  const loadPendingProposals = async () => {
    try {
      const res = await buyProposalsApi.getSellerPendingProposals();
      setProposals(res.data);
    } catch (error) {
      console.error("Failed to load proposals:", error);
      showToast.error("Failed to load pending proposals");
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = (createdAt: string) => {
    const created = new Date(createdAt);
    const timeout = new Date(created.getTime() + 48 * 60 * 60 * 1000); // 48 hours
    const now = new Date();
    const remaining = timeout.getTime() - now.getTime();

    if (remaining <= 0) return { text: "Expired", color: "text-red-600", urgent: true };

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    if (hours < 24) {
      return {
        text: `${hours}h ${minutes}m remaining`,
        color: "text-orange-600",
        urgent: true
      };
    }

    return {
      text: `${hours}h remaining`,
      color: "text-gray-600 dark:text-gray-400",
      urgent: false
    };
  };

  const handleConfirmSuccess = () => {
    setSelectedProposal(null);
    loadPendingProposals();
    showToast.success("Proposal confirmed successfully!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Pending Proposals
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mt-1 ml-14">
          Confirm stock availability, batch number, and expiry date
        </p>
      </div>

      {proposals.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-12 border border-gray-200 dark:border-gray-700 text-center">
          <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Pending Proposals
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            You have no proposals waiting for your confirmation.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {proposals.map((proposal) => {
            const timeRemaining = getTimeRemaining(proposal.createdAt);
            return (
              <div
                key={proposal.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {proposal.listing?.medicine?.name}
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-3">
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Package className="w-4 h-4" />
                            <span>{proposal.qty} units</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <User className="w-4 h-4" />
                            <span>{proposal.buyer?.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {new Date(proposal.createdAt).toLocaleDateString('en-GB')}
                            </span>
                          </div>
                        </div>

                        <div className={`flex items-center gap-2 mt-3 ${timeRemaining.urgent ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg px-3 py-2' : ''}`}>
                          <Clock className={`w-4 h-4 ${timeRemaining.color}`} />
                          <span className={`text-sm font-medium ${timeRemaining.color}`}>
                            {timeRemaining.text}
                          </span>
                          {timeRemaining.urgent && (
                            <AlertCircle className="w-4 h-4 text-orange-600 ml-auto" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedProposal(proposal)}
                    className="ml-4 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedProposal && (
        <ConfirmProposalModal
          proposal={selectedProposal}
          onClose={() => setSelectedProposal(null)}
          onSuccess={handleConfirmSuccess}
        />
      )}
    </div>
  );
}
