"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, Plus, Package, ShoppingCart,
  Eye, Bell, ChevronDown, ChevronRight, Pill,
  Activity, BarChart3, Wallet, FileText
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import Logo from "@/components/Logo";
import SearchBar from "@/components/SearchBar";
import ProfileDropdown from "@/components/ProfileDropdown";
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

      // Get top trending medicines from API
      let topMedicines = [];
      try {
        const trendingRes = await dashboardApiNew.getTrendingMedicines(4).catch(() => ({ data: [] }));
        topMedicines = await Promise.all(
          (trendingRes.data || []).map(async (med: any) => {
            try {
              // Get price history to calculate change
              const priceRes = await pricesApi.getPriceHistory(med.id, 7).catch(() => ({ data: [] }));
              const history = priceRes.data || [];
              
              if (history.length >= 2) {
                const latest = history[history.length - 1];
                const previous = history[history.length - 2];
                const currentPrice = parseFloat(latest.avgPrice);
                const previousPrice = parseFloat(previous.avgPrice);
                const change = currentPrice - previousPrice;
                const changePercent = (change / previousPrice) * 100;
                
                return {
                  id: med.id,
                  name: med.name,
                  price: currentPrice,
                  change: change,
                  changePercent: changePercent,
                };
              } else {
                // No price history, use base price from listings
                const listingRes = await listingsApi.getListings({ medicineId: med.id }).catch(() => ({ data: [] }));
                const listings = listingRes.data || [];
                const avgPrice = listings.length > 0 
                  ? listings.reduce((sum: number, l: any) => sum + parseFloat(l.listPrice || l.basePrice || 0), 0) / listings.length
                  : 0;
                
                return {
                  id: med.id,
                  name: med.name,
                  price: avgPrice,
                  change: 0,
                  changePercent: 0,
                };
              }
            } catch (error) {
              return {
                id: med.id,
                name: med.name,
                price: 0,
                change: 0,
                changePercent: 0,
              };
            }
          })
        );
      } catch (error) {
        console.error("Failed to load trending medicines:", error);
        topMedicines = [];
      }

      // Get most bought medicines with real price changes
      const mostBought = await Promise.all(
        listings.slice(0, 4).map(async (l: any) => {
          try {
            // Get price history for this medicine
            const priceRes = await pricesApi.getPriceHistory(l.medicineId, 7).catch(() => ({ data: [] }));
            const history = priceRes.data || [];
            
            let change = 0;
            let changePercent = 0;
            
            if (history.length >= 2) {
              const latest = history[history.length - 1];
              const previous = history[history.length - 2];
              const currentPrice = parseFloat(latest.avgPrice);
              const previousPrice = parseFloat(previous.avgPrice);
              change = currentPrice - previousPrice;
              changePercent = (change / previousPrice) * 100;
            }
            
            return {
              id: l.id,
              medicineId: l.medicineId,
              name: l.medicine?.name || "Medicine",
              form: l.medicine?.form || "",
              price: parseFloat(l.listPrice || l.basePrice || 0),
              change: change,
              changePercent: changePercent.toFixed(2),
              image: `https://via.placeholder.com/80x80/3B82F6/FFFFFF?text=${l.medicine?.name?.charAt(0) || 'M'}`,
            };
          } catch (error) {
            return {
              id: l.id,
              medicineId: l.medicineId,
              name: l.medicine?.name || "Medicine",
              form: l.medicine?.form || "",
              price: parseFloat(l.listPrice || l.basePrice || 0),
              change: 0,
              changePercent: "0.00",
              image: `https://via.placeholder.com/80x80/3B82F6/FFFFFF?text=${l.medicine?.name?.charAt(0) || 'M'}`,
            };
          }
        })
      );

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
        mostBought,
        recentListings: listings.slice(0, 5),
      });

      setWatchlists(watchlistRes.data || []);
    } catch (error) {
      console.error("Failed to load dashboard:", error);
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header - Groww Style */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
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
              <button className="p-1.5 sm:p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 relative">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

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
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Top Trending Medicines - Compact Groww Style */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">Top Trending</h2>
                  <Link href="/medicines" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                    View all
                  </Link>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {dashboardData.topMedicines.map((med: any, idx: number) => (
                    <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-1 truncate">{med.name}</div>
                      <div className="text-base font-semibold text-gray-900 dark:text-white mb-0.5">₹{med.price.toFixed(2)}</div>
                      <div className={`text-[10px] font-medium flex items-center gap-0.5 ${
                        med.change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {med.change >= 0 ? '▲' : '▼'}
                        {Math.abs(med.changePercent).toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Most Bought Medicines - Compact Groww Style */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-800">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Most Bought on 24Rx</h2>
                
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
                        <div className={`text-[10px] font-medium flex items-center gap-0.5 ${
                          parseFloat(med.changePercent) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {parseFloat(med.changePercent) >= 0 ? '▲' : '▼'}
                          {Math.abs(parseFloat(med.changePercent)).toFixed(1)}%
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Products & Tools */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Products & tools</h2>
                
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                  <Link href="/dashboard/seller/listings/new" className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 rounded-lg flex items-center justify-center">
                      <Plus className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-xs text-center text-gray-700 dark:text-gray-300">New Listing</span>
                  </Link>

                  <Link href="/dashboard/seller/listings" className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg flex items-center justify-center">
                      <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-xs text-center text-gray-700 dark:text-gray-300">My Listings</span>
                  </Link>

                  <Link href="/portfolio" className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 rounded-lg flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-xs text-center text-gray-700 dark:text-gray-300">Portfolio</span>
                  </Link>

                  <Link href="/watchlist" className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30 rounded-lg flex items-center justify-center">
                      <Eye className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <span className="text-xs text-center text-gray-700 dark:text-gray-300">Watchlist</span>
                  </Link>

                  <Link href="/news" className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="w-12 h-12 bg-gradient-to-br from-pink-100 to-pink-200 dark:from-pink-900/30 dark:to-pink-800/30 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                    </div>
                    <span className="text-xs text-center text-gray-700 dark:text-gray-300">News</span>
                  </Link>

                  <Link href="/medicines" className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="w-12 h-12 bg-gradient-to-br from-teal-100 to-teal-200 dark:from-teal-900/30 dark:to-teal-800/30 rounded-lg flex items-center justify-center">
                      <Activity className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                    </div>
                    <span className="text-xs text-center text-gray-700 dark:text-gray-300">Explore</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Your Investments */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Investments</h2>
                  <Link href="/portfolio" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                    Dashboard
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
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">My Holdings</h2>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  View your complete medicine inventory and portfolio details.
                </p>
                
                <Link 
                  href="/portfolio"
                  className="block w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors text-center"
                >
                  View My Holdings
                </Link>
              </div>

              {/* All Watchlists */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">All watchlists</h2>
                  <Link href="/watchlist" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                    View all
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
