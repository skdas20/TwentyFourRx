"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pill, CheckCircle, Clock, XCircle, User, Image as ImageIcon, ExternalLink } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

interface Contribution {
  id: string;
  name: string;
  genericName: string | null;
  composition: string;
  form: string;
  strength: string;
  manufacturer: string;
  marketer: string | null;
  packSize: string | null;
  mrp: number | null;
  imageUrl: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewerNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  contributor: { id: string; name: string; email: string };
  reviewer: { id: string; name: string } | null;
}

export default function AdminContributionsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("PENDING");
  const [processing, setProcessing] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [selectedContribution, setSelectedContribution] = useState<Contribution | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/auth/login");
      return;
    }
    const parsed = JSON.parse(userData);
    if (parsed.roleCode !== "ADMIN") {
      router.push("/auth/login");
      return;
    }
    setUser(parsed);
  }, [router]);

  useEffect(() => {
    if (user) {
      loadContributions();
    }
  }, [user, filter]);

  const loadContributions = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
      const response = await fetch(
        `${apiUrl}/medicine-references/contributions?status=${filter}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        }
      );
      const data = await response.json();
      setContributions(data.contributions || []);
    } catch (error) {
      console.error("Failed to load contributions:", error);
    } finally {
      setLoading(false);
    }
  };


  const handleApprove = async (id: string) => {
    if (!confirm("Are you sure you want to approve this contribution? It will be added to the medicine reference database.")) {
      return;
    }
    
    try {
      setProcessing(id);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
      const response = await fetch(
        `${apiUrl}/medicine-references/contributions/${id}/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
          body: JSON.stringify({ reviewerNote: reviewNote }),
        }
      );
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to approve contribution");
      }
      
      alert("Contribution approved successfully!");
      setReviewNote("");
      setSelectedContribution(null);
      loadContributions();
    } catch (error: any) {
      console.error("Failed to approve:", error);
      alert(error.message || "Failed to approve contribution");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!reviewNote.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }
    
    if (!confirm("Are you sure you want to reject this contribution?")) {
      return;
    }
    
    try {
      setProcessing(id);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
      const response = await fetch(
        `${apiUrl}/medicine-references/contributions/${id}/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
          body: JSON.stringify({ reviewerNote: reviewNote }),
        }
      );
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to reject contribution");
      }
      
      alert("Contribution rejected");
      setReviewNote("");
      setSelectedContribution(null);
      loadContributions();
    } catch (error: any) {
      console.error("Failed to reject:", error);
      alert(error.message || "Failed to reject contribution");
    } finally {
      setProcessing(null);
    }
  };

  const stats = {
    pending: contributions.filter((c) => c.status === "PENDING").length,
    approved: contributions.filter((c) => c.status === "APPROVED").length,
    rejected: contributions.filter((c) => c.status === "REJECTED").length,
  };

  if (!user) return null;

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
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Medicine Contributions</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Review and approve user-contributed medicines</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Approved</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.approved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Rejected</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.rejected}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>


        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex gap-2 flex-wrap">
            {["PENDING", "APPROVED", "REJECTED"].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === status
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Contributions List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : contributions.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <Pill className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No contributions found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              No {filter.toLowerCase()} medicine contributions
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {contributions.map((contribution) => (
              <div
                key={contribution.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all"
              >
                <div className="flex items-start gap-4">
                  {/* Medicine Image */}
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {contribution.imageUrl ? (
                      <img
                        src={contribution.imageUrl}
                        alt={contribution.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Pill className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>

                  {/* Medicine Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {contribution.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {contribution.form} - {contribution.strength}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          contribution.status === "APPROVED"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                            : contribution.status === "PENDING"
                            ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
                            : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                        }`}
                      >
                        {contribution.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Composition:</span>
                        <p className="text-gray-900 dark:text-gray-100 truncate">{contribution.composition}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Manufacturer:</span>
                        <p className="text-gray-900 dark:text-gray-100">{contribution.manufacturer}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">MRP:</span>
                        <p className="text-gray-900 dark:text-gray-100 font-semibold">
                          {contribution.mrp ? `₹${contribution.mrp}` : "N/A"}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Pack Size:</span>
                        <p className="text-gray-900 dark:text-gray-100">{contribution.packSize || "N/A"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        <span>Contributed by: {contribution.contributor.name} ({contribution.contributor.email})</span>
                      </div>
                      <span>•</span>
                      <span>{new Date(contribution.createdAt).toLocaleDateString()}</span>
                    </div>

                    {contribution.imageUrl && (
                      <a
                        href={contribution.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-sm font-medium mb-3"
                      >
                        <ImageIcon className="w-4 h-4" />
                        View Product Image
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    {contribution.reviewerNote && (
                      <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Reviewer Note:</span> {contribution.reviewerNote}
                        </p>
                      </div>
                    )}


                    {/* Action Buttons for Pending */}
                    {contribution.status === "PENDING" && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        {selectedContribution?.id === contribution.id ? (
                          <div className="space-y-3">
                            <textarea
                              value={reviewNote}
                              onChange={(e) => setReviewNote(e.target.value)}
                              placeholder="Add a note (required for rejection)..."
                              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 text-sm resize-none"
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApprove(contribution.id)}
                                disabled={processing === contribution.id}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium text-sm"
                              >
                                {processing === contribution.id ? "Processing..." : "Approve"}
                              </button>
                              <button
                                onClick={() => handleReject(contribution.id)}
                                disabled={processing === contribution.id}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors font-medium text-sm"
                              >
                                {processing === contribution.id ? "Processing..." : "Reject"}
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedContribution(null);
                                  setReviewNote("");
                                }}
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectedContribution(contribution)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                          >
                            Review Contribution
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
