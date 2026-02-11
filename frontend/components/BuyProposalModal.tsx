"use client";

import { useState, useEffect } from "react";
import { X, Upload, AlertCircle, Mail, CheckCircle, Pill } from "lucide-react";
import { buyProposalsApi } from "@/lib/api";
import { showToast } from "@/lib/toast";

interface BuyProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  medicineName: string;
  listPrice: number;
  medicineImage?: string | null;
  gstPercentage?: number;
  initialProposal?: any; // For resuming drafts
}

export default function BuyProposalModal({
  isOpen,
  onClose,
  listingId,
  medicineName,
  listPrice,
  medicineImage,
  gstPercentage = 0,
  initialProposal,
}: BuyProposalModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [quantity, setQuantity] = useState<number>(0);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [proposalId, setProposalId] = useState<string>("");

  // Get user email from localStorage and reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      const userData = localStorage.getItem("user");
      if (userData) {
        const user = JSON.parse(userData);
        setUserEmail(user.email || "");
      }

      // Initialize if resuming a draft
      if (initialProposal) {
        setStep(2);
        setProposalId(initialProposal.id);
        setQuantity(initialProposal.qty);
        setNotes(initialProposal.notes || "");
      }
    } else {
      // Reset form when modal closes
      if (!initialProposal) {
        setStep(1);
        setQuantity(0);
        setReceiptFile(null);
        setNotes("");
        setError("");
        setProposalId("");
      }
    }
  }, [isOpen, initialProposal]);

  if (!isOpen) return null;

  const normalizedListPrice = Number(listPrice) || 0;
  const effectiveGstPercentage = Number(gstPercentage) || 0;
  const baseTotal = quantity * normalizedListPrice;
  const gstAmount = (baseTotal * effectiveGstPercentage) / 100;
  const totalCost = baseTotal + gstAmount;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("File size must be less than 5MB");
        return;
      }
      // Validate file type
      const validTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
      if (!validTypes.includes(file.type)) {
        setError("Only JPG, PNG, and PDF files are allowed");
        return;
      }
      setReceiptFile(file);
      setError("");
    }
  };

  const handleProceedToCheckout = async () => {
    setError("");

    const token = localStorage.getItem('accessToken');
    const userData = localStorage.getItem('user');
    const userRole = userData ? JSON.parse(userData).roleCode : null;

    if (!token || !userRole) {
      setError("Please login to continue your purchase.");
      return;
    }

    if (!['TRADER', 'SELLER'].includes(userRole)) {
      setError("Only trader or seller accounts can submit buy requests.");
      return;
    }

    // Validation
    if (quantity <= 0) {
      setError("Please enter a valid quantity");
      return;
    }

    try {
      setSubmitting(true);

      // Send invoice email and create proposal
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/buy-proposals/send-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          listingId,
          qty: quantity,
          notes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          throw new Error('Session expired. Please login again.');
        }
        if (response.status === 403) {
          throw new Error('Insufficient permissions. Only trader or seller accounts can place buy orders.');
        }
        throw new Error(errorData.message || 'Failed to send invoice');
      }

      const data = await response.json();

      // Show success message - seller confirmation flow
      showToast.success(data.message || 'Proposal created successfully! Awaiting seller confirmation.');

      // Close modal
      onClose();
    } catch (err: any) {
      console.error("Failed to send invoice:", err);
      setError(err.message || "Failed to send invoice");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!receiptFile) {
      setError("Please upload payment receipt");
      return;
    }

    if (!proposalId) {
      setError("Proposal not found. Please try again.");
      return;
    }

    try {
      setSubmitting(true);

      // Upload receipt to existing proposal
      const formData = new FormData();
      formData.append("receipt", receiptFile);

      await buyProposalsApi.uploadReceipt(proposalId, formData);

      // Success
      showToast.success("Purchase submitted successfully! Your order is pending admin approval.");
      onClose(); // Form will be reset by useEffect
    } catch (err: any) {
      console.error("Failed to submit purchase:", err);
      setError(err.response?.data?.message || "Failed to submit purchase");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center border border-gray-100 dark:border-gray-600 overflow-hidden flex-shrink-0">
              {medicineImage ? (
                <img src={medicineImage} alt={medicineName} className="w-full h-full object-cover" />
              ) : (
                <Pill className="text-gray-400" size={24} />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {step === 1 ? "Buy Medicine" : "Complete Payment"}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {medicineName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Order Details */}
        {step === 1 && (
          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quantity (units)
              </label>
              <input
                type="number"
                value={quantity || ""}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg
                         text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter quantity"
                required
                min="1"
              />
            </div>

            {/* Price Summary */}
            {quantity > 0 && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Unit Price:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">₹{normalizedListPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Subtotal:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">₹{baseTotal.toLocaleString()}</span>
                </div>
                {effectiveGstPercentage > 0 && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">GST ({effectiveGstPercentage}%):</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">₹{gstAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-blue-200 dark:border-blue-700">
                  <span className="text-base font-semibold text-gray-900 dark:text-gray-100">Total Cost (incl. GST):</span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">₹{totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg
                         text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Any additional information..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProceedToCheckout}
                disabled={submitting || quantity <= 0}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Processing..." : "Proceed to Checkout"}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">
                    Invoice Sent!
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    An invoice has been sent to <strong>{userEmail}</strong> with payment details and bank account information.
                  </p>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Quantity:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{quantity} units</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Unit Price:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">₹{normalizedListPrice.toLocaleString()}</span>
                </div>
                {effectiveGstPercentage > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">GST ({effectiveGstPercentage}%):</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">₹{gstAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">Total (incl. GST):</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">₹{totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">Next Steps:</h3>
              <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
                <li>Complete the payment using the bank details in the email</li>
                <li>Upload the payment confirmation receipt below</li>
                <li>Click "BUY" to submit your order</li>
              </ol>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Upload Payment Receipt <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="receipt-upload"
                  required
                />
                <label
                  htmlFor="receipt-upload"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  {receiptFile ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {receiptFile.name}
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-gray-400" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Click to upload (JPG, PNG, PDF - Max 5MB)
                      </span>
                    </>
                  )}
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting || !receiptFile}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting..." : "BUY"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
