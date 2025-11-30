"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Briefcase, TrendingUp, Package, ArrowLeft, PieChart } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import ProfileDropdown from "@/components/ProfileDropdown";
import { inventoryApi } from "@/lib/api";

export default function PortfolioPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [holdings, setHoldings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalValue, setTotalValue] = useState(0);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/auth/login");
      return;
    }
    setUser(JSON.parse(userData));
    loadHoldings();
  }, [router]);

  const loadHoldings = async () => {
    try {
      setLoading(true);
      const res = await inventoryApi.getUserInventory();
      // API returns { inventory: [...], summary: {...} }
      const inventory = Array.isArray(res.data?.inventory) ? res.data.inventory : [];
      setHoldings(inventory);

      // Use summary data if available, otherwise calculate
      if (res.data?.summary) {
        setTotalValue(res.data.summary.totalCurrentValue || 0);
      } else {
        const total = inventory.reduce((sum: number, item: any) => {
          return sum + (item.currentValue || 0);
        }, 0);
        setTotalValue(total);
      }
    } catch (error) {
      console.error("Failed to load holdings:", error);
      setHoldings([]); // Ensure holdings is always an array
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
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-2">
            {/* Left Side - Back Button + Logo */}
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <Link href={`/dashboard/${user.roleCode.toLowerCase()}`} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </Link>
              <Link href="/" className="flex items-center">
                <h1 className="text-xl sm:text-2xl font-bold">
                  <span className="text-gray-900 dark:text-white">24R</span>
                  <span className="text-blue-600 dark:text-blue-400">x</span>
                </h1>
              </Link>
            </div>

            {/* Center - Fixed Navigation */}
            <div className="hidden md:flex items-center gap-3 lg:gap-6">
              <Link
                href="/medicines"
                className="text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
              >
                Explore
              </Link>
              <Link
                href={`/dashboard/${user.roleCode.toLowerCase()}`}
                className="text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
              >
                Dashboard
              </Link>
            </div>

            {/* Right Side - Portfolio, Watchlist, Theme, Logout */}
            <div className="flex items-center gap-1.5 sm:gap-3 lg:gap-4 flex-shrink-0">
              <Link
                href="/portfolio"
                className="hidden lg:block text-sm text-blue-600 dark:text-blue-400 font-medium"
              >
                Portfolio
              </Link>
              <Link
                href="/watchlist"
                className="hidden lg:block text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
              >
                Watchlist
              </Link>
              <ThemeToggle />
              <ProfileDropdown user={user} />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Holdings</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {holdings.reduce((sum: number, item: any) => sum + (item.totalQty || 0), 0)} units
                </p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Value</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  ₹{totalValue.toFixed(2)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Medicines</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {holdings.length}
                </p>
              </div>
              <Briefcase className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Holdings Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : holdings.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <PieChart className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No Holdings Yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Start buying medicines to build your portfolio</p>
            <Link
              href="/medicines"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--brand-blue)] text-white rounded-lg hover:bg-[var(--brand-blue-hi)] transition-colors font-medium"
            >
              <Package className="w-5 h-5" />
              Browse Medicines
            </Link>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Medicine</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Unit Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Total Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Acquired</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {holdings.map((holding: any, index: number) => (
                    <tr key={holding.medicineId || index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {holding.medicineName || "Unknown"}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {holding.form} {holding.strength && `- ${holding.strength}`}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {holding.totalQty} units
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        ₹{holding.avgCost?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                        ₹{holding.currentValue?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {holding.lots?.length || 0} lot(s)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
