"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Briefcase, TrendingUp, Package, ArrowLeft, PieChart, Truck, X, Loader2, DollarSign } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import ProfileDropdown from "@/components/ProfileDropdown";
import Logo from "@/components/Logo";
import { inventoryApi, deliveryRequestsApi } from "@/lib/api";

export default function PortfolioPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [holdings, setHoldings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalValue, setTotalValue] = useState(0);
  
  // Delivery requests state
  const [deliveryRequests, setDeliveryRequests] = useState<any[]>([]);

  // Delivery request modal state
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState<any>(null);
  const [deliveryQty, setDeliveryQty] = useState(0);
  const [requestingDelivery, setRequestingDelivery] = useState(false);
  const [deliveryError, setDeliveryError] = useState("");
  const [deliverySuccess, setDeliverySuccess] = useState("");

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/auth/login");
      return;
    }
    setUser(JSON.parse(userData));
    loadHoldings();
  }, [router]);

  const loadHoldings = async () => {
    try {
      setLoading(true);
      
      // Load inventory and delivery requests in parallel
      const [inventoryRes, deliveryRes] = await Promise.all([
        inventoryApi.getUserInventory(),
        deliveryRequestsApi.getMyRequests().catch(() => ({ data: [] })),
      ]);
      
      console.log("Inventory API response:", inventoryRes.data);
      console.log("Delivery requests:", deliveryRes.data);
      
      // API returns { inventory: [...], summary: {...} }
      const inventory = Array.isArray(inventoryRes.data?.inventory) ? inventoryRes.data.inventory : [];
      
      // Log each holding's lots for debugging
      inventory.forEach((item: any, index: number) => {
        console.log(`Holding ${index}: ${item.medicineName}, lots:`, item.lots);
      });
      
      setHoldings(inventory);
      setDeliveryRequests(deliveryRes.data || []);

      // Use summary data if available, otherwise calculate
      if (inventoryRes.data?.summary) {
        setTotalValue(inventoryRes.data.summary.totalCurrentValue || 0);
      } else {
        const total = inventory.reduce((sum: number, item: any) => {
          return sum + (item.currentValue || 0);
        }, 0);
        setTotalValue(total);
      }
    } catch (error) {
      console.error("Failed to load holdings:", error);
      setHoldings([]); // Ensure holdings is always an array
    } finally {
      setLoading(false);
    }
  };
  
  // Get status for a holding based on its lots
  const getHoldingStatus = (holding: any) => {
    if (!holding.lots || holding.lots.length === 0) {
      return { status: 'PENDING', label: 'Pending Approval', color: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20' };
    }
    
    // Check if any lot has a delivery request
    const lotIds = holding.lots.map((lot: any) => lot.id);
    const deliveryRequest = deliveryRequests.find((req: any) => 
      lotIds.includes(req.inventoryLotId)
    );
    
    if (deliveryRequest) {
      switch (deliveryRequest.status) {
        case 'PENDING':
          return { status: 'DELIVERY_PENDING', label: 'Delivery Pending', color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20' };
        case 'APPROVED':
          return { status: 'APPROVED', label: 'Approved', color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' };
        case 'DISPATCHED':
          return { status: 'IN_TRANSIT', label: 'In Transit', color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20' };
        case 'DELIVERED':
          return { status: 'DELIVERED', label: 'Delivered', color: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' };
        case 'REJECTED':
          return { status: 'REJECTED', label: 'Rejected', color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20' };
        default:
          return { status: 'AVAILABLE', label: 'Available', color: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' };
      }
    }
    
    return { status: 'AVAILABLE', label: 'Available', color: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' };
  };

  const openDeliveryModal = (holding: any) => {
    setSelectedHolding(holding);
    setDeliveryQty(holding.totalQty || 1);
    setDeliveryError("");
    setDeliverySuccess("");
    setShowDeliveryModal(true);
  };

  const closeDeliveryModal = () => {
    setShowDeliveryModal(false);
    setSelectedHolding(null);
    setDeliveryQty(0);
    setDeliveryError("");
    setDeliverySuccess("");
  };

  const handleRequestDelivery = async () => {
    if (!selectedHolding) {
      setDeliveryError("No holding selected");
      return;
    }

    // Debug logging
    console.log("Selected holding:", JSON.stringify(selectedHolding, null, 2));

    // Check if lots array exists and has items
    if (!selectedHolding.lots || !Array.isArray(selectedHolding.lots) || selectedHolding.lots.length === 0) {
      setDeliveryError("No inventory lot found for this holding. This may happen if your buy proposal hasn't been approved yet, or there's a data issue. Please contact support.");
      return;
    }

    // Find a lot with sufficient quantity
    let selectedLot = null;
    let remainingQty = deliveryQty;
    
    for (const lot of selectedHolding.lots) {
      if (lot.qty >= remainingQty) {
        selectedLot = lot;
        break;
      }
    }
    
    // If no single lot has enough, use the first lot (backend will handle partial)
    if (!selectedLot) {
      selectedLot = selectedHolding.lots[0];
    }
    
    const lotId = selectedLot?.id;
    
    console.log("Selected lot:", selectedLot);
    console.log("Lot ID:", lotId);

    if (!lotId || typeof lotId !== 'string') {
      setDeliveryError(`Invalid lot ID. The inventory record may be corrupted. Please contact support.`);
      return;
    }

    if (deliveryQty <= 0 || deliveryQty > selectedHolding.totalQty) {
      setDeliveryError(`Please enter a valid quantity (1-${selectedHolding.totalQty})`);
      return;
    }

    setRequestingDelivery(true);
    setDeliveryError("");

    try {
      console.log("Sending delivery request:", { inventoryLotId: lotId, qty: deliveryQty });
      
      const res = await deliveryRequestsApi.createRequest({
        inventoryLotId: lotId,
        qty: deliveryQty,
      });

      console.log("Delivery request response:", res);
      
      // Handle response structure
      const successMessage = res.data?.message || "Delivery request submitted successfully!";
      setDeliverySuccess(successMessage);
      
      setTimeout(() => {
        closeDeliveryModal();
        loadHoldings(); // Refresh holdings after successful request
      }, 2000);
    } catch (error: any) {
      console.error("Delivery request error:", error);
      console.error("Error response:", error.response);
      console.error("Error data:", error.response?.data);
      
      const msg = error.response?.data?.message || error.message || "Failed to create delivery request";
      setDeliveryError(msg);
    } finally {
      setRequestingDelivery(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-2">
            {/* Left Side - Back Button + Logo */}
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <Link href={`/dashboard/${user.roleCode.toLowerCase()}`} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </Link>
              <Logo size="sm" href="/" isLoggedIn={true} />
            </div>

            {/* Center - Fixed Navigation */}
            <div className="hidden md:flex items-center gap-3 lg:gap-6">
              <Link
                href="/medicines"
                className="text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
              >
                Explore
              </Link>
              <Link
                href={`/dashboard/${user.roleCode.toLowerCase()}`}
                className="text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
              >
                Dashboard
              </Link>
            </div>

            {/* Right Side - Portfolio, Watchlist, Theme, Logout */}
            <div className="flex items-center gap-1.5 sm:gap-3 lg:gap-4 flex-shrink-0">
              <Link
                href="/portfolio"
                className="hidden lg:block text-sm text-blue-600 dark:text-blue-400 font-medium"
              >
                Portfolio
              </Link>
              <Link
                href="/watchlist"
                className="hidden lg:block text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
              >
                Watchlist
              </Link>
              <ThemeToggle />
              <ProfileDropdown user={user} />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Holdings</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {holdings.reduce((sum: number, item: any) => sum + (item.totalQty || 0), 0)} units
                </p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Value</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  ₹{totalValue.toFixed(2)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Medicines</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {holdings.length}
                </p>
              </div>
              <Briefcase className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Holdings Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : holdings.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <PieChart className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No Holdings Yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Start buying medicines to build your portfolio</p>
            <Link
              href="/medicines"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--brand-blue)] text-white rounded-lg hover:bg-[var(--brand-blue-hi)] transition-colors font-medium"
            >
              <Package className="w-5 h-5" />
              Browse Medicines
            </Link>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Medicine</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Unit Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Total Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {holdings.map((holding: any, index: number) => {
                    const statusInfo = getHoldingStatus(holding);
                    return (
                      <tr key={holding.medicineId || index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4">
                          <Link href={`/medicines/${holding.medicineId}`} className="block hover:text-blue-600 dark:hover:text-blue-400">
                            <div className="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">
                              {holding.medicineName || "Unknown"}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {holding.form} {holding.strength && `- ${holding.strength}`}
                            </div>
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {holding.totalQty} units
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                          ₹{holding.avgCost?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                          ₹{holding.currentValue?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => router.push(`/dashboard/seller/listings/new?medicineId=${holding.medicineId}`)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
                              title="Create a listing to sell this medicine"
                            >
                              <DollarSign className="w-4 h-4" />
                              Sell
                            </button>
                            <button
                              onClick={() => openDeliveryModal(holding)}
                              disabled={statusInfo.status === 'PENDING' || statusInfo.status === 'DELIVERY_PENDING' || statusInfo.status === 'IN_TRANSIT'}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
                              title={statusInfo.status === 'PENDING' ? 'Waiting for buy approval' : statusInfo.status === 'DELIVERY_PENDING' ? 'Delivery request pending' : statusInfo.status === 'IN_TRANSIT' ? 'Already in transit' : 'Request physical delivery'}
                            >
                              <Truck className="w-4 h-4" />
                              Delivery
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Delivery Request Modal */}
      {showDeliveryModal && selectedHolding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-green-600" />
                Request Physical Delivery
              </h3>
              <button
                onClick={closeDeliveryModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 space-y-4">
              {/* Medicine Info */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {selectedHolding.medicineName}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {selectedHolding.form} {selectedHolding.strength && `- ${selectedHolding.strength}`}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Available: <span className="font-semibold">{selectedHolding.totalQty} units</span>
                </div>
              </div>

              {/* Quantity Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quantity to Request
                </label>
                <input
                  type="number"
                  min={1}
                  max={selectedHolding.totalQty}
                  value={deliveryQty}
                  onChange={(e) => setDeliveryQty(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Info Note */}
              <div className="text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                <strong>Note:</strong> Your request will be sent to admin for approval. Once approved, the seller will be notified to dispatch your order.
              </div>

              {/* Error/Success Messages */}
              {deliveryError && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                  {deliveryError}
                </div>
              )}
              {deliverySuccess && (
                <div className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                  {deliverySuccess}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
              <button
                onClick={closeDeliveryModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestDelivery}
                disabled={requestingDelivery || deliveryQty <= 0}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 rounded-lg transition-colors"
              >
                {requestingDelivery ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Truck className="w-4 h-4" />
                    Submit Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
