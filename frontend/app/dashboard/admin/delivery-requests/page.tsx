"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Truck, CheckCircle, XCircle, Package, User, Calendar, MapPin } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import Logo from "@/components/Logo";
import ProfileDropdown from "@/components/ProfileDropdown";
import { deliveryRequestsApi } from "@/lib/api";

export default function AdminDeliveryRequestsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("PENDING");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [processing, setProcessing] = useState(false);

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
    loadRequests();
  }, [router, filter]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const res = await deliveryRequestsApi.getAllRequests(filter);
      setRequests(res.data || []);
    } catch (error) {
      console.error("Failed to load delivery requests:", error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    if (!confirm("Approve this delivery request?")) return;

    try {
      setProcessing(true);
      await deliveryRequestsApi.approveRequest(requestId, reviewNote);
      alert("Delivery request approved successfully!");
      setSelectedRequest(null);
      setReviewNote("");
      loadRequests();
    } catch (error: any) {
      console.error("Failed to approve:", error);
      alert(error.response?.data?.message || "Failed to approve request");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!reviewNote.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }

    if (!confirm("Reject this delivery request?")) return;

    try {
      setProcessing(true);
      await deliveryRequestsApi.rejectRequest(requestId, reviewNote);
      alert("Delivery request rejected");
      setSelectedRequest(null);
      setReviewNote("");
      loadRequests();
    } catch (error: any) {
      console.error("Failed to reject:", error);
      alert(error.response?.data?.message || "Failed to reject request");
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      APPROVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      DISPATCHED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    };
    return styles[status as keyof typeof styles] || styles.PENDING;
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/admin" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <Logo size="sm" href="/" isLoggedIn={true} />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Delivery Requests</h1>
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              <ProfileDropdown user={user} />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {["PENDING", "APPROVED", "REJECTED", "DISPATCHED"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                filter === status
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <Truck className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No {filter.toLowerCase()} requests</h3>
            <p className="text-gray-600 dark:text-gray-400">There are no delivery requests with status: {filter}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Requests List */}
            <div className="space-y-4">
              {requests.map((request: any) => (
                <div
                  key={request.id}
                  onClick={() => setSelectedRequest(request)}
                  className={`bg-white dark:bg-gray-800 rounded-xl p-6 border cursor-pointer transition-all ${
                    selectedRequest?.id === request.id
                      ? "border-blue-500 shadow-lg"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <Truck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {request.inventoryLot?.medicine?.name || "Medicine"}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {request.qty} units
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(request.status)}`}>
                      {request.status}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <User className="w-4 h-4" />
                      <span>{request.requester?.name || "Unknown"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Request Details */}
            <div className="lg:sticky lg:top-24 h-fit">
              {selectedRequest ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Request Details</h2>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedRequest.status)}`}>
                      {selectedRequest.status}
                    </span>
                  </div>

                  {/* Medicine Info */}
                  <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Medicine Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Name:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {selectedRequest.inventoryLot?.medicine?.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Form:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {selectedRequest.inventoryLot?.medicine?.form}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Quantity:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {selectedRequest.qty} units
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Manufacturer:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {selectedRequest.inventoryLot?.medicine?.manufacturer?.name || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Requester Info */}
                  <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Requester Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Name:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {selectedRequest.requester?.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Email:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {selectedRequest.requester?.email}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Phone:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {selectedRequest.requester?.phone || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Requested:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {new Date(selectedRequest.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Review Note */}
                  {selectedRequest.status === "PENDING" && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Review Note {selectedRequest.status === "PENDING" && "(Optional for approval, required for rejection)"}
                      </label>
                      <textarea
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Add a note about this request..."
                      />
                    </div>
                  )}

                  {/* Previous Review Note */}
                  {selectedRequest.reviewerNote && (
                    <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Review Note</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{selectedRequest.reviewerNote}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {selectedRequest.status === "PENDING" && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleReject(selectedRequest.id)}
                        disabled={processing}
                        className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-5 h-5" />
                        Reject
                      </button>
                      <button
                        onClick={() => handleApprove(selectedRequest.id)}
                        disabled={processing}
                        className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-5 h-5" />
                        Approve
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-12 border border-gray-200 dark:border-gray-700 text-center">
                  <Package className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">Select a request to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
