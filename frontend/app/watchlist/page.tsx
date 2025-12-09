"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search, Plus, Edit2, X, TrendingUp, TrendingDown,
  ChevronRight, ChevronDown, Bell, ShoppingCart, Pill,
  ArrowUpDown, Settings, ArrowLeft
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import Logo from "@/components/Logo";
import ProfileDropdown from "@/components/ProfileDropdown";
import { watchlistApi, medicineReferencesApi } from "@/lib/api";

export default function WatchlistPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [watchlists, setWatchlists] = useState<any[]>([]);
  const [activeWatchlist, setActiveWatchlist] = useState<string>("My Watchlist 1");
  const [selectedMedicine, setSelectedMedicine] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "price" | "change">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  
  // Search state
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [addingToWatchlist, setAddingToWatchlist] = useState<string | null>(null);



  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/auth/login");
      return;
    }
    setUser(JSON.parse(userData));
    loadWatchlists();
  }, [router]);

  const loadWatchlists = async () => {
    try {
      setLoading(true);
      const res = await watchlistApi.getWatchlist();
      const items = res.data || [];
      
      // Group by watchlist name (default to "My Watchlist")
      const grouped = items.reduce((acc: any, item: any) => {
        const listName = item.name || "My Watchlist";
        if (!acc[listName]) {
          acc[listName] = [];
        }
        acc[listName].push({
          id: item.id,
          medicineId: item.medicineId,
          name: item.medicine?.name || "Unknown",
          form: item.medicine?.form || "N/A",
          price: 0, // Will be updated from price API
          change: 0,
          changePercent: 0,
          chartData: [0],
          manufacturer: "N/A",
        });
        return acc;
      }, {});

      const watchlistsData = Object.keys(grouped).map(name => ({
        name,
        items: grouped[name],
      }));

      if (watchlistsData.length === 0) {
        watchlistsData.push({ name: "My Watchlist", items: [] });
      }

      setWatchlists(watchlistsData);
      if (watchlistsData.length > 0) {
        setActiveWatchlist(watchlistsData[0].name);
      }
    } catch (error) {
      console.error("Failed to load watchlists:", error);
      // Set empty watchlist on error
      setWatchlists([{ name: "My Watchlist", items: [] }]);
      setActiveWatchlist("My Watchlist");
    } finally {
      setLoading(false);
    }
  };

  // Search for medicines to add
  const handleSearch = async () => {
    if (searchQuery.length < 2) return;
    
    try {
      setSearching(true);
      setShowSearchResults(true);
      const res = await medicineReferencesApi.search(searchQuery);
      const medicines = res.data || [];
      setSearchResults(medicines);
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Add medicine to watchlist
  const handleAddToWatchlist = async (medicine: any) => {
    try {
      setAddingToWatchlist(medicine.id);
      await watchlistApi.addToWatchlist({ 
        medicineId: medicine.id,
        name: activeWatchlist,
      });
      
      // Refresh watchlists
      await loadWatchlists();
      setSearchQuery("");
      setSearchResults([]);
      setShowSearchResults(false);
    } catch (error: any) {
      console.error("Failed to add to watchlist:", error);
      alert(error.response?.data?.message || "Failed to add to watchlist");
    } finally {
      setAddingToWatchlist(null);
    }
  };

  // Remove from watchlist
  const handleRemoveFromWatchlist = async (itemId: string) => {
    try {
      await watchlistApi.removeFromWatchlist(itemId);
      await loadWatchlists();
    } catch (error: any) {
      console.error("Failed to remove from watchlist:", error);
      alert(error.response?.data?.message || "Failed to remove from watchlist");
    }
  };

  const currentWatchlist = watchlists.find(w => w.name === activeWatchlist);
  const sortedItems = currentWatchlist?.items.sort((a: any, b: any) => {
    let comparison = 0;
    if (sortBy === "name") {
      comparison = a.name.localeCompare(b.name);
    } else if (sortBy === "price") {
      comparison = a.price - b.price;
    } else if (sortBy === "change") {
      comparison = a.changePercent - b.changePercent;
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const MiniChart = ({ data }: { data: number[] }) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min;
    const width = 80;
    const height = 30;
    
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    }).join(" ");

    const isPositive = data[data.length - 1] > data[0];

    return (
      <svg width={width} height={height} className="inline-block">
        <polyline
          points={points}
          fill="none"
          stroke={isPositive ? "#10b981" : "#ef4444"}
          strokeWidth="2"
        />
      </svg>
    );
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="flex justify-between items-center h-16 gap-2">
            {/* Left Side - Back Button + Logo */}
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <Link href={`/dashboard/${user.roleCode.toLowerCase()}`} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </Link>
              <Logo size="sm" href="/" isLoggedIn={true} />
            </div>

            {/* Center - Fixed Navigation */}
            <nav className="hidden md:flex items-center gap-3 lg:gap-6">
              <Link href="/medicines" className="text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">
                Explore
              </Link>
              <Link href={`/dashboard/${user.roleCode.toLowerCase()}`} className="text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">
                Dashboard
              </Link>
            </nav>

            {/* Right Side - Portfolio, Watchlist, Theme, User */}
            <div className="flex items-center gap-1.5 sm:gap-3 lg:gap-4 flex-shrink-0">
              <Link href="/portfolio" className="hidden lg:block text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">
                Portfolio
              </Link>
              <Link href="/watchlist" className="hidden lg:block text-sm text-blue-600 dark:text-blue-400 font-medium">
                Watchlist
              </Link>

              <ThemeToggle />

              <ProfileDropdown user={user} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
          <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400">Home</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 dark:text-white">All watchlists</span>
        </div>

        {/* Page Title */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">All watchlists</h1>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Watchlist Content */}
            <div className="lg:col-span-2">
              {/* Watchlist Tabs */}
              <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                {watchlists.map((wl) => (
                  <button
                    key={wl.name}
                    onClick={() => setActiveWatchlist(wl.name)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      activeWatchlist === wl.name
                        ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    {wl.name}
                  </button>
                ))}
                
                <button 
                  onClick={() => setIsEditMode(!isEditMode)}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  title="Edit watchlists"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                
                <button 
                  onClick={() => {
                    const newName = prompt("Enter new watchlist name:");
                    if (newName && newName.trim()) {
                      setWatchlists([...watchlists, { name: newName.trim(), items: [] }]);
                      setActiveWatchlist(newName.trim());
                    }
                  }}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  title="Create new watchlist"
                >
                  <Plus className="w-4 h-4" />
                </button>

                <button className="ml-auto p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="mb-6 relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search & add medicines..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (e.target.value.length >= 2) {
                        handleSearch();
                      } else {
                        setShowSearchResults(false);
                        setSearchResults([]);
                      }
                    }}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm
                             text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {/* Search Results Dropdown */}
                {showSearchResults && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                    {searching ? (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        Searching...
                      </div>
                    ) : searchResults.length > 0 ? (
                      <>
                        <div className="p-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                          {searchResults.length} results found
                        </div>
                        {searchResults.map((medicine: any) => {
                          const isInWatchlist = currentWatchlist?.items.some((item: any) => item.medicineId === medicine.id);
                          return (
                            <button
                              key={medicine.id}
                              onClick={() => !isInWatchlist && handleAddToWatchlist(medicine)}
                              disabled={isInWatchlist || addingToWatchlist === medicine.id}
                              className={`w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0 flex items-center justify-between ${
                                isInWatchlist ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            >
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white text-sm">{medicine.name}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {medicine.form} {medicine.strength && `- ${medicine.strength}`}
                                </div>
                              </div>
                              {addingToWatchlist === medicine.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              ) : isInWatchlist ? (
                                <span className="text-xs text-green-600 dark:text-green-400">✓ Added</span>
                              ) : (
                                <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              )}
                            </button>
                          );
                        })}
                      </>
                    ) : searchQuery.length >= 2 ? (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        No medicines found
                      </div>
                    ) : null}
                    
                    {/* Close button */}
                    <button
                      onClick={() => {
                        setShowSearchResults(false);
                        setSearchQuery("");
                        setSearchResults([]);
                      }}
                      className="w-full p-2 text-center text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border-t border-gray-200 dark:border-gray-700"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>

              {/* Sort Controls */}
              <div className="flex items-center gap-4 mb-4 text-sm">
                <button 
                  onClick={() => {
                    setSortBy("name");
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  }}
                  className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  Medicine <ArrowUpDown className="w-3 h-3" />
                </button>
                
                <button 
                  onClick={() => {
                    setSortBy("price");
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  }}
                  className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  Market price <ArrowUpDown className="w-3 h-3" />
                </button>
                
                <button 
                  onClick={() => {
                    setSortBy("change");
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  }}
                  className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  Day change (%) <ArrowUpDown className="w-3 h-3" />
                </button>
              </div>

              {/* Medicine Cards */}
              <div className="space-y-2">
                {sortedItems && sortedItems.length > 0 ? (
                  sortedItems.map((item: any) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-lg border transition-all ${
                        selectedMedicine?.id === item.id
                          ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
                          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setSelectedMedicine(item)}
                          className="flex-1 text-left"
                        >
                          <div className="font-medium text-gray-900 dark:text-white mb-1">{item.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{item.form}</div>
                        </button>

                        <div className="flex items-center gap-4">
                          <div className="text-center hidden sm:block">
                            <MiniChart data={item.chartData} />
                          </div>

                          <div className="text-right">
                            <div className="font-semibold text-gray-900 dark:text-white">₹{item.price.toFixed(2)}</div>
                            <div className={`text-sm font-medium ${
                              item.changePercent >= 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                            }`}>
                              {item.changePercent > 0 ? "▲ +" : "▼ "}{item.changePercent.toFixed(2)}%
                            </div>
                          </div>
                          
                          {isEditMode && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveFromWatchlist(item.id);
                              }}
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Remove from watchlist"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Pill className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No medicines in this watchlist</p>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
                      Use the search bar above to find and add medicines
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Medicine Details */}
            <div className="lg:col-span-1">
              {selectedMedicine ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-800 sticky top-24">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{selectedMedicine.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        PSE ₹{selectedMedicine.price.toFixed(2)} 
                        <span className={`ml-2 ${
                          selectedMedicine.changePercent >= 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                        }`}>
                          ({selectedMedicine.changePercent >= 0 ? "+" : ""}{selectedMedicine.changePercent.toFixed(2)}%)
                        </span>
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Depth</p>
                    </div>
                    <button 
                      onClick={() => setSelectedMedicine(null)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Buy/Sell Tabs */}
                  <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                    <button
                      onClick={() => setActiveTab("buy")}
                      className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === "buy"
                          ? "border-green-600 text-green-600 dark:text-green-400"
                          : "border-transparent text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      BUY
                    </button>
                    <button
                      onClick={() => setActiveTab("sell")}
                      className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === "sell"
                          ? "border-red-600 text-red-600 dark:text-red-400"
                          : "border-transparent text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      SELL
                    </button>
                  </div>

                  {/* Quick Info */}
                  <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Current Price:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          ₹{selectedMedicine.price.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Day Change:</span>
                        <span className={`font-semibold ${
                          selectedMedicine.changePercent >= 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                        }`}>
                          {selectedMedicine.changePercent > 0 ? "▲ +" : "▼ "}{selectedMedicine.changePercent.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <button 
                      onClick={() => router.push(`/medicines/${selectedMedicine.medicineId}`)}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      View Medicine Details
                    </button>
                    <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                      Go to medicine page to place orders
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-800 text-center">
                  <Pill className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">Select a medicine to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
