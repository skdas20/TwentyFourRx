"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package, Plus, CheckCircle, Clock, XCircle, Pill, Edit, Trash2, X } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { listingsApi } from "@/lib/api";
import { showToast } from "@/lib/toast";

export default function MyListingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [bulkRequests, setBulkRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [editingListing, setEditingListing] = useState<any>(null);
  const [deletingListing, setDeletingListing] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    basePrice: "",
    stock: "",
    gstPercentage: "",
  });
  const [productImage, setProductImage] = useState<File | null>(null);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/auth/login");
      return;
    }
    const parsed = JSON.parse(userData);
    if (parsed.roleCode !== "SELLER" && parsed.roleCode !== "TRADER") {
      router.push("/auth/login");
      return;
    }
    setUser(parsed);
    loadListings();
    loadBulkRequests();
  }, [router]);

  const loadListings = async () => {
    try {
      const response = await listingsApi.getMyListings();
      setListings(response.data);
    } catch (error) {
      console.error("Failed to load listings:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadBulkRequests = async () => {
    try {
      const response = await listingsApi.getMyBulkRequests();
      setBulkRequests(response.data || []);
    } catch (error) {
      console.error("Failed to load bulk requests:", error);
    }
  };

  const handleEditClick = (listing: any) => {
    setEditingListing(listing);
    setEditForm({
      basePrice: listing.basePrice || "",
      stock: listing.stock || "",
      gstPercentage: listing.gstPercentage || "0",
    });
    setProductImage(null); // Reset image on open
  };

  const handleUpdateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingListing) return;

    setUpdating(true);
    try {
      const token = localStorage.getItem("accessToken");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

      const formData = new FormData();
      formData.append('basePrice', editForm.basePrice);
      formData.append('stock', editForm.stock);
      formData.append('gstPercentage', editForm.gstPercentage);
      if (productImage) {
        formData.append('productImage', productImage);
      }

      const response = await fetch(`${apiUrl}/listings/${editingListing.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          // Content-Type is set automatically by browser for FormData
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to update listing");
      }

      showToast.success("Listing updated successfully!");
      setEditingListing(null);
      await loadListings();
    } catch (error: any) {
      showToast.error(error.message || "Failed to update listing");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteListing = async () => {
    if (!deletingListing) return;

    setDeleting(true);
    try {
      const token = localStorage.getItem("accessToken");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

      const response = await fetch(`${apiUrl}/listings/${deletingListing.id}/delete`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete listing");
      }

      showToast.success("Listing deleted successfully!");
      setDeletingListing(null);
      await loadListings();
    } catch (error: any) {
      showToast.error(error.message || "Failed to delete listing");
    } finally {
      setDeleting(false);
    }
  };

  const filteredListings = listings.filter((listing) => {
    if (filter === "ALL") return listing.status !== "INACTIVE";
    return listing.status === filter;
  });

  const stats = {
    total: listings.filter((l) => l.status !== "INACTIVE").length,
    pending: listings.filter((l) => l.status === "PENDING").length,
    active: listings.filter((l) => l.status === "ACTIVE").length,
    rejected: listings.filter((l) => l.status === "REJECTED").length,
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
                href="/dashboard/seller"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Listings</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Manage your medicine inventory</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/seller/listings/new"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Sell
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Bulk Upload Requests Section */}
        {bulkRequests.length > 0 && (
          <div className="mb-8 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6 border-2 border-purple-200 dark:border-purple-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">📦 Bulk Upload Requests</h3>
            <div className="space-y-3">
              {bulkRequests.map((req: any) => (
                <div key={req.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(req.createdAt).toLocaleDateString()} at {new Date(req.createdAt).toLocaleTimeString()}
                      </div>
                      {req.status === 'PENDING' && (
                        <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-xs font-medium rounded flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Analyzing...
                        </span>
                      )}
                      {req.status === 'PROCESSED' && (
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-medium rounded flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Ready for Admin Review
                        </span>
                      )}
                      {req.status === 'APPROVED' && (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs font-medium rounded flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Approved
                        </span>
                      )}
                      {req.status === 'ERROR' && (
                        <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs font-medium rounded flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          Error - Check File Format
                        </span>
                      )}
                    </div>
                    {req.parsedData && Array.isArray(req.parsedData) && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {req.parsedData.length} items found
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Listings</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
              </div>
              <Package className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.active}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>

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
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Rejected</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.rejected}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex gap-2">
            {["ALL", "ACTIVE", "PENDING", "REJECTED"].map((status) => (
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

        {/* Listings */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <Package className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No listings found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {filter === "ALL" ? "Create your first listing to get started" : `No ${filter.toLowerCase()} listings`}
            </p>
            {filter === "ALL" && (
              <Link
                href="/dashboard/seller/listings/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Sell
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => (
              <div
                key={listing.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all"
              >
                {/* Medicine Icon */}
                <div className="w-full h-24 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg flex items-center justify-center mb-4">
                  <Pill className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                </div>

                {/* Medicine Info */}
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {listing.medicine?.name || "Medicine"}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {listing.medicine?.form} {listing.medicine?.strength && `- ${listing.medicine.strength}`}
                </p>

                {/* Status Badge */}
                <div className="mb-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      listing.status === "ACTIVE"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                        : listing.status === "PENDING"
                        ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
                        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                    }`}
                  >
                    {listing.status}
                  </span>
                </div>

                {/* Pricing */}
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Base Price:</span>
                    <p className="text-gray-900 dark:text-gray-100 font-semibold">₹{listing.basePrice}</p>
                  </div>
                  {listing.listPrice && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">List Price:</span>
                      <p className="text-gray-900 dark:text-gray-100 font-semibold">₹{listing.listPrice}</p>
                    </div>
                  )}
                  {(listing.medicine?.mrp ?? listing.proposedMrp) != null && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">MRP:</span>
                      <p className="text-gray-900 dark:text-gray-100 font-semibold">₹{listing.medicine?.mrp ?? listing.proposedMrp}</p>
                    </div>
                  )}
                </div>

                {/* Stock */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Package className="w-4 h-4" />
                    <span>{listing.stock} units</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(listing.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleEditClick(listing)}
                    className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => setDeletingListing(listing)}
                    className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Edit Modal */}
      {editingListing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Edit Listing</h2>
              <button
                onClick={() => setEditingListing(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateListing} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Product Image (Optional)
                </label>
                <div className="flex items-center gap-4">
                  {editingListing.productImageUrl && !productImage && (
                    <img 
                      src={editingListing.productImageUrl} 
                      alt="Current" 
                      className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                    />
                  )}
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && file.size > 5 * 1024 * 1024) {
                        showToast.error("Image must be less than 5MB");
                        e.target.value = '';
                        return;
                      }
                      setProductImage(file || null);
                    }}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300"
                  />
                </div>
                {productImage && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    ✓ New image selected: {productImage.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Base Price (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.basePrice}
                  onChange={(e) => setEditForm({ ...editForm, basePrice: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Current price: ₹{editingListing.basePrice}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Stock (Units)
                </label>
                <input
                  type="number"
                  value={editForm.stock}
                  onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  GST Percentage (%)
                </label>
                <select
                  value={editForm.gstPercentage}
                  onChange={(e) => setEditForm({ ...editForm, gstPercentage: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingListing(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updating ? "Updating..." : "Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingListing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Confirm Delete</h2>
              <button
                onClick={() => setDeletingListing(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this listing for <strong>{deletingListing.medicine?.name}</strong>? This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeletingListing(null)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteListing}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
