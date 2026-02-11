"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, Plus, Package, ShoppingCart,
  Eye, ChevronDown, ChevronRight, Pill,
  Activity, BarChart3, Wallet, FileText, MessageCircle, Truck
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import Logo from "@/components/Logo";
import SearchBar from "@/components/SearchBar";
import ProfileDropdown from "@/components/ProfileDropdown";
import NotificationBell from "@/components/NotificationBell";
import ProfileCompletionBanner from "@/components/ProfileCompletionBanner";
import { listingsApi, dashboardApiNew, watchlistApi, pricesApi, inventoryApi } from "@/lib/api";

export default function SellerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>({
    portfolio: { totalValue: 0, totalReturns: 0, returnsPercentage: 0 },
    topMedicines: [],
    mostBought: [],
    recentListings: [],
  });
  const [watchlists, setWatchlists] = useState<any[]>([]);
  const [expandedWatchlist, setExpandedWatchlist] = useState<string | null>(null);

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
    loadDashboardData();
  }, [router]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load dashboard data
      const [dashboardRes, watchlistRes, listingsRes, inventoryRes] = await Promise.all([
        dashboardApiNew.getSellerDashboard().catch(() => ({ data: {} })),
        watchlistApi.getWatchlist().catch(() => ({ data: [] })),
        listingsApi.getMyListings().catch(() => ({ data: [] })),
        inventoryApi.getUserInventory().catch(() => ({ data: [] })),
      ]);

      // Calculate portfolio value from listings
      const listings = listingsRes.data || [];
      const totalValue = listings.reduce((sum: number, l: any) => 
        sum + (parseFloat(l.basePrice || 0) * parseInt(l.stock || 0)), 0
      );

      // Get top trending medicines from price movements with activity fallback
      let topMedicines: any[] = [];
      try {
        const [priceTrendingRes, activityTrendingRes] = await Promise.all([
          pricesApi.getTrending(30).catch(() => ({ data: { trending: [] } })),
          dashboardApiNew.getTrendingMedicines(4).catch(() => ({ data: [] })),
        ]);

        const priceTrendingRaw = priceTrendingRes.data?.trending || [];
        const priceChangeMap = new Map(
          priceTrendingRaw.map((item: any) => [item.medicine?.id, {
            change: Number(item.change ?? 0),
            changePercent: Number(item.changePercent ?? 0),
            latestPrice: Number(item.newPrice ?? item.medicine?.currentPrice ?? 0),
          }])
        );

        const priceTrending = priceTrendingRaw.slice(0, 4).map((item: any) => ({
          id: item.medicine?.id,
          medicineId: item.medicine?.id,
          name: item.medicine?.name || "Medicine",
          price: Number(item.newPrice ?? item.medicine?.currentPrice ?? 0),
          change: Number(item.change ?? 0),
          changePercent: Number(item.changePercent ?? 0),
        }));

        if (priceTrending.length > 0) {
          topMedicines = priceTrending;
        } else {
          topMedicines = (activityTrendingRes.data || []).map((med: any) => ({
            id: med.medicineId || med.id,
            medicineId: med.medicineId || med.id,
            name: med.name,
            price: parseFloat(med.currentPrice || 0),
            change: 0,
            changePercent: 0,
          }));
        }

        // Get platform-wide most bought medicines (fallback to trending if no purchases yet)
        let mostBought: any[] = [];
        try {
          const mostBoughtRes = await dashboardApiNew.getPlatformMostBought(4).catch(() => ({ data: [] }));
          const mostBoughtData = mostBoughtRes.data || [];
          
          // If no purchases yet, use trending medicines as fallback
          if (mostBoughtData.length === 0 && topMedicines.length > 0) {
            mostBought = topMedicines.map((med: any) => ({
              id: med.id,
              medicineId: med.medicineId || med.id,
              name: med.name || "Medicine",
              form: "",
              price: parseFloat(med.price || 0),
              change: med.change,
              changePercent: med.changePercent,
              image: `https://via.placeholder.com/80x80/3B82F6/FFFFFF?text=${med.name?.charAt(0) || 'M'}`,
            }));
          } else {
            mostBought = mostBoughtData.map((med: any) => {
              const fromTrend: any = priceChangeMap.get(med.id) || priceChangeMap.get(med.medicineId);
              return {
                id: med.id,
                medicineId: med.id,
                name: med.name || "Medicine",
                form: med.form || "",
                price: parseFloat(med.currentPrice || med.price || fromTrend?.latestPrice || 0),
                change: fromTrend?.change ?? 0,
                changePercent: fromTrend?.changePercent ?? 0,
                image: `https://via.placeholder.com/80x80/3B82F6/FFFFFF?text=${med.name?.charAt(0) || 'M'}`,
              };
            });
          }
        } catch (error) {
          console.error("Failed to load most bought:", error);
          // Fallback to trending medicines if API fails
          mostBought = topMedicines.slice(0, 4).map((med: any) => ({
            id: med.id,
            medicineId: med.medicineId || med.id,
            name: med.name || "Medicine",
            form: "",
            price: parseFloat(med.price || 0),
            change: med.change,
            changePercent: med.changePercent,
            image: `https://via.placeholder.com/80x80/3B82F6/FFFFFF?text=${med.name?.charAt(0) || 'M'}`,
          }));
        }

        dashboardData.mostBought = mostBought;

      } catch (error) {
        console.error("Failed to load trending medicines:", error);
        topMedicines = [];
      }

      // Group watchlists
      const groupedWatchlists = watchlistRes.data.reduce((acc: any, item: any) => {
        const listName = item.name || 'My Watchlist 1';
        if (!acc[listName]) {
          acc[listName] = [];
        }
        acc[listName].push(item);
        return {};
      }, {});

      // Calculate real returns based on price changes
      let totalReturns = 0;
      let totalInvestment = 0;
      
      for (const listing of listings) {
        try {
          const basePrice = parseFloat(listing.basePrice || 0);
          const currentPrice = parseFloat(listing.listPrice || listing.basePrice || 0);
          const stock = parseInt(listing.stock || 0);
          
          const invested = basePrice * stock;
          const currentValue = currentPrice * stock;
          const returns = currentValue - invested;
          
          totalInvestment += invested;
          totalReturns += returns;
        } catch (error) {
          // Skip if calculation fails
        }
      }
      
      const returnsPercentage = totalInvestment > 0 ? (totalReturns / totalInvestment) * 100 : 0;

      setDashboardData({
        portfolio: {
          totalValue,
          totalReturns,
          returnsPercentage,
        },
        topMedicines,
        mostBought: dashboardData.mostBought || [],
        recentListings: listings.slice(0, 5),
      });

      setWatchlists(watchlistRes.data || []);
    } catch (error) {
      console.error("Failed to load dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendVisuals = (change: number) => {
    if (change > 0) return { arrow: '▲', color: 'text-red-600 dark:text-red-400', sign: '+' };
    if (change < 0) return { arrow: '▼', color: 'text-green-600 dark:text-green-400', sign: '' };
    return { arrow: '―', color: 'text-gray-500 dark:text-gray-400', sign: '' };
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    router.push("/auth/login");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 dark:from-gray-950 dark:via-blue-950/20 dark:to-indigo-950/20">
      {/* Header - Modern Style */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="flex justify-between items-center h-16 gap-2">
            {/* Logo & Nav */}
            <div className="flex items-center gap-3 sm:gap-8 flex-shrink-0">
              <Logo size="sm" href="/" isLoggedIn={true} />

              <nav className="hidden lg:flex items-center gap-1">
                <Link href="/medicines" className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Explore
                </Link>
                <Link href="/dashboard/seller" className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400">
                  Dashboard
                </Link>
              </nav>
            </div>

            {/* Search - Hidden on mobile, shown in separate row */}
            <div className="hidden md:flex flex-1 max-w-md mx-4">
              <SearchBar variant="navbar" isLoggedIn={true} />
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
              <NotificationBell />

              <ThemeToggle />

              <ProfileDropdown user={user} />
            </div>
          </div>

          {/* Mobile Search Bar - Full width on small screens */}
          <div className="md:hidden pb-3 pt-1">
            <SearchBar variant="navbar" isLoggedIn={true} />
          </div>
        </div>
      </header>

      {/* Main Content - Groww Style Layout */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        <ProfileCompletionBanner user={user} />
        
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Top Trending Medicines - Enhanced Style */}
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-xl">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-xl">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Top Trending</h2>
                  </div>
                  <Link href="/medicines" className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                    View all →
                  </Link>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {dashboardData.topMedicines.map((med: any, idx: number) => (
                    <Link 
                      key={idx} 
                      href={`/medicines/${med.id || med.medicineId}`}
                      className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow-md transition-all"
                    >
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-1 truncate">{med.name}</div>
                      <div className="text-base font-semibold text-gray-900 dark:text-white mb-0.5">₹{med.price.toFixed(2)}</div>
                      {(() => {
                        const { arrow, color, sign } = getTrendVisuals(med.change);
                        return (
                          <div className={`text-[10px] font-medium flex items-center gap-0.5 ${color}`}>
                            {arrow}
                            {`${sign}${med.changePercent.toFixed(1)}%`}
                          </div>
                        );
                      })()}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Most Bought Medicines - Enhanced Style */}
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-xl">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                    <ShoppingCart className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Most Bought on 24Rx</h2>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {dashboardData.mostBought.map((med: any) => (
                    <Link 
                      key={med.id}
                      href={`/medicines/${med.medicineId}`}
                      className="group p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <div className="w-10 h-10 flex-shrink-0 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg flex items-center justify-center">
                          <Pill className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-900 dark:text-white mb-0.5 truncate leading-tight">
                            {med.name}
                          </div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                            {med.form}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          ₹{med.price.toFixed(2)}
                        </div>
                        {(() => {
                          const pct = Number(med.changePercent || 0);
                          const { arrow, color, sign } = getTrendVisuals(pct);
                          return (
                            <div className={`text-[10px] font-medium flex items-center gap-0.5 ${color}`}>
                              {arrow}
                              {`${sign}${pct.toFixed(1)}%`}
                            </div>
                          );
                        })()}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Products & Tools */}
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-8 border border-gray-200/50 dark:border-gray-700/50 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Quick Actions</h2>
                </div>

                <div className="grid grid-cols-3 md:grid-cols-6 gap-5">
                  <Link href="/dashboard/seller/listings/new" className="group relative flex flex-col items-center gap-3 p-4 bg-gradient-to-br from-green-500/10 to-green-600/10 dark:from-green-500/20 dark:to-green-600/20 hover:from-green-500/20 hover:to-green-600/20 dark:hover:from-green-500/30 dark:hover:to-green-600/30 rounded-2xl border-2 border-green-200/50 dark:border-green-700/50 hover:border-green-400 dark:hover:border-green-500 transition-all hover:scale-105 hover:shadow-lg">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
                    <div className="relative w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Plus className="w-7 h-7 text-white" />
                    </div>
                    <span className="relative text-xs font-bold text-center text-gray-900 dark:text-gray-100">Sell</span>
                  </Link>

                  <Link href="/dashboard/seller/listings" className="group relative flex flex-col items-center gap-3 p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/10 dark:from-blue-500/20 dark:to-blue-600/20 hover:from-blue-500/20 hover:to-blue-600/20 dark:hover:from-blue-500/30 dark:hover:to-blue-600/30 rounded-2xl border-2 border-blue-200/50 dark:border-blue-700/50 hover:border-blue-400 dark:hover:border-blue-500 transition-all hover:scale-105 hover:shadow-lg">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
                    <div className="relative w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Package className="w-7 h-7 text-white" />
                    </div>
                    <span className="relative text-xs font-bold text-center text-gray-900 dark:text-gray-100">My Listings</span>
                  </Link>

                  <Link href="/dashboard/seller/deliveries" className="group relative flex flex-col items-center gap-3 p-4 bg-gradient-to-br from-indigo-500/10 to-indigo-600/10 dark:from-indigo-500/20 dark:to-indigo-600/20 hover:from-indigo-500/20 hover:to-indigo-600/20 dark:hover:from-indigo-500/30 dark:hover:to-indigo-600/30 rounded-2xl border-2 border-indigo-200/50 dark:border-indigo-700/50 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all hover:scale-105 hover:shadow-lg">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
                    <div className="relative w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Truck className="w-7 h-7 text-white" />
                    </div>
                    <span className="relative text-xs font-bold text-center text-gray-900 dark:text-gray-100">Deliveries</span>
                  </Link>

                  <Link href="/dashboard/my-proposals" className="group relative flex flex-col items-center gap-3 p-4 bg-gradient-to-br from-rose-500/10 to-rose-600/10 dark:from-rose-500/20 dark:to-rose-600/20 hover:from-rose-500/20 hover:to-rose-600/20 dark:hover:from-rose-500/30 dark:hover:to-rose-600/30 rounded-2xl border-2 border-rose-200/50 dark:border-rose-700/50 hover:border-rose-400 dark:hover:border-rose-500 transition-all hover:scale-105 hover:shadow-lg">
                    <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
                    <div className="relative w-14 h-14 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg">
                      <ShoppingCart className="w-7 h-7 text-white" />
                    </div>
                    <span className="relative text-xs font-bold text-center text-gray-900 dark:text-gray-100">Buy Proposals</span>
                  </Link>

                  <Link href="/portfolio" className="group relative flex flex-col items-center gap-3 p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/10 dark:from-purple-500/20 dark:to-purple-600/20 hover:from-purple-500/20 hover:to-purple-600/20 dark:hover:from-purple-500/30 dark:hover:to-purple-600/30 rounded-2xl border-2 border-purple-200/50 dark:border-purple-700/50 hover:border-purple-400 dark:hover:border-purple-500 transition-all hover:scale-105 hover:shadow-lg">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
                    <div className="relative w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Wallet className="w-7 h-7 text-white" />
                    </div>
                    <span className="relative text-xs font-bold text-center text-gray-900 dark:text-gray-100">Portfolio</span>
                  </Link>

                  <Link href="/watchlist" className="group relative flex flex-col items-center gap-3 p-4 bg-gradient-to-br from-orange-500/10 to-orange-600/10 dark:from-orange-500/20 dark:to-orange-600/20 hover:from-orange-500/20 hover:to-orange-600/20 dark:hover:from-orange-500/30 dark:hover:to-orange-600/30 rounded-2xl border-2 border-orange-200/50 dark:border-orange-700/50 hover:border-orange-400 dark:hover:border-orange-500 transition-all hover:scale-105 hover:shadow-lg">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
                    <div className="relative w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Eye className="w-7 h-7 text-white" />
                    </div>
                    <span className="relative text-xs font-bold text-center text-gray-900 dark:text-gray-100">Watchlist</span>
                  </Link>

                  <Link href="/news" className="group relative flex flex-col items-center gap-3 p-4 bg-gradient-to-br from-pink-500/10 to-pink-600/10 dark:from-pink-500/20 dark:to-pink-600/20 hover:from-pink-500/20 hover:to-pink-600/20 dark:hover:from-pink-500/30 dark:hover:to-pink-600/30 rounded-2xl border-2 border-pink-200/50 dark:border-pink-700/50 hover:border-pink-400 dark:hover:border-pink-500 transition-all hover:scale-105 hover:shadow-lg">
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
                    <div className="relative w-14 h-14 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                      <FileText className="w-7 h-7 text-white" />
                    </div>
                    <span className="relative text-xs font-bold text-center text-gray-900 dark:text-gray-100">News</span>
                  </Link>

                  <Link href="/medicines" className="group relative flex flex-col items-center gap-3 p-4 bg-gradient-to-br from-teal-500/10 to-teal-600/10 dark:from-teal-500/20 dark:to-teal-600/20 hover:from-teal-500/20 hover:to-teal-600/20 dark:hover:from-teal-500/30 dark:hover:to-teal-600/30 rounded-2xl border-2 border-teal-200/50 dark:border-teal-700/50 hover:border-teal-400 dark:hover:border-teal-500 transition-all hover:scale-105 hover:shadow-lg">
                    <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
                    <div className="relative w-14 h-14 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Activity className="w-7 h-7 text-white" />
                    </div>
                    <span className="relative text-xs font-bold text-center text-gray-900 dark:text-gray-100">Explore</span>
                  </Link>

                  <Link href="/support" className="group relative flex flex-col items-center gap-3 p-4 bg-gradient-to-br from-amber-500/10 to-amber-600/10 dark:from-amber-500/20 dark:to-amber-600/20 hover:from-amber-500/20 hover:to-amber-600/20 dark:hover:from-amber-500/30 dark:hover:to-amber-600/30 rounded-2xl border-2 border-amber-200/50 dark:border-amber-700/50 hover:border-amber-400 dark:hover:border-amber-500 transition-all hover:scale-105 hover:shadow-lg">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
                    <div className="relative w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                      <MessageCircle className="w-7 h-7 text-white" />
                    </div>
                    <span className="relative text-xs font-bold text-center text-gray-900 dark:text-gray-100">Support</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Your Investments */}
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-xl">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-xl">
                      <Wallet className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Your Investments</h2>
                  </div>
                  <Link href="/portfolio" className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                    View →
                  </Link>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current Value</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      ₹{dashboardData.portfolio.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Returns</div>
                    <div className={`text-xl font-semibold ${
                      dashboardData.portfolio.totalReturns >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {dashboardData.portfolio.totalReturns >= 0 ? '+' : ''}₹{dashboardData.portfolio.totalReturns.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      <span className="text-sm ml-2">
                        ({dashboardData.portfolio.returnsPercentage >= 0 ? '+' : ''}{dashboardData.portfolio.returnsPercentage.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Holdings Summary */}
              <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 backdrop-blur-sm rounded-2xl p-6 border-2 border-blue-200/50 dark:border-blue-700/50 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">My Holdings</h2>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  View your complete medicine inventory and portfolio details.
                </p>
                
                <Link
                  href="/portfolio"
                  className="group relative block w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-semibold rounded-xl transition-all text-center shadow-lg hover:shadow-xl transform hover:scale-[1.02] overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <span className="relative">View My Holdings →</span>
                </Link>
              </div>

              {/* All Watchlists */}
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-xl">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl">
                      <Eye className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">All Watchlists</h2>
                  </div>
                  <Link href="/watchlist" className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                    View all →
                  </Link>
                </div>

                <div className="space-y-2">
                  {watchlists.length === 0 ? (
                    <div className="text-center py-6">
                      <Eye className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">No watchlists yet</p>
                      <Link href="/watchlist" className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block">
                        Create watchlist
                      </Link>
                    </div>
                  ) : (
                    <>
                      {['My Watchlist 1', 'Antibiotics', 'Pain Relief', 'Vitamins'].map((name, idx) => (
                        <div key={idx} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                          <button
                            onClick={() => setExpandedWatchlist(expandedWatchlist === name ? null : name)}
                            className="w-full flex items-center justify-between py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg px-2 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{name}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">{Math.floor(Math.random() * 10) + 1} items</span>
                            </div>
                            <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${
                              expandedWatchlist === name ? 'rotate-90' : ''
                            }`} />
                          </button>
                        </div>
                      ))}
                      
                      <Link 
                        href="/watchlist"
                        className="flex items-center gap-2 py-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <Plus className="w-4 h-4" />
                        Create new watchlist
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
