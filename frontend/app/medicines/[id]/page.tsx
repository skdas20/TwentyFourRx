"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  Bell, Heart, Share2, BarChart3, Activity, ShoppingCart, ArrowLeft
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import Logo from "@/components/Logo";
import SearchBar from "@/components/SearchBar";
import BuyProposalModal from "@/components/BuyProposalModal";
import ProfileDropdown from "@/components/ProfileDropdown";
import { pricesApi, listingsApi, watchlistApi, inventoryApi } from "@/lib/api";

export default function MedicineDetailPage() {
  const router = useRouter();
  const params = useParams();
  const medicineId = params.id as string;
  
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [medicine, setMedicine] = useState<any>(null);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [priceChangePercent, setPriceChangePercent] = useState<number>(0);
  
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  const [timeframe, setTimeframe] = useState<"1d" | "5d" | "1m" | "3m" | "1y" | "5y">("1m");
  
  const [showBuyProposalModal, setShowBuyProposalModal] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  // User holdings check
  const [userHolding, setUserHolding] = useState<any>(null);
  const [holdingsLoaded, setHoldingsLoaded] = useState(false);

  // Related medicines
  const [relatedMedicines, setRelatedMedicines] = useState<any[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
    loadMedicineData();
    checkWatchlistStatus();
    checkUserHoldings();
  }, [medicineId, timeframe]);

  useEffect(() => {
    if (medicine) {
      loadRelatedMedicines();
    }
  }, [medicine]);

  const checkUserHoldings = async () => {
    try {
      const res = await inventoryApi.getUserInventory();
      const inventory = Array.isArray(res.data?.inventory) ? res.data.inventory : [];
      const holding = inventory.find((h: any) => h.medicineId === medicineId);
      setUserHolding(holding || null);
      setHoldingsLoaded(true);
    } catch (error) {
      console.error("Failed to check holdings:", error);
      setHoldingsLoaded(true);
    }
  };

  const loadRelatedMedicines = async () => {
    if (!medicine) return;

    try {
      setLoadingRelated(true);

      // Fetch all active listings
      const listingsRes = await listingsApi.getListings({});
      const allListings = (listingsRes.data || []).filter((l: any) => l.status === 'ACTIVE');

      // Filter medicines with similar form and strength (composition proxy)
      // Exclude the current medicine
      const related = allListings.filter((listing: any) => {
        if (!listing.medicine) return false;
        if (listing.medicineId === medicineId) return false;

        // Match by form (Tablet, Capsule, etc.)
        const sameForm = listing.medicine.form === medicine.form;

        // Match by similar name or manufacturer
        const sameName = listing.medicine.name?.toLowerCase().includes(medicine.name?.toLowerCase().split(' ')[0] || '');
        const sameManufacturer = listing.medicine.manufacturer?.name === medicine.manufacturer?.name;

        // Consider it related if it has same form and (similar name OR same manufacturer)
        return sameForm && (sameName || sameManufacturer);
      });

      // Group by medicine ID to avoid duplicates
      const medicineMap = related.reduce((map: Map<string, any>, listing: any) => {
        const medId = listing.medicineId;
        if (!map.has(medId)) map.set(medId, listing);
        return map;
      }, new Map());
      const uniqueMedicines = Array.from(medicineMap.values());
      // Take only first 6 related medicines
      setRelatedMedicines(uniqueMedicines.slice(0, 6));
    } catch (error) {
      console.error("Failed to load related medicines:", error);
    } finally {
      setLoadingRelated(false);
    }
  };

  const checkWatchlistStatus = async () => {
    if (!user) return;
    try {
      const res = await watchlistApi.isInWatchlist(medicineId);
      setIsInWatchlist(res.data?.isInWatchlist || false);
    } catch (error) {
      console.error("Failed to check watchlist status:", error);
    }
  };

  const handleToggleWatchlist = async () => {
    if (!user) {
      alert("Please login to add to watchlist");
      return;
    }

    setWatchlistLoading(true);
    try {
      if (isInWatchlist) {
        // Need to get watchlist item ID first
        const watchlistRes = await watchlistApi.getWatchlist();
        const item = watchlistRes.data?.find((w: any) => w.medicineId === medicineId);
        if (item) {
          await watchlistApi.removeFromWatchlist(item.id);
          setIsInWatchlist(false);
        }
      } else {
        await watchlistApi.addToWatchlist({ medicineId });
        setIsInWatchlist(true);
      }
    } catch (error: any) {
      console.error("Failed to toggle watchlist:", error);
      alert(error.response?.data?.message || "Failed to update watchlist");
    } finally {
      setWatchlistLoading(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    const title = `${medicine?.name || "Medicine"} on 24Rx`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch (error) {
        // User cancelled or share failed
        console.log("Share cancelled");
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        alert("Link copied to clipboard!");
      } catch (error) {
        console.error("Failed to copy:", error);
      }
    }
  };

  const loadMedicineData = async () => {
    try {
      setLoading(true);
      
      // Load available listings for this medicine
      const listingsRes = await listingsApi.getListings({ medicineId });
      const listings = (listingsRes.data || []).filter((l: any) => l.status === 'ACTIVE');
      
      // Track the listing price for use in price history
      let listingPrice = 0;
      
      // Get medicine details from first listing
      if (listings.length > 0) {
        setMedicine(listings[0].medicine);
        
        // Select the cheapest listing by default
        const cheapest = listings.sort((a: any, b: any) => 
          parseFloat(a.listPrice || a.basePrice) - parseFloat(b.listPrice || b.basePrice)
        )[0];
        setSelectedListing(cheapest);
        
        // Set current price from the cheapest listing
        listingPrice = parseFloat(cheapest.listPrice || cheapest.basePrice || 0);
        setCurrentPrice(listingPrice);
      } else {
        // No active listings found
        console.log("No active listings found for medicine:", medicineId);
      }
      
      // Load price history
      const days = timeframe === "1d" ? 1 : timeframe === "5d" ? 5 : 
                   timeframe === "1m" ? 30 : timeframe === "3m" ? 90 :
                   timeframe === "1y" ? 365 : 1825;
      
      const priceRes = await pricesApi.getPriceHistory(medicineId, days);
      const history = priceRes.data || [];
      
      // If no price history, create flat line with listing price
      if (history.length === 0) {
        // Use the listing price we just calculated
        if (listingPrice > 0) {
          const mockHistory = Array.from({ length: 30 }, (_, i) => ({
            day: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            minPrice: listingPrice,
            maxPrice: listingPrice,
            avgPrice: listingPrice,
            openPrice: listingPrice,
            closePrice: listingPrice,
          }));
          setPriceHistory(mockHistory);
        }
        setPriceChange(0);
        setPriceChangePercent(0);
      } else {
        setPriceHistory(history);
        const latest = history[history.length - 1];
        const previous = history[history.length - 2] || latest;
        
        // Safely parse prices with fallback to listing price
        const latestPrice = latest?.avgPrice ? parseFloat(latest.avgPrice) : listingPrice;
        const previousPrice = previous?.avgPrice ? parseFloat(previous.avgPrice) : latestPrice;
        
        // Only update current price if we got a valid price from history, otherwise keep listing price
        if (latestPrice > 0) {
          setCurrentPrice(latestPrice);
        }
        const change = latestPrice - previousPrice;
        setPriceChange(change);
        setPriceChangePercent(previousPrice > 0 ? (change / previousPrice) * 100 : 0);
      }
    } catch (error) {
      console.error("Failed to load medicine data:", error);
    } finally {
      setLoading(false);
    }
  };


  // Candlestick Chart Component
  const CandlestickChart = ({ data }: { data: any[] }) => {
    if (!Array.isArray(data) || data.length === 0) return null;

    const width = 800;
    const height = 400;
    const padding = 40;
    
    const prices = data.flatMap(d => [
      parseFloat(d.minPrice),
      parseFloat(d.maxPrice),
      parseFloat(d.openPrice || d.avgPrice),
      parseFloat(d.closePrice || d.avgPrice)
    ]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;
    
    const candleWidth = (width - 2 * padding) / data.length;
    
    return (
      <div className="relative">
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="bg-white dark:bg-gray-900">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padding + (1 - ratio) * (height - 2 * padding);
            const price = minPrice + ratio * priceRange;
            return (
              <g key={ratio}>
                <line
                  x1={padding}
                  y1={y}
                  x2={width - padding}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                  strokeDasharray="4"
                />
                <text
                  x={width - padding + 5}
                  y={y + 4}
                  fontSize="10"
                  fill="#9ca3af"
                >
                  ₹{price.toFixed(2)}
                </text>
              </g>
            );
          })}
          
          {/* Candlesticks */}
          {data.map((d, i) => {
            const open = parseFloat(d.openPrice || d.avgPrice);
            const close = parseFloat(d.closePrice || d.avgPrice);
            const high = parseFloat(d.maxPrice);
            const low = parseFloat(d.minPrice);
            
            const isPriceUp = close >= open;
            // Price up = red (bad for buyers), Price down = green (good for buyers)
            const color = isPriceUp ? "#ef4444" : "#10b981";
            
            const x = padding + i * candleWidth + candleWidth / 2;
            const yHigh = padding + (1 - (high - minPrice) / priceRange) * (height - 2 * padding);
            const yLow = padding + (1 - (low - minPrice) / priceRange) * (height - 2 * padding);
            const yOpen = padding + (1 - (open - minPrice) / priceRange) * (height - 2 * padding);
            const yClose = padding + (1 - (close - minPrice) / priceRange) * (height - 2 * padding);
            
            const bodyTop = Math.min(yOpen, yClose);
            const bodyHeight = Math.abs(yOpen - yClose) || 1;
            
            return (
              <g key={i}>
                {/* Wick */}
                <line
                  x1={x}
                  y1={yHigh}
                  x2={x}
                  y2={yLow}
                  stroke={color}
                  strokeWidth="1"
                />
                {/* Body */}
                <rect
                  x={x - candleWidth * 0.3}
                  y={bodyTop}
                  width={candleWidth * 0.6}
                  height={bodyHeight}
                  fill={color}
                  stroke={color}
                  strokeWidth="1"
                />
              </g>
            );
          })}
        </svg>
        
        {/* Volume bars */}
        <svg width="100%" height="80" viewBox={`0 0 ${width} 80`} className="bg-white dark:bg-gray-900">
          {data.map((d, i) => {
            const open = parseFloat(d.openPrice || d.avgPrice);
            const close = parseFloat(d.closePrice || d.avgPrice);
            const isPriceUp = close >= open;
            // Price up = red (bad for buyers), Price down = green (good for buyers)
            const color = isPriceUp ? "#ef4444" : "#10b981";
            
            const volume = Math.random() * 100; // Mock volume
            const maxVolume = 100;
            const barHeight = (volume / maxVolume) * 60;
            
            const x = padding + i * candleWidth;
            
            return (
              <rect
                key={i}
                x={x + candleWidth * 0.2}
                y={80 - barHeight - 10}
                width={candleWidth * 0.6}
                height={barHeight}
                fill={color}
                opacity="0.5"
              />
            );
          })}
        </svg>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="flex justify-between items-center h-16 gap-2">
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <Link href="/medicines" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </Link>
              <Logo size="sm" href="/" isLoggedIn={!!user} />
            </div>

            <div className="hidden md:flex flex-1 max-w-md mx-4">
              <SearchBar variant="navbar" isLoggedIn={!!user} />
            </div>

            <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
              <button className="p-1.5 sm:p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <ThemeToggle />
              {user && <ProfileDropdown user={user} />}
            </div>
          </div>

          {/* Mobile Search Bar */}
          <div className="md:hidden pb-3 pt-1">
            <SearchBar variant="navbar" isLoggedIn={!!user} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Chart Tools */}
          <div className="hidden lg:block">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-800 sticky top-24">
              <div className="space-y-2">
                <button className="w-full p-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Indicators
                </button>
                <button className="w-full p-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Drawing tools
                </button>

              </div>
            </div>
          </div>

          {/* Center - Chart */}
          <div className="lg:col-span-2">
            {/* Medicine Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-800 mb-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {medicine?.name || "Medicine Name"}
                  </h1>
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">
                      ₹{currentPrice.toFixed(2)}
                      <sup className="text-sm ml-1">*</sup>
                    </span>
                    <span className={`text-lg font-semibold ${priceChange >= 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                      {priceChange > 0 ? "▲" : "▼"} {priceChange >= 0 ? "+" : ""}₹{priceChange.toFixed(2)} ({priceChangePercent > 0 ? "+" : ""}{priceChangePercent.toFixed(2)}%)
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    PSE (Pharmaceutical Stock Exchange) | <span className="text-xs">*Price excluding GST</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleToggleWatchlist}
                    disabled={watchlistLoading}
                    className={`p-2 transition-colors ${
                      isInWatchlist 
                        ? "text-red-600 dark:text-red-400" 
                        : "text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    } ${watchlistLoading ? "opacity-50" : ""}`}
                    title={isInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
                  >
                    <Heart className={`w-5 h-5 ${isInWatchlist ? "fill-current" : ""}`} />
                  </button>
                  <button 
                    onClick={handleShare}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Share"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Timeframe Selector */}
              <div className="flex items-center gap-2 mb-4">
                {(["1d", "5d", "1m", "3m", "1y", "5y"] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                      timeframe === tf
                        ? "bg-blue-600 text-white"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>

              {/* Chart */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <CandlestickChart data={priceHistory} />
              </div>

              {/* Chart Info */}
              <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
                {!Array.isArray(priceHistory) || priceHistory.length === 0 || priceHistory.every(d => d.minPrice === d.maxPrice) ? (
                  <p>No trading activity yet. Showing base price.</p>
                ) : (
                  <p>Real-time price data from multiple traders</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar - Buy/Sell Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-800 sticky top-24">
              {/* Buy/Sell Tabs */}
              <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                <button
                  onClick={() => setActiveTab("buy")}
                  className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
                    activeTab === "buy"
                      ? "border-green-600 text-green-600 dark:text-green-400"
                      : "border-transparent text-gray-600 dark:text-gray-400"
                  }`}
                >
                  BUY
                </button>
                <button
                  onClick={() => setActiveTab("sell")}
                  className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
                    activeTab === "sell"
                      ? "border-red-600 text-red-600 dark:text-red-400"
                      : "border-transparent text-gray-600 dark:text-gray-400"
                  }`}
                >
                  SELL
                </button>
              </div>

              {/* Content based on active tab */}
              {activeTab === "buy" ? (
                <>
                  {/* Buy Proposal Button */}
                  <div className="mb-4">
                    <button
                      onClick={() => setShowBuyProposalModal(true)}
                      className="w-full py-3 px-4 bg-[var(--brand-blue)] hover:bg-[var(--brand-blue-hi)] text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="w-5 h-5" />
                      BUY
                    </button>
                    <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
                      Already bought? Upload receipt for admin approval
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* SELL Tab Content */}
                  {userHolding ? (
                    // User owns this medicine
                    <div className="mb-4">
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700 mb-4">
                        <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">✓ You own this medicine</h4>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          Available in holdings: <span className="font-bold">{userHolding.totalQty} units</span>
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          Avg. cost: ₹{userHolding.avgCost?.toFixed(2) || '0.00'} per unit
                        </p>
                      </div>
                      <button
                        onClick={() => router.push(`/dashboard/seller/listings/new?medicineId=${medicineId}`)}
                        className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
                      >
                        Create Listing to Sell
                      </button>
                    </div>
                  ) : holdingsLoaded ? (
                    // User doesn't own this medicine - allow creating listing with credibility proof
                    <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
                      <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">You don't own this medicine</h4>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                        You can still create a listing for this medicine by uploading a credibility document (invoice/receipt) to prove you have it.
                      </p>
                      <button
                        onClick={() => router.push(`/dashboard/seller/listings/new?medicineId=${medicineId}`)}
                        className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors mb-2"
                      >
                        Create Listing with Proof
                      </button>
                      <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
                        📄 Credibility document will be required
                      </p>
                    </div>
                  ) : (
                    // Loading holdings
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
                    </div>
                  )}

                  {user && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        View all your holdings:
                      </p>
                      <button
                        onClick={() => router.push('/portfolio')}
                        className="w-full py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
                      >
                        View My Portfolio
                      </button>
                    </div>
                  )}
                </>
              )}


            </div>
          </div>
        </div>

        {/* Related Medicines Section */}
        {relatedMedicines.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Related Medicines
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Medicines with similar composition and form
            </p>

            {loadingRelated ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {relatedMedicines.map((listing: any) => (
                  <Link
                    key={listing.id}
                    href={`/medicines/${listing.medicineId}`}
                    className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:scale-105 transition-all"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      {listing.medicine?.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {listing.medicine?.form} {listing.medicine?.strength && `- ${listing.medicine.strength}`}
                    </p>
                    {listing.medicine?.manufacturer && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">
                        by {listing.medicine.manufacturer.name}
                      </p>
                    )}

                    {/* Price */}
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                        ₹{listing.listPrice || listing.basePrice}
                        <sup className="text-xs ml-0.5">*</sup>
                      </span>
                      <span className="text-xs text-gray-500">per unit</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      *Excl. GST
                    </div>

                    {/* Stock */}
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {listing.stock?.toLocaleString() || 0} units available
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Buy Proposal Modal */}
      {selectedListing && (
        <BuyProposalModal
          isOpen={showBuyProposalModal}
          onClose={() => setShowBuyProposalModal(false)}
          listingId={selectedListing.id}
          medicineName={medicine?.name || "Medicine"}
          listPrice={Number(selectedListing.listPrice || selectedListing.basePrice || 0)}
        />
      )}
    </div>
  );
}
