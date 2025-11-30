"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  Bell, ChevronDown, Heart, Share2, BarChart3, Activity, ShoppingCart, ArrowLeft
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import Logo from "@/components/Logo";
import SearchBar from "@/components/SearchBar";
import BuyProposalModal from "@/components/BuyProposalModal";
import ProfileDropdown from "@/components/ProfileDropdown";
import { pricesApi, listingsApi, ordersApi, holdsApi } from "@/lib/api";

export default function MedicineDetailPage() {
  const router = useRouter();
  const params = useParams();
  const medicineId = params.id as string;
  
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [medicine, setMedicine] = useState<any>(null);
  const [availableListings, setAvailableListings] = useState<any[]>([]);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [priceChangePercent, setPriceChangePercent] = useState<number>(0);
  
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  const [timeframe, setTimeframe] = useState<"1d" | "5d" | "1m" | "3m" | "1y" | "5y">("1m");
  
  const [showBuyProposalModal, setShowBuyProposalModal] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
    loadMedicineData();
  }, [medicineId, timeframe]);

  const loadMedicineData = async () => {
    try {
      setLoading(true);
      
      // Load available listings for this medicine
      const listingsRes = await listingsApi.getListings({ medicineId });
      const listings = (listingsRes.data || []).filter((l: any) => l.status === 'ACTIVE');
      setAvailableListings(listings);
      
      // Get medicine details from first listing
      if (listings.length > 0) {
        setMedicine(listings[0].medicine);
        
        // Select the cheapest listing by default
        const cheapest = listings.sort((a: any, b: any) => 
          parseFloat(a.listPrice || a.basePrice) - parseFloat(b.listPrice || b.basePrice)
        )[0];
        setSelectedListing(cheapest);
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
      
      // If no price history, create flat line with base price
      if (history.length === 0) {
        const basePrice = 100; // Default base price
        const mockHistory = Array.from({ length: 30 }, (_, i) => ({
          day: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          minPrice: basePrice,
          maxPrice: basePrice,
          avgPrice: basePrice,
          openPrice: basePrice,
          closePrice: basePrice,
        }));
        setPriceHistory(mockHistory);
        setCurrentPrice(basePrice);
        setPriceChange(0);
        setPriceChangePercent(0);
      } else {
        setPriceHistory(history);
        const latest = history[history.length - 1];
        const previous = history[history.length - 2] || latest;
        
        setCurrentPrice(parseFloat(latest.avgPrice));
        const change = parseFloat(latest.avgPrice) - parseFloat(previous.avgPrice);
        setPriceChange(change);
        setPriceChangePercent((change / parseFloat(previous.avgPrice)) * 100);
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
            
            const isGreen = close >= open;
            const color = isGreen ? "#10b981" : "#ef4444";
            
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
            const isGreen = close >= open;
            const color = isGreen ? "#10b981" : "#ef4444";
            
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
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/medicines" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <Logo size="md" href="/" isLoggedIn={!!user} />
            </div>

            <div className="flex-1 max-w-md mx-8">
              <SearchBar variant="navbar" isLoggedIn={!!user} />
            </div>

            <div className="flex items-center gap-3">
              <button className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                <Bell className="w-5 h-5" />
              </button>
              <ThemeToggle />
              {user && <ProfileDropdown user={user} />}
            </div>
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
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {medicine?.name || "Medicine Name"}
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    NSE ₹{currentPrice.toFixed(2)} 
                    <span className={`ml-2 ${priceChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {priceChange >= 0 ? "+" : ""}₹{priceChange.toFixed(2)} ({priceChangePercent >= 0 ? "+" : ""}{priceChangePercent.toFixed(2)}%)
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400">
                    <Heart className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
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
                      Submit Buy Proposal
                    </button>
                    <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
                      Already bought? Upload receipt for admin approval
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* SELL Tab Content */}
                  <div className="mb-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Want to sell this medicine?</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {user?.roleCode === "SELLER" 
                        ? "Create a new listing to offer this medicine for sale on the platform."
                        : "Sell from your existing holdings or create a new listing."}
                    </p>
                    <button
                      onClick={() => router.push('/dashboard/seller/listings/new')}
                      className="w-full py-2 px-4 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
                    >
                      Create New Listing
                    </button>
                  </div>

                  {user?.roleCode === "TRADER" && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Or sell from your portfolio:
                      </p>
                      <button
                        onClick={() => router.push('/portfolio')}
                        className="w-full py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
                      >
                        View My Holdings
                      </button>
                    </div>
                  )}
                </>
              )}


            </div>
          </div>
        </div>
      </main>

      {/* Buy Proposal Modal */}
      {selectedListing && (
        <BuyProposalModal
          isOpen={showBuyProposalModal}
          onClose={() => setShowBuyProposalModal(false)}
          listingId={selectedListing.id}
          medicineName={medicine?.name || "Medicine"}
        />
      )}
    </div>
  );
}
