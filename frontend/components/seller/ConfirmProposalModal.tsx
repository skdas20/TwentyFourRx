"use client";

import { useState } from "react";
import { X, Package, AlertTriangle } from "lucide-react";
import { buyProposalsApi } from "@/lib/api";
import { showToast } from "@/lib/toast";

interface ConfirmProposalModalProps {
  proposal: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ConfirmProposalModal({
  proposal,
  onClose,
  onSuccess,
}: ConfirmProposalModalProps) {
  const [formData, setFormData] = useState({
    confirmedQty: proposal.qty,
    batchNo: proposal.listing?.batchNo || "",
    expiryDate: proposal.listing?.expiryDate
      ? new Date(proposal.listing.expiryDate).toISOString().split('T')[0]
      : "",
    note: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const qtyReduced = formData.confirmedQty < proposal.qty;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.batchNo.trim()) {
      showToast.error("Batch number is required");
      return;
    }

    if (!formData.expiryDate) {
      showToast.error("Expiry date is required");
      return;
    }

    try {
      setSubmitting(true);

      // Convert YYYY-MM-DD to full ISO timestamp
      const expiryDateISO = new Date(formData.expiryDate + 'T00:00:00.000Z').toISOString();

      await buyProposalsApi.sellerConfirmProposal(proposal.id, {
        confirmedQty: parseInt(formData.confirmedQty.toString()),
        batchNo: formData.batchNo,
        expiryDate: expiryDateISO,
        note: formData.note || undefined,
      });

      onSuccess();
    } catch (error: any) {
      console.error("Failed to confirm proposal:", error);
      console.error("Error response:", error.response?.data);
      showToast.error(
        error.response?.data?.message ||
        (Array.isArray(error.response?.data?.message)
          ? error.response.data.message.join(', ')
          : "Failed to confirm proposal")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Confirm Proposal
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Proposal Details */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {proposal.listing?.medicine?.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Buyer: {proposal.buyer?.name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Requested Quantity: {proposal.qty} units
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Confirmed Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Available Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max={proposal.qty}
                required
                value={formData.confirmedQty}
                onChange={(e) =>
                  setFormData({ ...formData, confirmedQty: e.target.value === '' ? '' : parseInt(e.target.value) })
                }
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter available quantity"
              />
              {qtyReduced && (
                <div className="mt-2 flex items-start gap-2 text-sm text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>
                    You're reducing the quantity. The buyer will need to approve this change before the proposal can proceed.
                  </p>
                </div>
              )}
            </div>

            {/* Batch Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Batch Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.batchNo}
                onChange={(e) =>
                  setFormData({ ...formData, batchNo: e.target.value })
                }
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter batch number"
              />
            </div>

            {/* Expiry Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Expiry Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={formData.expiryDate}
                onChange={(e) =>
                  setFormData({ ...formData, expiryDate: e.target.value })
                }
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Optional Note */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Note (Optional)
              </label>
              <textarea
                value={formData.note}
                onChange={(e) =>
                  setFormData({ ...formData, note: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Add any additional notes for the buyer or admin..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
              >
                {submitting ? "Confirming..." : "Confirm Proposal"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
