"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pill, Search, Filter, Package, Bookmark, ShoppingCart, TrendingUp, TrendingDown } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import Logo from "@/components/Logo";
import SearchBar from "@/components/SearchBar";
import ProfileDropdown from "@/components/ProfileDropdown";
import NotificationBell from "@/components/NotificationBell";
import BuyProposalModal from "@/components/BuyProposalModal";
import { listingsApi, watchlistApi, pricesApi } from "@/lib/api";

export default function MedicinesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedForm, setSelectedForm] = useState("ALL");
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [watchlistItems, setWatchlistItems] = useState<Set<string>>(new Set());
  const [priceHistories, setPriceHistories] = useState<Map<string, any[]>>(new Map());
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
      loadWatchlist();
    }
    loadListings();
  }, []);

  const loadListings = async () => {
    try {
      const response = await listingsApi.getListings();
      const listingsData = response.data;
      setListings(listingsData);

      // Get unique medicine IDs
      const medicineIds = Array.from(new Set(listingsData.map((l: any) => l.medicineId || l.medicine?.id).filter(Boolean)));

      // Load price history for each medicine (last 7 days for mini charts)
      const historyMap = new Map();
      await Promise.all(
        medicineIds.map(async (medicineId: string) => {
          try {
            const priceRes = await pricesApi.getPriceHistory(medicineId, 7);
            const priceData = priceRes.data || {};
            const rawHistory = Array.isArray(priceData) ? priceData : Array.isArray(priceData.history) ? priceData.history : [];

            if (rawHistory.length > 0) {
              historyMap.set(medicineId, rawHistory);
            }
          } catch (error) {
            // Silently fail for individual medicines
            console.warn(`Failed to load price history for ${medicineId}:`, error);
          }
        })
      );

      setPriceHistories(historyMap);
    } catch (error) {
      console.error("Failed to load listings:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadWatchlist = async () => {
    try {
      const response = await watchlistApi.getWatchlist();
      const medicineIds = new Set(response.data.map((item: any) => item.medicineId));
      setWatchlistItems(medicineIds);
    } catch (error) {
      console.error("Failed to load watchlist:", error);
    }
  };

  const toggleWatchlist = async (medicineId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      router.push("/auth/login");
      return;
    }

    try {
      if (watchlistItems.has(medicineId)) {
        // Find the watchlist item ID and remove it
        const response = await watchlistApi.getWatchlist();
        const item = response.data.find((w: any) => w.medicineId === medicineId);
        if (item) {
          await watchlistApi.removeFromWatchlist(item.id);
          const newSet = new Set(watchlistItems);
          newSet.delete(medicineId);
          setWatchlistItems(newSet);
        }
      } else {
        await watchlistApi.addToWatchlist({ medicineId });
        const newSet = new Set(watchlistItems);
        newSet.add(medicineId);
        setWatchlistItems(newSet);
      }
    } catch (error: any) {
      console.error("Failed to toggle watchlist:", error);
      alert(error.response?.data?.message || "Failed to update watchlist");
    }
  };

  const handleBuyClick = (listing: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      router.push("/auth/login");
      return;
    }

    setSelectedListing(listing);
    setShowBuyModal(true);
  };

  const handleSellClick = (medicineId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      router.push("/auth/login");
      return;
    }

    // Navigate to medicine detail page with sell tab active
    router.push(`/medicines/${medicineId}?tab=sell`);
  };

  const filteredMedicines = (() => {
    // Group listings by medicine ID and find the lowest price for each
    const medicineMap = new Map<string, any>();

    listings.forEach((listing: any) => {
      const medicine = listing.medicine;
      if (!medicine) return;

      const medicineId = listing.medicineId || medicine.id;
      const listPrice = parseFloat(listing.listPrice || listing.basePrice || 0);

      if (!medicineMap.has(medicineId)) {
        medicineMap.set(medicineId, {
          ...listing,
          lowestPrice: listPrice,
          sellerCount: 1,
        });
      } else {
        const existing = medicineMap.get(medicineId);
        existing.sellerCount += 1;
        if (listPrice < existing.lowestPrice) {
          const sellerCount = existing.sellerCount;
          medicineMap.set(medicineId, {
            ...listing,
            lowestPrice: listPrice,
            sellerCount,
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

  // Mini chart component - displays actual price history data
  const MiniChart = ({ medicineId, change }: { medicineId: string; change: number }) => {
    const history = priceHistories.get(medicineId) || [];

    if (history.length === 0) {
      // No data available - show flat line
      return (
        <svg width="60" height="24" className="inline-block">
          <line x1="0" y1="12" x2="60" y2="12" stroke="#6b7280" strokeWidth="1.5" />
        </svg>
      );
    }

    const width = 60;
    const height = 24;
    const padding = 2;

    // Extract prices from history
    const prices = history.map((entry: any) => parseFloat(entry.closePrice || entry.avgPrice || entry.price || 0));

    // Find min and max for normalization
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1; // Avoid division by zero

    // Normalize function
    const normalize = (price: number) => {
      return height - padding - ((price - minPrice) / priceRange) * (height - padding * 2);
    };

    // Generate path points
    const points = prices.map((price, i) => {
      const x = padding + (i / Math.max(prices.length - 1, 1)) * (width - padding * 2);
      const y = normalize(price);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    // Determine color based on overall trend (first vs last price)
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const isRising = lastPrice > firstPrice;
    const isFalling = lastPrice < firstPrice;
    const color = isRising ? "#ef4444" : isFalling ? "#10b981" : "#6b7280";

    return (
      <svg width="60" height="24" className="inline-block">
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
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

            {/* Search - Hidden on mobile */}
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

          {/* Mobile Search Bar */}
          <div className="md:hidden pb-3 pt-1">
            <SearchBar variant="navbar" isLoggedIn={!!user} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Browse Medicines</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Find the best prices from verified sellers</p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-800 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Medicines
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Medicine name or manufacturer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg
                           text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2
                           focus:ring-blue-500 text-sm"
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
                    className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedForm === form
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
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

        {/* Table Header - Desktop Only */}
        <div className="hidden lg:grid grid-cols-12 gap-4 px-4 py-3 bg-gray-100 dark:bg-gray-800/50 rounded-lg mb-2 text-xs font-medium text-gray-600 dark:text-gray-400">
          <div className="col-span-3">Medicine</div>
          <div className="col-span-2 text-center">Market Price</div>
          <div className="col-span-2 text-center">1D Change</div>
          <div className="col-span-2 text-center">Stock</div>
          <div className="col-span-3 text-right">Actions</div>
        </div>

        {/* Medicines List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMedicines.map((listing: any) => {
              const medicineId = listing.medicineId || listing.medicine?.id;
              const isInWatchlist = watchlistItems.has(medicineId);
              const changePercent = listing.changePercent || 0;
              const isPositive = changePercent >= 0;

              return (
                <div
                  key={listing.id}
                  className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-all"
                >
                  {/* Desktop Layout */}
                  <div className="hidden lg:grid grid-cols-12 gap-4 items-center p-4">
                    {/* Medicine Info */}
                    <div className="col-span-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 flex items-center justify-center flex-shrink-0">
                        <Pill className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/medicines/${medicineId}`}
                          className="font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 block truncate"
                        >
                          {listing.medicine?.name || "Medicine"}
                        </Link>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {listing.medicine?.manufacturer?.name || "Manufacturer"}
                        </p>
                      </div>
                    </div>

                    {/* Price + Chart */}
                    <div className="col-span-2 text-center">
                      <div className="mb-1">
                        <MiniChart medicineId={medicineId} change={changePercent} />
                      </div>
                      <div className="font-bold text-gray-900 dark:text-gray-100">
                        ₹{listing.lowestPrice?.toFixed(2) || listing.listPrice || listing.basePrice}
                      </div>
                    </div>

                    {/* 1D Change */}
                    <div className="col-span-2 text-center">
                      <span className={`text-sm font-semibold ${isPositive ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
                      </span>
                      {changePercent !== 0 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          ({isPositive ? '+' : ''}{(listing.lowestPrice * changePercent / 100).toFixed(2)})
                        </div>
                      )}
                    </div>

                    {/* Stock */}
                    <div className="col-span-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Package className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {listing.stock?.toLocaleString() || 0}
                        </span>
                      </div>
                      {listing.sellerCount > 1 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {listing.sellerCount} sellers
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="col-span-3 flex items-center justify-end gap-2">
                      <button
                        onClick={(e) => toggleWatchlist(medicineId, e)}
                        className={`p-2 rounded-lg transition-colors ${
                          isInWatchlist
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                        title={isInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
                      >
                        <Bookmark className="w-4 h-4" fill={isInWatchlist ? "currentColor" : "none"} />
                      </button>

                      <button
                        onClick={(e) => handleBuyClick(listing, e)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-colors"
                        title="Buy"
                      >
                        B
                      </button>

                      <button
                        onClick={(e) => handleSellClick(medicineId, e)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-colors"
                        title="Sell"
                      >
                        S
                      </button>
                    </div>
                  </div>

                  {/* Mobile Layout */}
                  <div className="lg:hidden block p-4">
                    <div className="flex items-start gap-3">
                      <Link href={`/medicines/${medicineId}`}>
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 flex items-center justify-center flex-shrink-0 cursor-pointer">
                          <Pill className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                      </Link>

                      <div className="flex-1 min-w-0">
                        <Link href={`/medicines/${medicineId}`}>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400">
                            {listing.medicine?.name || "Medicine"}
                          </h3>
                        </Link>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          {listing.medicine?.form} {listing.medicine?.strength && `- ${listing.medicine.strength}`}
                        </p>

                        <div className="flex items-center gap-3 mb-2">
                          <div>
                            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                              ₹{listing.lowestPrice?.toFixed(2) || listing.listPrice || listing.basePrice}
                            </span>
                          </div>
                          <span className={`text-sm font-semibold ${isPositive ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                            {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <Package className="w-3 h-3" />
                            {listing.stock?.toLocaleString() || 0} units
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => toggleWatchlist(medicineId, e)}
                              className={`p-1.5 rounded ${
                                isInWatchlist
                                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                              }`}
                            >
                              <Bookmark className="w-3 h-3" fill={isInWatchlist ? "currentColor" : "none"} />
                            </button>
                            <button
                              onClick={(e) => handleBuyClick(listing, e)}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded transition-colors"
                            >
                              B
                            </button>
                            <button
                              onClick={(e) => handleSellClick(medicineId, e)}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded transition-colors"
                            >
                              S
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && filteredMedicines.length === 0 && (
          <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            <Search className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No medicines found</h3>
            <p className="text-gray-600 dark:text-gray-400">Try adjusting your search or filters</p>
          </div>
        )}
      </main>

      {/* Buy Proposal Modal */}
      {showBuyModal && selectedListing && (
        <BuyProposalModal
          isOpen={showBuyModal}
          onClose={() => {
            setShowBuyModal(false);
            setSelectedListing(null);
          }}
          listingId={selectedListing.id}
          medicineName={selectedListing.medicine?.name || "Medicine"}
          listPrice={parseFloat(selectedListing.lowestPrice || selectedListing.listPrice || selectedListing.basePrice || 0)}
          medicineImage={selectedListing.medicine?.imageUrl}
          gstPercentage={parseFloat(selectedListing.gstPercentage || 0)}
        />
      )}
    </div>
  );
}
