"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Upload, CheckCircle } from "lucide-react";
import { buyProposalsApi } from "@/lib/api";
import { showToast } from "@/lib/toast";

export default function SellerProposalPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [proposal, setProposal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadProposal();
  }, [id]);

  const loadProposal = async () => {
    try {
      const res = await buyProposalsApi.getProposal(id);
      setProposal(res.data);
    } catch (error) {
      console.error("Failed to load proposal:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("invoice", file);
      
      await buyProposalsApi.uploadSellerInvoice(id, formData);
      showToast.success("Invoice uploaded successfully!");
      loadProposal(); // Refresh to show status
    } catch (error: any) {
      console.error("Failed to upload invoice:", error);
      showToast.error(error.response?.data?.message || "Failed to upload invoice");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!proposal) return <div>Proposal not found</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/seller"
          className="p-2 -ml-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Buy Request Details</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {proposal.listing?.medicine?.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Quantity: {proposal.qty} units
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Buyer: {proposal.buyer?.name}
            </p>
          </div>
        </div>

        {proposal.sellerInvoiceUrl ? (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="font-medium text-green-900 dark:text-green-100">Invoice Uploaded</p>
              <a 
                href={proposal.sellerInvoiceUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-green-700 dark:text-green-300 hover:underline"
              >
                View Invoice
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Upload Seller Invoice <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Please upload your invoice or receipt for this order (PDF, JPG, PNG)
              </p>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                required
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg 
                         text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500
                         file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold
                         file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !file}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2"
            >
              {submitting ? "Uploading..." : (
                <>
                  <Upload className="w-5 h-5" />
                  Upload Invoice
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
