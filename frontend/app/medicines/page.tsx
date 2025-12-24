"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pill, Search, Filter, Package, Users, TrendingUp, TrendingDown } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import Logo from "@/components/Logo";
import SearchBar from "@/components/SearchBar";
import ProfileDropdown from "@/components/ProfileDropdown";
import NotificationBell from "@/components/NotificationBell";
import { listingsApi } from "@/lib/api";

export default function MedicinesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedForm, setSelectedForm] = useState("ALL");
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
    loadListings();
  }, []);

  const loadListings = async () => {
    try {
      const response = await listingsApi.getListings();
      setListings(response.data);
    } catch (error) {
      console.error("Failed to load listings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    router.push("/auth/login");
  };

  const filteredMedicines = (() => {
    // First, group listings by medicine ID and find the lowest price for each
    const medicineMap = new Map<string, any>();
    
    listings.forEach((listing: any) => {
      const medicine = listing.medicine;
      if (!medicine) return;
      
      const medicineId = listing.medicineId || medicine.id;
      const listPrice = parseFloat(listing.listPrice || listing.basePrice || 0);
      
      if (!medicineMap.has(medicineId)) {
        // First listing for this medicine
        medicineMap.set(medicineId, {
          ...listing,
          lowestPrice: listPrice,
          sellerCount: 1,
          change: listing.change,
          changePercent: listing.changePercent,
        });
      } else {
        // Update if this listing has a lower price
        const existing = medicineMap.get(medicineId);
        existing.sellerCount += 1;
        if (listPrice < existing.lowestPrice) {
          // Keep the listing with lowest price but preserve seller count and trends
          const sellerCount = existing.sellerCount;
          medicineMap.set(medicineId, {
            ...listing,
            lowestPrice: listPrice,
            sellerCount,
            change: listing.change,
            changePercent: listing.changePercent,
          });
        }
      }
    });
    
    // Convert to array and apply filters
    return Array.from(medicineMap.values()).filter((listing: any) => {
      const medicine = listing.medicine;
      if (!medicine) return false;
      
      const medicineName = medicine.name || "";
      const manufacturer = medicine.manufacturer?.name || "";
      const searchText = `${medicineName} ${manufacturer}`.toLowerCase();
      const matchesSearch = searchText.includes(searchTerm.toLowerCase());
      
      const matchesForm = selectedForm === "ALL" || medicine.form === selectedForm;
      
      return matchesSearch && matchesForm;
    });
  })();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header - Same as Dashboard */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="flex justify-between items-center h-16 gap-2">
            {/* Logo & Nav */}
            <div className="flex items-center gap-3 sm:gap-8 flex-shrink-0">
              <Logo size="sm" href="/" isLoggedIn={!!user} />

              <nav className="hidden lg:flex items-center gap-1">
                <Link href="/medicines" className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400">
                  Explore
                </Link>
                {user && (
                  <Link href={`/dashboard/${user.roleCode.toLowerCase()}`} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    Dashboard
                  </Link>
                )}
              </nav>
            </div>

            {/* Search - Hidden on mobile, shown in separate row */}
            <div className="hidden md:flex flex-1 max-w-md mx-4">
              <SearchBar variant="navbar" isLoggedIn={!!user} />
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
              {user && (user.roleCode === 'TRADER' || user.roleCode === 'SELLER') && (
                <>
                  <Link href="/portfolio" className="hidden lg:block px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    Portfolio
                  </Link>
                  <Link href="/watchlist" className="hidden lg:block px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    Watchlist
                  </Link>
                </>
              )}

              {user && <NotificationBell />}

              <ThemeToggle />

              {user ? (
                <ProfileDropdown user={user} />
              ) : (
                <Link
                  href="/auth/login"
                  className="hidden sm:block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Login
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Search Bar - Full width on small screens */}
          <div className="md:hidden pb-3 pt-1">
            <SearchBar variant="navbar" isLoggedIn={!!user} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Browse Medicines</h1>
          <p className="text-gray-600 dark:text-gray-400">Find the best prices from verified sellers</p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Medicines
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Medicine name or manufacturer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg 
                           text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 
                           focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Form Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Form Type
              </label>
              <div className="flex gap-2">
                {["ALL", "Tablet", "Capsule"].map((form) => (
                  <button
                    key={form}
                    onClick={() => setSelectedForm(form)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedForm === form
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    {form}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Found <span className="text-blue-600 dark:text-blue-400 font-semibold">{filteredMedicines.length}</span> medicines
          </div>
        </div>

        {/* Medicines Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMedicines.map((listing: any) => (
              <Link
                key={listing.id}
                href={`/medicines/${listing.medicineId || listing.medicine?.id}`}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:scale-105 transition-all group"
              >
                {/* Medicine Image or Icon */}
                <div className="w-full h-32 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg flex items-center justify-center mb-4 group-hover:from-blue-100 group-hover:to-blue-200 dark:group-hover:from-blue-900/30 dark:group-hover:to-blue-800/30 transition-all overflow-hidden">
                  {listing.medicine?.imageUrl || listing.productImageUrl ? (
                    <img
                      src={listing.medicine?.imageUrl || listing.productImageUrl}
                      alt={listing.medicine?.name || "Medicine"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Pill className="w-16 h-16 text-blue-600 dark:text-blue-400" />
                  )}
                </div>

                {/* Info */}
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {listing.medicine?.name || "Medicine"}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {listing.medicine?.form} {listing.medicine?.strength && `- ${listing.medicine.strength}`}
                </p>
                <div className="flex gap-2 mb-3">
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs font-medium">
                    {listing.status}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">
                    {listing.seller?.name || "Seller"}
                  </span>
                </div>
                {listing.medicine?.manufacturer && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">
                    by {listing.medicine.manufacturer.name}
                  </p>
                )}

                {/* Price */}
                <div className="mb-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Lowest Price {listing.sellerCount > 1 && <span className="text-xs text-gray-500">({listing.sellerCount} sellers)</span>}
                  </div>
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      ₹{listing.lowestPrice?.toFixed(2) || listing.listPrice || listing.basePrice}
                      <sup className="text-xs ml-0.5">*</sup>
                    </span>
                    {listing.changePercent !== undefined && listing.changePercent !== 0 && (
                      <span className={`text-sm font-medium flex items-center gap-0.5 ${listing.changePercent > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {listing.changePercent > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(listing.changePercent).toFixed(1)}%
                      </span>
                    )}
                    <span className="text-sm text-gray-500">per unit</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    *Excl. GST
                  </div>
                </div>

                {/* Stats */}
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-1">
                    <Package className="w-4 h-4" />
                    <span>{listing.stock?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs">Stock available</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!loading && filteredMedicines.length === 0 && (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <Search className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No medicines found</h3>
            <p className="text-gray-600 dark:text-gray-400">Try adjusting your search or filters</p>
          </div>
        )}
      </main>
    </div>
  );
}
