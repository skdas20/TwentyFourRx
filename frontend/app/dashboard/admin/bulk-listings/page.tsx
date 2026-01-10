"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FileText, Clock, CheckCircle, XCircle, ChevronRight, Download, ArrowLeft, Trash2 } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { listingsApi } from "@/lib/api";
import { showToast } from "@/lib/toast";

export default function BulkListingsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await listingsApi.getBulkRequests();
      // Filter to show only PENDING or PROCESSED requests
      const filteredRequests = (res.data || []).filter(
        (r: any) => r.status === 'PENDING' || r.status === 'PROCESSED'
      );
      setRequests(filteredRequests);
    } catch (error: any) {
      console.error("Failed to load bulk requests:", error);
      setError(error.response?.data?.message || "Failed to load requests. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, sellerName: string) => {
    if (!confirm(`Are you sure you want to delete bulk request from ${sellerName}?`)) {
      return;
    }

    try {
      await listingsApi.deleteBulkRequest(id);
      showToast.success('Bulk request deleted successfully');
      loadRequests(); // Reload the list
    } catch (error: any) {
      console.error('Failed to delete bulk request:', error);
      showToast.error(error.response?.data?.message || 'Failed to delete request');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
      case "PROCESSED": // Processed means analyzed but not approved yet
        return (
          <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-xs font-medium rounded flex items-center gap-1 w-fit">
            <Clock className="w-3 h-3" />
            Pending Review
          </span>
        );
      case "APPROVED":
      case "COMPLETED":
        return (
          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs font-medium rounded flex items-center gap-1 w-fit">
            <CheckCircle className="w-3 h-3" />
            Completed
          </span>
        );
      case "REJECTED":
      case "ERROR":
        return (
          <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs font-medium rounded flex items-center gap-1 w-fit">
            <XCircle className="w-3 h-3" />
            Failed/Rejected
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/admin"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Bulk Listing Requests</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Review and approve bulk inventory uploads</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border border-gray-200 dark:border-gray-700">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Requests</h3>
          <p className="text-gray-600 dark:text-gray-400">There are no pending bulk listing requests.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4">Seller</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Items Found</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">{req.seller?.name || "Unknown"}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{req.seller?.email}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                      {Array.isArray(req.parsedData) ? req.parsedData.length : "Processing..."}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(req.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/admin/bulk-listings/${req.id}`}
                          className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        >
                          Review
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(req.id, req.seller?.name || 'Unknown')}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete request"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}
