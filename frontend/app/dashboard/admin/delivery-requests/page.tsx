"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Truck, CheckCircle, XCircle, Package, User, Calendar, MapPin, FileText } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import Logo from "@/components/Logo";
import ProfileDropdown from "@/components/ProfileDropdown";
import { deliveryRequestsApi, usersApi } from "@/lib/api";
import { showToast } from "@/lib/toast";

export default function AdminDeliveryRequestsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("PENDING");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [selectedCourierId, setSelectedCourierId] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");

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
    loadCouriers();
  }, [router, filter]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const res = await deliveryRequestsApi.getAllRequests(filter);
      console.log('📦 Delivery Requests Response:', res.data);
      console.log('📦 First Request:', res.data?.[0]);
      setRequests(res.data || []);
    } catch (error) {
      console.error("Failed to load delivery requests:", error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    if (!selectedCourierId) {
      showToast.error("Please select a courier");
      return;
    }
    if (!destinationAddress.trim()) {
      showToast.error("Please enter destination address");
      return;
    }
    if (!confirm("Assign courier for this delivery request?")) return;

    try {
      setProcessing(true);
      await deliveryRequestsApi.assignCourier(requestId, selectedCourierId, destinationAddress.trim());
      showToast.success("Courier assigned successfully!");
      setSelectedRequest(null);
      setReviewNote("");
      setSelectedCourierId("");
      setDestinationAddress("");
      loadRequests();
    } catch (error: any) {
      console.error("Failed to assign courier:", error);
      showToast.error(error.response?.data?.message || "Failed to assign courier");
    } finally {
      setProcessing(false);
    }
  };

  const loadCouriers = async () => {
    try {
      const res = await usersApi.getUsers({ roleCode: "COURIER", status: "APPROVED" });
      setCouriers(res.data || []);
    } catch (error) {
      console.error("Failed to load couriers:", error);
      setCouriers([]);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!reviewNote.trim()) {
      showToast.error("Please provide a reason for rejection");
      return;
    }

    if (!confirm("Reject this delivery request?")) return;

    try {
      setProcessing(true);
      await deliveryRequestsApi.rejectRequest(requestId, reviewNote);
      showToast.success("Delivery request rejected");
      setSelectedRequest(null);
      setReviewNote("");
      loadRequests();
    } catch (error: any) {
      console.error("Failed to reject:", error);
      showToast.error(error.response?.data?.message || "Failed to reject request");
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkPaymentReceived = async (requestId: string) => {
    if (!confirm("Confirm that delivery charge payment has been received?")) return;

    try {
      setProcessing(true);
      await deliveryRequestsApi.markPaymentReceived(requestId, reviewNote || undefined);
      showToast.success("Delivery payment marked as received");
      setSelectedRequest(null);
      await loadRequests();
    } catch (error: any) {
      console.error("Failed to mark payment:", error);
      showToast.error(error.response?.data?.message || "Failed to mark payment received");
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      AWAITING_COURIER_PICKUP: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
      IN_TRANSIT: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      PENDING_OTP_VERIFICATION: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
      DELIVERED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
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
          {["PENDING", "AWAITING_COURIER_PICKUP", "IN_TRANSIT", "PENDING_OTP_VERIFICATION", "DELIVERED", "REJECTED"].map((status) => (
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
                  onClick={() => {
                    console.log('📦 Selected Request:', request);
                    console.log('📦 Invoice URL:', request.invoiceUrl);
                    console.log('📦 Package Image URL:', request.packageImageUrl);
                    setSelectedRequest(request);
                    setSelectedCourierId(request.assignedCourierId || "");
                    setDestinationAddress(request.destinationAddress || "");
                  }}
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

                  {/* Route Info */}
                  {(selectedRequest.sourceAddress || selectedRequest.destinationAddress) && (
                    <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Delivery Route</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-600 dark:text-gray-400">Source (Seller):</span>
                          <span className="font-medium text-gray-900 dark:text-white text-right">
                            {selectedRequest.sourceAddress || "Not available"}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-600 dark:text-gray-400">Destination:</span>
                          <span className="font-medium text-gray-900 dark:text-white text-right">
                            {selectedRequest.destinationAddress || "Not set"}
                          </span>
                        </div>
                        {selectedRequest.assignedCourier && (
                          <div className="flex justify-between gap-4">
                            <span className="text-gray-600 dark:text-gray-400">Assigned Courier:</span>
                            <span className="font-medium text-gray-900 dark:text-white text-right">
                              {selectedRequest.assignedCourier.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tracking & Delivery Info */}
                  {(selectedRequest.trackingNumber || selectedRequest.deliveryPartner) && (
                    <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Shipping Information</h3>
                      <div className="space-y-2 text-sm">
                        {selectedRequest.trackingNumber && (
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Tracking Number:</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {selectedRequest.trackingNumber}
                            </span>
                          </div>
                        )}
                        {selectedRequest.deliveryPartner && (
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Delivery Partner:</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {selectedRequest.deliveryPartner}
                            </span>
                          </div>
                        )}
                        {selectedRequest.courierBillAmount > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Courier Charge:</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              ₹{Number(selectedRequest.courierBillAmount).toFixed(2)}
                            </span>
                          </div>
                        )}
                        {selectedRequest.courierBillAmount > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Payment Status:</span>
                            <span className={`font-medium ${selectedRequest.deliveryChargePaid ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                              {selectedRequest.deliveryChargePaid ? 'Received' : 'Pending'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Document/Invoice Info */}
                  {(selectedRequest.medicineInvoiceUrl || selectedRequest.courierInvoiceUrl || selectedRequest.packageImageUrl) && (
                    <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Invoices & Proof</h3>
                      <div className="text-sm space-y-3">
                        <div className="flex flex-wrap gap-3">
                          {selectedRequest.medicineInvoiceUrl && (
                            <a 
                              href={selectedRequest.medicineInvoiceUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            >
                              <FileText className="w-4 h-4" />
                              Medicine Invoice
                            </a>
                          )}
                          {selectedRequest.courierInvoiceUrl && (
                            <a 
                              href={selectedRequest.courierInvoiceUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-amber-600 hover:text-amber-700 dark:text-amber-400 font-medium rounded-lg border border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                            >
                              <FileText className="w-4 h-4" />
                              Courier Invoice
                            </a>
                          )}
                          {selectedRequest.packageImageUrl && (
                            <a 
                              href={selectedRequest.packageImageUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-green-600 hover:text-green-700 dark:text-green-400 font-medium rounded-lg border border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                            >
                              <Package className="w-4 h-4" />
                              View Package Photo
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Courier Assignment */}
                  {selectedRequest.status === "PENDING" && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Assign Courier <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedCourierId}
                        onChange={(e) => setSelectedCourierId(e.target.value)}
                        className="w-full px-4 py-2 mb-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select courier partner</option>
                        {couriers.map((courier: any) => (
                          <option key={courier.id} value={courier.id}>
                            {courier.name} {courier.phone ? `(${courier.phone})` : ""}
                          </option>
                        ))}
                      </select>

                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Destination Address <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={destinationAddress}
                        onChange={(e) => setDestinationAddress(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter full delivery destination defined by admin"
                      />

                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mt-4 mb-2">
                        Rejection Note (only if rejecting)
                      </label>
                      <textarea
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        rows={2}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Reason for rejection"
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
                        disabled={processing || !selectedCourierId || !destinationAddress.trim()}
                        className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-5 h-5" />
                        Assign Courier
                      </button>
                    </div>
                  )}
                  {selectedRequest.status === "IN_TRANSIT" && selectedRequest.courierBillAmount > 0 && !selectedRequest.deliveryChargePaid && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleMarkPaymentReceived(selectedRequest.id)}
                        disabled={processing}
                        className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-5 h-5" />
                        Mark Payment Received
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


