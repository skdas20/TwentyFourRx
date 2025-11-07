"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Package, TrendingUp, Clock, CheckCircle, XCircle, Activity, Pill, LogOut, Bell, Search, Plus } from "lucide-react";
import { usersApi, listingsApi } from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeListings: 0,
    pendingUsers: 0,
    pendingListings: 0,
  });
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingListings, setPendingListings] = useState([]);
  const [loading, setLoading] = useState(true);

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
    loadDashboardData();
  }, [router]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load users data
      const usersResponse = await usersApi.getUsers();
      const allUsers = usersResponse.data;
      const pendingUsersData = allUsers.filter((u: any) => u.status === 'PENDING');
      
      // Load listings data
      const listingsResponse = await listingsApi.getPendingListings();
      const pendingListingsData = listingsResponse.data;
      
      // Load active listings
      const activeListingsResponse = await listingsApi.getListings();
      const activeListingsData = activeListingsResponse.data;

      setStats({
        totalUsers: allUsers.length,
        activeListings: activeListingsData.length,
        pendingUsers: pendingUsersData.length,
        pendingListings: pendingListingsData.length,
      });
      
      setPendingUsers(pendingUsersData.slice(0, 5)); // Show first 5
      setPendingListings(pendingListingsData.slice(0, 5)); // Show first 5
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveUser = async (userId: string) => {
    try {
      await usersApi.approveUser(userId);
      loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Failed to approve user:', error);
    }
  };

  const handleRejectUser = async (userId: string) => {
    try {
      await usersApi.rejectUser(userId);
      loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Failed to reject user:', error);
    }
  };

  const handleApproveListing = async (listingId: string) => {
    try {
      await listingsApi.approveListing(listingId);
      loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Failed to approve listing:', error);
    }
  };

  const handleRejectListing = async (listingId: string) => {
    try {
      await listingsApi.rejectListing(listingId, 'Rejected by admin');
      loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Failed to reject listing:', error);
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
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <h1 className="text-2xl font-bold">
                <span className="text-gray-900 dark:text-gray-100">24R</span>
                <span className="text-[var(--brand-blue)]">x</span>
              </h1>
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Admin</span>
            </Link>

            {/* Search */}
            <div className="flex-1 max-w-lg mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users, listings..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg 
                           text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 
                           focus:ring-[var(--brand-blue)] focus:border-transparent"
                />
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <button className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors">
                <Bell className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user.roleCode}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Welcome back, {user.name}</h1>
          <p className="text-gray-600 dark:text-gray-400">Here's what's happening on your platform today.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand-blue)]"></div>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.totalUsers}</p>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <Users className="w-6 h-6 text-[var(--brand-blue)]" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Listings</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.activeListings}</p>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                    <Package className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Users</p>
                    <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{stats.pendingUsers}</p>
                  </div>
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
                    <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Listings</p>
                    <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{stats.pendingListings}</p>
                  </div>
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
                    <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Pending User Approvals */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Pending User Approvals</h3>
                  <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm font-medium rounded-full">
                    {stats.pendingUsers} pending
                  </span>
                </div>
                
                {pendingUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No pending user approvals</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingUsers.map((user: any) => (
                      <div key={user.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
                          </div>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                            {user.roleCode}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApproveUser(user.id)}
                              className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRejectUser(user.id)}
                              className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pending Listing Approvals */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Pending Listing Approvals</h3>
                  <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm font-medium rounded-full">
                    {stats.pendingListings} pending
                  </span>
                </div>
                
                {pendingListings.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No pending listing approvals</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingListings.map((listing: any) => (
                      <div key={listing.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {listing.medicine?.name || 'Medicine'}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              by {listing.seller?.name || 'Unknown'}
                            </p>
                            {listing.medicine?.manufacturer && (
                              <p className="text-xs text-gray-500 dark:text-gray-500">
                                {listing.medicine.manufacturer.name}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Base Price:</span>
                            <span className="text-gray-900 dark:text-gray-100 ml-1 font-medium">₹{listing.basePrice}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Stock:</span>
                            <span className="text-gray-900 dark:text-gray-100 ml-1 font-medium">{listing.stock} units</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">
                            {new Date(listing.createdAt).toLocaleDateString()}
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApproveListing(listing.id)}
                              className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRejectListing(listing.id)}
                              className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <Link
                  href="/medicines"
                  className="group p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 
                           hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-900/30 dark:hover:to-blue-800/30
                           rounded-xl border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600 
                           transition-all text-center hover:scale-105"
                >
                  <div className="w-12 h-12 mx-auto mb-3 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Pill className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Medicines</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Browse catalog</p>
                </Link>

                <Link
                  href="/news"
                  className="group p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 
                           hover:from-green-100 hover:to-green-200 dark:hover:from-green-900/30 dark:hover:to-green-800/30
                           rounded-xl border border-green-200 dark:border-green-700 hover:border-green-300 dark:hover:border-green-600 
                           transition-all text-center hover:scale-105"
                >
                  <div className="w-12 h-12 mx-auto mb-3 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">News</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Latest updates</p>
                </Link>

                <Link
                  href="/dashboard/admin/users"
                  className="group p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 
                           hover:from-purple-100 hover:to-purple-200 dark:hover:from-purple-900/30 dark:hover:to-purple-800/30
                           rounded-xl border border-purple-200 dark:border-purple-700 hover:border-purple-300 dark:hover:border-purple-600 
                           transition-all text-center hover:scale-105"
                >
                  <div className="w-12 h-12 mx-auto mb-3 bg-purple-100 dark:bg-purple-900/40 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">All Users</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Manage accounts</p>
                </Link>

                <Link
                  href="/dashboard/admin/analytics"
                  className="group p-6 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 
                           hover:from-orange-100 hover:to-orange-200 dark:hover:from-orange-900/30 dark:hover:to-orange-800/30
                           rounded-xl border border-orange-200 dark:border-orange-700 hover:border-orange-300 dark:hover:border-orange-600 
                           transition-all text-center hover:scale-105"
                >
                  <div className="w-12 h-12 mx-auto mb-3 bg-orange-100 dark:bg-orange-900/40 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Analytics</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">View reports</p>
                </Link>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

