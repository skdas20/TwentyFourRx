"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package, CheckCircle, Clock, XCircle, Pill, FileText } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { listingsApi } from "@/lib/api";

export default function AdminAllListingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

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
    loadListings();
  }, [router]);

  const loadListings = async () => {
    try {
      setLoading(true);
      // Get all listings (active, pending, rejected)
      const [activeRes, pendingRes] = await Promise.all([
        listingsApi.getListings(),
        listingsApi.getPendingListings(),
      ]);
      
      // Combine all listings
      const allListings = [...pendingRes.data, ...activeRes.data];
      setListings(allListings);
    } catch (error) {
      console.error("Failed to load listings:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredListings = listings.filter((listing) => {
    if (filter === "ALL") return true;
    return listing.status === filter;
  });

  const stats = {
    total: listings.length,
    pending: listings.filter((l) => l.status === "PENDING").length,
    approved: listings.filter((l) => l.status === "APPROVED").length,
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
                href="/dashboard/admin"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">All Listings</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">View and manage all platform listings</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
              </div>
              <Package className="w-8 h-8 text-blue-600 dark:text-blue-400" />
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
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Approved</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.approved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
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
            {["ALL", "PENDING", "APPROVED", "ACTIVE", "REJECTED"].map((status) => (
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
            <p className="text-gray-600 dark:text-gray-400">
              {filter === "ALL" ? "No listings in the system" : `No ${filter.toLowerCase()} listings`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredListings.map((listing) => (
              <div
                key={listing.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex gap-4 flex-1">
                    {/* Medicine Icon */}
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Pill className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                    </div>

                    {/* Medicine Info */}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        {listing.medicine?.name || "Medicine"}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {listing.medicine?.form} {listing.medicine?.strength && `- ${listing.medicine.strength}`}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mb-3">
                        Seller: {listing.seller?.name || "Unknown"} ({listing.seller?.email})
                      </p>

                      <div className="grid grid-cols-4 gap-4 text-sm">
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
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Stock:</span>
                          <p className="text-gray-900 dark:text-gray-100 font-semibold">{listing.stock} units</p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Created:</span>
                          <p className="text-gray-900 dark:text-gray-100 font-semibold">
                            {new Date(listing.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {listing.documentUrl && (
                        <div className="mt-3">
                          <a
                            href={listing.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            <FileText className="w-4 h-4" />
                            View Document
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        listing.status === "ACTIVE"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                          : listing.status === "APPROVED"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                          : listing.status === "PENDING"
                          ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
                          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                      }`}
                    >
                      {listing.status}
                    </span>
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
