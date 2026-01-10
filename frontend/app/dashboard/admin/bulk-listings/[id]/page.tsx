"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, CheckCircle, AlertCircle, FileText, ExternalLink } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { listingsApi } from "@/lib/api";
import { showToast } from "@/lib/toast";

export default function BulkRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [showMarkupDialog, setShowMarkupDialog] = useState(false);
  const [markupType, setMarkupType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [markupPercentage, setMarkupPercentage] = useState<string>('15');
  const [markupFixed, setMarkupFixed] = useState<string>('10');

  useEffect(() => {
    loadRequest();
  }, [id]);

  const loadRequest = async () => {
    try {
      const res = await listingsApi.getBulkRequest(id);
      setRequest(res.data);
    } catch (error) {
      console.error("Failed to load request:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked && request?.parsedData) {
      const allIndices = request.parsedData.map((_: any, i: number) => i);
      setSelectedIndices(new Set(allIndices));
    } else {
      setSelectedIndices(new Set());
    }
  };

  const handleSelectRow = (index: number) => {
    const newSet = new Set(selectedIndices);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedIndices(newSet);
  };

  const handleApprove = () => {
    if (selectedIndices.size === 0) return;
    setShowMarkupDialog(true);
  };

  const confirmApprove = async () => {
    const markupValue = markupType === 'PERCENTAGE' ? parseFloat(markupPercentage) : parseFloat(markupFixed);
    if (isNaN(markupValue) || markupValue < 0) {
      showToast.error(`Please enter a valid markup ${markupType === 'PERCENTAGE' ? 'percentage' : 'value'}`);
      return;
    }

    try {
      setSubmitting(true);
      setShowMarkupDialog(false);
      const indices = Array.from(selectedIndices);
      await listingsApi.approveBulkItems(id, indices, markupType, markupValue);
      const markupText = markupType === 'PERCENTAGE' ? `${markupValue}%` : `₹${markupValue}`;
      showToast.success(`${selectedIndices.size} items approved with ${markupText} markup!`);
      router.push("/dashboard/admin/bulk-listings");
    } catch (error: any) {
      console.error("Failed to approve:", error);
      showToast.error(error.response?.data?.message || "Failed to approve items");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/admin/bulk-listings" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Review Bulk Request</h1>
            </div>
            <ThemeToggle />
          </div>
        </header>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/admin/bulk-listings" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Review Bulk Request</h1>
            </div>
            <ThemeToggle />
          </div>
        </header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">Request not found</div>
        </div>
      </div>
    );
  }

  const rows = (request.parsedData as any[]) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/admin/bulk-listings"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Review Bulk Request</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Seller: {request.seller?.name} ({request.seller?.email})
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 pb-20">

      {/* Documents */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 flex gap-4">
        <a
          href={request.documentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
        >
          <FileText className="w-4 h-4" />
          View Credibility Document
          <ExternalLink className="w-3 h-3 ml-1" />
        </a>
        <a
          href={request.csvUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <Download className="w-4 h-4" />
          Download CSV
        </a>
      </div>

      {/* Items Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/30">
          <h3 className="font-semibold text-gray-900 dark:text-white">Extracted Items ({rows.length})</h3>
          <div className="flex gap-2 text-sm">
            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Matched: {rows.filter(r => r.status === 'MATCHED').length}
            </span>
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              New/Unmatched: {rows.filter(r => r.status === 'NEW').length}
            </span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIndices.size === rows.length && rows.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Brand Name</th>
                <th className="px-4 py-3">Form/Strength</th>
                <th className="px-4 py-3">Manufacturer</th>
                <th className="px-4 py-3">Pricing (MRP / List)</th>
                <th className="px-4 py-3">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {rows.map((row, index) => {
                const isMatched = row.status === 'MATCHED';
                const isInvalid = row.status === 'INVALID';
                const rowClass = isMatched 
                  ? 'bg-green-50/30 dark:bg-green-900/10 hover:bg-green-50/50' 
                  : isInvalid 
                    ? 'bg-gray-100 dark:bg-gray-800 opacity-50'
                    : 'bg-red-50/30 dark:bg-red-900/10 hover:bg-red-50/50';

                return (
                  <tr key={index} className={`${rowClass} transition-colors`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIndices.has(index)}
                        onChange={() => handleSelectRow(index)}
                        disabled={isInvalid}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      {isMatched ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          <CheckCircle className="w-3 h-3" /> Matched
                        </span>
                      ) : isInvalid ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          Invalid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                          <AlertCircle className="w-3 h-3" /> New
                        </span>
                      )}
                      {row.matchType === 'REFERENCE' && <div className="text-[10px] text-gray-500 mt-0.5">(Reference DB)</div>}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {row['Brand Name'] || row.brand_name}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {row['Form'] || row.form} {row['Strength'] || row.strength}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {row['Manufacturer'] || row.manufacturer}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      ₹{row['MRP'] || row['MRP(incl of tax)'] || '0'} / ₹{row['List Price'] || row['Unit Rate to 24RX (excl of tax)'] || '0'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {row['Stock'] || '0'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Action Bar */}
      {selectedIndices.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 rounded-full px-6 py-3 flex items-center gap-4 z-50">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {selectedIndices.size} items selected
          </span>
          <button
            onClick={handleApprove}
            disabled={submitting}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-full transition-colors disabled:opacity-50"
          >
            {submitting ? "Approving..." : "Approve Selected"}
          </button>
        </div>
      )}

      {/* Markup Dialog */}
      {showMarkupDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Set Markup</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              This markup will be applied to all {selectedIndices.size} selected items.
            </p>
            <div className="space-y-4">
              {/* Markup Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Markup Type
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="markupType"
                      value="PERCENTAGE"
                      checked={markupType === 'PERCENTAGE'}
                      onChange={(e) => setMarkupType('PERCENTAGE')}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Percentage (%)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="markupType"
                      value="FIXED"
                      checked={markupType === 'FIXED'}
                      onChange={(e) => setMarkupType('FIXED')}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Fixed Value (₹)</span>
                  </label>
                </div>
              </div>

              {/* Percentage Input */}
              {markupType === 'PERCENTAGE' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Markup Percentage (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={markupPercentage}
                    onChange={(e) => setMarkupPercentage(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 15"
                  />
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Final price = Base Price × (1 + {markupPercentage || 0}%/100)
                  </p>
                </div>
              )}

              {/* Fixed Value Input */}
              {markupType === 'FIXED' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Fixed Markup Value (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={markupFixed}
                    onChange={(e) => setMarkupFixed(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 10"
                  />
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Final price = Base Price + ₹{markupFixed || 0}
                  </p>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => setShowMarkupDialog(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmApprove}
                  disabled={submitting}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  Approve with {markupType === 'PERCENTAGE' ? `${markupPercentage}%` : `₹${markupFixed}`} Markup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}
