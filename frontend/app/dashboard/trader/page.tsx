"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Package, TrendingUp, Clock, LogOut, Bell, Search, Pill, ShoppingCart } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { listingsApi } from "@/lib/api";

export default function TraderDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/auth/login");
      return;
    }
    const parsed = JSON.parse(userData);
    if (parsed.roleCode !== "TRADER") {
      router.push("/auth/login");
      return;
    }
    setUser(parsed);
    loadDashboardData();
  }, [router]);

  const loadDashboardData = async () => {
    try {
      const response = await listingsApi.getMyListings();
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

  if (!user) return null;

  const activeListings = listings.filter((l: any) => l.status === "ACTIVE").length;
  const pendingListings = listings.filter((l: any) => l.status === "PENDING").length;
  const totalStock = listings.reduce((sum: number, l: any) => sum + (l.stock || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <h1 className="text-2xl font-bold">
                <span className="text-gray-900 dark:text-gray-100">24R</span>
                <span className="text-blue-600 dark:text-blue-400">x</span>
              </h1>
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Trader</span>
            </Link>

            <div className="flex-1 max-w-lg mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search medicines..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg 
                           text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 
                           focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              <button className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
                <Bell className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user.roleCode}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Welcome back, {user.name}</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your trading activities</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Listings</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{listings.length}</p>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Listings</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">{activeListings}</p>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</p>
                    <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{pendingListings}</p>
                  </div>
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
                    <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Stock</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{totalStock.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                    <Pill className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link
                  href="/medicines"
                  className="group p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 
                           hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-900/30 dark:hover:to-blue-800/30
                           rounded-xl border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600 
                           transition-all text-center hover:scale-105"
                >
                  <div className="w-12 h-12 mx-auto mb-3 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ShoppingCart className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Browse Market</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Find medicines</p>
                </Link>

                <Link
                  href="/news"
                  className="group p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 
                           hover:from-green-100 hover:to-green-200 dark:hover:from-green-900/30 dark:hover:to-green-800/30
                           rounded-xl border border-green-200 dark:border-green-700 hover:border-green-300 dark:hover:border-green-600 
                           transition-all text-center hover:scale-105"
                >
                  <div className="w-12 h-12 mx-auto mb-3 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">News</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Latest updates</p>
                </Link>

                <button className="group p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 
                                 hover:from-purple-100 hover:to-purple-200 dark:hover:from-purple-900/30 dark:hover:to-purple-800/30
                                 rounded-xl border border-purple-200 dark:border-purple-700 hover:border-purple-300 dark:hover:border-purple-600 
                                 transition-all text-center hover:scale-105">
                  <div className="w-12 h-12 mx-auto mb-3 bg-purple-100 dark:bg-purple-900/40 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Package className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">My Orders</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Track orders</p>
                </button>

                <button className="group p-6 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 
                                 hover:from-orange-100 hover:to-orange-200 dark:hover:from-orange-900/30 dark:hover:to-orange-800/30
                                 rounded-xl border border-orange-200 dark:border-orange-700 hover:border-orange-300 dark:hover:border-orange-600 
                                 transition-all text-center hover:scale-105">
                  <div className="w-12 h-12 mx-auto mb-3 bg-orange-100 dark:bg-orange-900/40 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Pill className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">My Listings</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">View inventory</p>
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
