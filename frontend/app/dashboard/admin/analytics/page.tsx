"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TrendingUp, Users, Package, DollarSign, ArrowLeft, BarChart3, LogOut } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function AnalyticsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/auth/login");
      return;
    }
    const parsed = JSON.parse(userData);
    if (parsed.roleCode !== "ADMIN") {
      router.push("/auth/login");
      return;
    }
    setUser(parsed);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    router.push("/auth/login");
  };

  if (!user) return null;

  const stats = [
    { label: "Total Revenue", value: "₹2.4Cr", change: "+12.5%", trend: "up", color: "blue" },
    { label: "Total Orders", value: "1,234", change: "+8.2%", trend: "up", color: "green" },
    { label: "Active Users", value: "856", change: "+15.3%", trend: "up", color: "purple" },
    { label: "Avg Order Value", value: "₹19,450", change: "-2.1%", trend: "down", color: "orange" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/admin" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Analytics Dashboard</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Platform performance metrics</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
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
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.label}</p>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  stat.trend === "up" 
                    ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300" 
                    : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                }`}>
                  {stat.change}
                </span>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Charts Placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Revenue Trend</h3>
            <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500">
              <div className="text-center">
                <BarChart3 className="w-16 h-16 mx-auto mb-2" />
                <p>Chart visualization coming soon</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">User Growth</h3>
            <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500">
              <div className="text-center">
                <TrendingUp className="w-16 h-16 mx-auto mb-2" />
                <p>Chart visualization coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}