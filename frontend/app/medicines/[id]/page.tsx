"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  Bookmark, Share2, ShoppingCart, ArrowLeft, Pill
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import Logo from "@/components/Logo";
import SearchBar from "@/components/SearchBar";
import BuyProposalModal from "@/components/BuyProposalModal";
import ProfileDropdown from "@/components/ProfileDropdown";
import NotificationBell from "@/components/NotificationBell";
import { pricesApi, listingsApi, watchlistApi, inventoryApi } from "@/lib/api";
import { showToast } from "@/lib/toast";

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

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
    loadMedicineData();
    // Only check watchlist and holdings if user is logged in
    if (userData) {
      checkWatchlistStatus();
      checkUserHoldings();
    } else {
      setHoldingsLoaded(true); // Mark as loaded even if not logged in
    }
  }, [medicineId, timeframe]);

  useEffect(() => {
    if (medicine) {
      loadRelatedMedicines();
    }
  }, [medicine]);

  const checkUserHoldings = async () => {
    if (!user) {
      setHoldingsLoaded(true);
      return;
    }
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
      // Fetch all active listings
      const listingsRes = await listingsApi.getListings({});
      const allListings = (listingsRes.data || []).filter((l: any) => l.status === 'ACTIVE');

      // Filter medicines with EXACT same composition only
      const related = allListings.filter((listing: any) => {
        if (!listing.medicine) return false;
        if (listing.medicineId === medicineId) return false;

        // ONLY match if composition is EXACTLY the same (strict equality)
        if (medicine.composition && listing.medicine.composition) {
          const currentComp = medicine.composition.toLowerCase().trim();
          const listingComp = listing.medicine.composition.toLowerCase().trim();

          // Exact composition match only - no partial matches
          return currentComp === listingComp;
        }

        return false;
      });

      // Group by medicine ID to avoid duplicates
      const medicineMap = related.reduce((map: Map<string, any>, listing: any) => {
        const medId = listing.medicineId;
        if (!map.has(medId)) map.set(medId, listing);
        return map;
      }, new Map());
      const uniqueMedicines = Array.from(medicineMap.values());
      setRelatedMedicines(uniqueMedicines.slice(0, 6));
    } catch (error) {
      console.error("Failed to load related medicines:", error);
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
      showToast.warning("Please login to add to watchlist");
      return;
    }

    setWatchlistLoading(true);
    try {
      if (isInWatchlist) {
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
      showToast.error(error.response?.data?.message || "Failed to update watchlist");
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
        console.log("Share cancelled");
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        showToast.success("Link copied to clipboard!");
      } catch (error) {
        console.error("Failed to copy:", error);
      }
    }
  };

  const loadMedicineData = async () => {
    try {
      setLoading(true);
      
      const listingsRes = await listingsApi.getListings({ medicineId });
      const listings = (listingsRes.data || []).filter((l: any) => l.status === 'ACTIVE');
      
      let listingPrice = 0;
      
      if (listings.length > 0) {
        setMedicine(listings[0].medicine);
        
        const cheapest = listings.sort((a: any, b: any) => 
          parseFloat(a.listPrice || a.basePrice) - parseFloat(b.listPrice || b.basePrice)
        )[0];

        const normalizedListing = {
          ...cheapest,
          listPrice: Number(cheapest.listPrice || cheapest.basePrice || 0),
          basePrice: Number(cheapest.basePrice || cheapest.listPrice || 0),
          gstPercentage: Number(cheapest.gstPercentage || 0),
        };

        setSelectedListing(normalizedListing);
        
        listingPrice = normalizedListing.listPrice;
        setCurrentPrice(listingPrice);
      }
      
      const days = timeframe === "1d" ? 1 : timeframe === "5d" ? 5 : 
                   timeframe === "1m" ? 30 : timeframe === "3m" ? 90 :
                   timeframe === "1y" ? 365 : 1825;
      
      const priceRes = await pricesApi.getPriceHistory(medicineId, days);
      const priceData = priceRes.data || {};
      const rawHistory = Array.isArray(priceData)
        ? priceData
        : Array.isArray(priceData.history)
          ? priceData.history
          : [];

      const normalizedHistory = rawHistory.map((entry: any) => ({
        ...entry,
        // Normalize the date field - backend returns 'date', we use 'day' for consistency
        day: entry.day || entry.date,
        minPrice: Number(entry.minPrice ?? entry.avgPrice ?? listingPrice),
        maxPrice: Number(entry.maxPrice ?? entry.avgPrice ?? listingPrice),
        avgPrice: Number(entry.avgPrice ?? entry.closePrice ?? entry.openPrice ?? listingPrice),
        openPrice: Number(entry.openPrice ?? entry.avgPrice ?? entry.minPrice ?? listingPrice),
        closePrice: Number(entry.closePrice ?? entry.avgPrice ?? entry.maxPrice ?? listingPrice),
      }));

      const latestAvgFromApi = typeof priceData.currentPrice?.avg === 'number' ? priceData.currentPrice.avg : null;
      if (!listingPrice && latestAvgFromApi) {
        listingPrice = latestAvgFromApi;
        setCurrentPrice(latestAvgFromApi);
      }
      
      if (normalizedHistory.length === 0) {
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
        setPriceHistory(normalizedHistory);
        
        // Calculate price change based on the FIRST and LAST data points in the period
        // This matches how the dashboard/trending section calculates changes
        const latest = normalizedHistory[normalizedHistory.length - 1];
        const earliest = normalizedHistory[0]; // First point in the period, not previous day
        
        // Get the latest price from history for trend calculation
        const latestHistoryPrice = latest?.avgPrice ? parseFloat(latest.avgPrice) : listingPrice;
        const earliestPrice = earliest?.avgPrice ? parseFloat(earliest.avgPrice) : latestHistoryPrice;
        
        console.log('Price Trend Debug:', { listingPrice, latestHistoryPrice, earliestPrice, historyLength: normalizedHistory.length, timeframe });

        // IMPORTANT: Always use the actual listing price as the displayed current price
        // The listing price is what users will actually pay - it's the source of truth
        
        // Calculate change over the entire selected period (earliest to latest in history)
        if (normalizedHistory.length >= 2 && earliestPrice > 0) {
             // Use listingPrice (current active price) instead of latestHistoryPrice for accuracy
             const change = listingPrice - earliestPrice;
             setPriceChange(change);
             setPriceChangePercent((change / earliestPrice) * 100);
        } else {
             // Fallback: compare with base listing price if history is short
             if (listingPrice > 0 && latestHistoryPrice !== listingPrice) {
                 const change = listingPrice - latestHistoryPrice; // Compare against history if distinct
                 setPriceChange(change);
                 setPriceChangePercent((change / latestHistoryPrice) * 100);
             } else {
                 setPriceChange(0);
                 setPriceChangePercent(0);
             }
        }
      }
    } catch (error) {
      console.error("Failed to load medicine data:", error);
    } finally {
      setLoading(false);
    }
  };

  const CandlestickChart = ({ data }: { data: any[] }) => {
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);

    if (!Array.isArray(data) || data.length === 0) return (
        <div className="h-64 flex items-center justify-center text-gray-400">
            No price history available to chart.
        </div>
    );

    const width = 800;
    const height = 400;
    const padding = 40;
    
    // Extract all relevant price points to find the absolute min and max for scaling
    const prices = data.flatMap(d => [
      parseFloat(d.minPrice),
      parseFloat(d.maxPrice),
      parseFloat(d.openPrice || d.avgPrice),
      parseFloat(d.closePrice || d.avgPrice)
    ]).filter(p => !isNaN(p)); // Filter out any NaNs

    if (prices.length === 0) return null;

    let minPrice = Math.min(...prices);
    let maxPrice = Math.max(...prices);
    
    // Add some padding to the range so candles aren't stuck to the edges
    let priceRange = maxPrice - minPrice;
    if (priceRange === 0) {
        // Handle flat line case
        priceRange = maxPrice * 0.1; // 10% buffer
        minPrice = maxPrice - priceRange / 2;
        maxPrice = maxPrice + priceRange / 2;
    } else {
        // Add 5% padding top and bottom
        const buffer = priceRange * 0.05;
        minPrice -= buffer;
        maxPrice += buffer;
        priceRange = maxPrice - minPrice;
    }
    
    const candleWidth = (width - 2 * padding) / data.length;

    const handleMouseMove = (event: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const xPos = event.clientX - rect.left;
      const usableWidth = rect.width - 2 * padding;
      const relative = Math.max(0, Math.min(1, (xPos - padding) / usableWidth));
      const index = Math.round(relative * (data.length - 1));
      setHoverIndex(index);
    };

    const handleMouseLeave = () => setHoverIndex(null);

    const normalize = (val: number) => padding + (1 - (val - minPrice) / priceRange) * (height - 2 * padding);

    const hoverData = hoverIndex !== null ? data[hoverIndex] : null;
    const hoverX = hoverIndex !== null ? padding + hoverIndex * candleWidth + candleWidth / 2 : null;
    const hoverClose = hoverData ? parseFloat(hoverData.closePrice || hoverData.avgPrice) : null;
    const hoverY = hoverClose !== null && !isNaN(hoverClose) ? normalize(hoverClose) : null;

    return (
      <div className="relative w-full h-full aspect-[2/1]">
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${width} ${height}`}
          className="bg-white dark:bg-gray-900"
          preserveAspectRatio="none"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
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
          
          {/* Continuous Graph Line */}
          <path
            d={data.map((d, i) => {
              const close = parseFloat(d.closePrice || d.avgPrice);
              const x = padding + i * candleWidth + candleWidth / 2;
              const y = normalize(close);
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
            }).join(' ')}
            fill="none"
            stroke="#10b981" 
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-md"
          />

          {/* Area under the line (Gradient) */}
          <defs>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={`${data.map((d, i) => {
              const close = parseFloat(d.closePrice || d.avgPrice);
              const x = padding + i * candleWidth + candleWidth / 2;
              const y = normalize(close);
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
            }).join(' ')} L ${padding + (data.length - 1) * candleWidth + candleWidth / 2} ${height - padding} L ${padding + candleWidth / 2} ${height - padding} Z`}
            fill="url(#lineGradient)"
            stroke="none"
          />

          {hoverData && hoverIndex !== null && hoverX !== null && hoverY !== null && (
            <g>
              {/* Hover vertical line */}
              <line
                x1={hoverX}
                y1={padding}
                x2={hoverX}
                y2={height - padding}
                stroke="#3b82f6"
                strokeWidth="1"
                strokeDasharray="4 2"
              />
              {/* Hover point */}
              <circle cx={hoverX} cy={hoverY} r={4} fill="#3b82f6" stroke="white" strokeWidth="2" />
              {/* Tooltip */}
              <rect
                x={Math.min(hoverX + 10, width - 140)}
                y={padding + 10}
                width={130}
                height={46}
                rx={6}
                fill="white"
                stroke="#e5e7eb"
                className="dark:fill-gray-800 dark:stroke-gray-700"
              />
              <text x={Math.min(hoverX + 16, width - 134)} y={padding + 28} fontSize="11" fill="#111827" className="dark:fill-white">
                {(() => {
                  const dateVal = hoverData.day || hoverData.date;
                  if (!dateVal) return 'N/A';
                  const d = new Date(dateVal);
                  return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('en-IN');
                })()}
              </text>
              <text x={Math.min(hoverX + 16, width - 134)} y={padding + 44} fontSize="11" fill="#3b82f6" fontWeight="600">
                ₹{(hoverData.avgPrice ? parseFloat(hoverData.avgPrice) : hoverClose)?.toFixed(2)}
              </text>
            </g>
          )}
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
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="flex justify-between items-center h-16 gap-2">
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <button 
                onClick={() => router.back()} 
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <Logo size="sm" href="/" isLoggedIn={!!user} />
            </div>
            <div className="hidden md:flex flex-1 max-w-md mx-4">
              <SearchBar variant="navbar" isLoggedIn={!!user} />
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
              {user && <NotificationBell />}
              <ThemeToggle />
              {user && <ProfileDropdown user={user} />}
            </div>
          </div>
          <div className="md:hidden pb-3 pt-1">
            <SearchBar variant="navbar" isLoggedIn={!!user} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Chart Tools - REMOVED */}
          <div className="hidden lg:block">
            {/* Tools removed as requested */}
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-800 mb-4">
              <div className="flex flex-col md:flex-row items-start gap-6 mb-4">
                <div className="w-32 h-32 md:w-40 md:h-40 bg-gray-50 dark:bg-gray-700/50 rounded-2xl flex items-center justify-center border border-gray-100 dark:border-gray-700 overflow-hidden flex-shrink-0">
                  {medicine?.imageUrl ? (
                    <img src={medicine.imageUrl} alt={medicine.name} className="w-full h-full object-cover" />
                  ) : (
                    <Pill className="w-16 h-16 text-gray-300 dark:text-gray-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{medicine?.name || "Medicine Name"}</h1>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <span>{medicine?.form || "N/A"}</span>
                        <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></span>
                        <span>{medicine?.strength || "N/A"}</span>
                        {selectedListing?.expiryDate && (
                          <>
                            <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></span>
                            <span className="text-orange-600 dark:text-orange-400 font-medium">
                              Exp: {new Date(selectedListing.expiryDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={handleToggleWatchlist} disabled={watchlistLoading} className={`p-2 transition-colors ${isInWatchlist ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"} ${watchlistLoading ? "opacity-50" : ""}`}>
                        <Bookmark className={`w-5 h-5 ${isInWatchlist ? "fill-current" : ""}`} />
                      </button>
                      <button onClick={handleShare} className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        <Share2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-3 mt-4">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">₹{currentPrice.toFixed(2)}<sup className="text-sm ml-1">*</sup></span>
                    <span className={`text-lg font-semibold ${priceChange > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                      {priceChange > 0 ? "▲" : "▼"} {priceChange >= 0 ? "+" : ""}₹{priceChange.toFixed(2)} ({priceChangePercent > 0 ? "+" : ""}{priceChangePercent.toFixed(2)}%)
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">PSE | <span className="text-xs">*Price excluding GST</span></p>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-4">
                {(["1d", "5d", "1m", "3m", "1y", "5y"] as const).map((tf) => (
                  <button key={tf} onClick={() => setTimeframe(tf)} className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${timeframe === tf ? "bg-blue-600 text-white" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"}`}>{tf}</button>
                ))}
              </div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <CandlestickChart data={priceHistory} />
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-800 sticky top-24">
              <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                <button onClick={() => setActiveTab("buy")} className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === "buy" ? "border-green-600 text-green-600 dark:text-green-400" : "border-transparent text-gray-600 dark:text-gray-400"}`}>BUY</button>
                <button onClick={() => setActiveTab("sell")} className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === "sell" ? "border-red-600 text-red-600 dark:text-red-400" : "border-transparent text-gray-600 dark:text-gray-400"}`}>SELL</button>
              </div>
              {activeTab === "buy" ? (
                <div className="mb-4">
                  {user ? (
                    <button onClick={() => setShowBuyProposalModal(true)} className="w-full py-3 px-4 bg-[var(--brand-blue)] hover:bg-[var(--brand-blue-hi)] text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2">
                      <ShoppingCart className="w-5 h-5" /> BUY
                    </button>
                  ) : (
                    <button onClick={() => router.push('/auth/login')} className="w-full py-3 px-4 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2">
                      <ShoppingCart className="w-5 h-5" /> Login to Buy
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {user ? (
                    <>
                      {userHolding ? (
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700 mb-4">
                          <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">✓ You own this medicine</h4>
                          <p className="text-sm text-green-700 dark:text-green-300">Available: <span className="font-bold">{userHolding.totalQty} units</span></p>
                          <button onClick={() => router.push(`/dashboard/seller/listings/new?medicineId=${medicineId}`)} className="w-full mt-3 py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors">Sell</button>
                        </div>
                      ) : holdingsLoaded && (
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
                          <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">You don't own this medicine</h4>
                          <button onClick={() => router.push(`/dashboard/seller/listings/new?medicineId=${medicineId}`)} className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors">Sell with Proof</button>
                        </div>
                      )}
                    </>
                  ) : (
                    <button onClick={() => router.push('/auth/login')} className="w-full py-3 px-4 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all">
                      Login to Sell
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {relatedMedicines.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Related Medicines</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedMedicines.map((listing: any) => (
                <Link key={listing.id} href={`/medicines/${listing.medicineId}`} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all flex gap-4">
                  <div className="w-20 h-20 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex items-center justify-center border border-gray-100 dark:border-gray-700 overflow-hidden flex-shrink-0">
                    {listing.medicine?.imageUrl ? <img src={listing.medicine.imageUrl} alt={listing.medicine.name} className="w-full h-full object-cover" /> : <Pill className="text-gray-300 dark:text-gray-600" size={24} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1 truncate">{listing.medicine?.name}</h3>
                    {listing.expiryDate && (
                      <p className="text-xs text-orange-600 dark:text-orange-400">
                        Exp: {new Date(listing.expiryDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                      </p>
                    )}
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-xl font-bold text-blue-600 dark:text-blue-400">₹{listing.listPrice || listing.basePrice}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      {selectedListing && (
        <BuyProposalModal
          isOpen={showBuyProposalModal}
          onClose={() => setShowBuyProposalModal(false)}
          listingId={selectedListing.id}
          medicineName={medicine?.name || "Medicine"}
          listPrice={Number(selectedListing.listPrice || selectedListing.basePrice || 0)}
          medicineImage={medicine?.imageUrl}
          gstPercentage={Number(selectedListing.gstPercentage || 0)}
        />
      )}
    </div>
  );
}
