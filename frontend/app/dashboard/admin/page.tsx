"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Package, TrendingUp, Clock, CheckCircle, XCircle, Activity, Pill, LogOut, Bell, Search, Plus, FileText } from "lucide-react";
import { usersApi, listingsApi } from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";
import UserDocumentsModal from "@/components/admin/UserDocumentsModal";

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeListings: 0,
    pendingUsers: 0,
    pendingListings: 0,
    pendingProposals: 0,
  });
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingListings, setPendingListings] = useState([]);
  const [pendingProposals, setPendingProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserForDocs, setSelectedUserForDocs] = useState<{id: string, name: string} | null>(null);

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
      console.log('📋 Pending listings loaded:', pendingListingsData.length, 'listings');
      pendingListingsData.forEach((listing: any) => {
        console.log(`  - ${listing.medicine?.name} - Document: ${listing.documentUrl || 'No document'}`);
      });
      
      // Load medicine proposals
      const proposalsResponse = await listingsApi.getPendingProposals();
      const pendingProposalsData = proposalsResponse.data;
      
      // Load active listings
      const activeListingsResponse = await listingsApi.getListings();
      const activeListingsData = activeListingsResponse.data;

      setStats({
        totalUsers: allUsers.length,
        activeListings: activeListingsData.length,
        pendingUsers: pendingUsersData.length,
        pendingListings: pendingListingsData.length,
        pendingProposals: pendingProposalsData.length,
      });
      
      setPendingUsers(pendingUsersData.slice(0, 5)); // Show first 5
      setPendingListings(pendingListingsData.slice(0, 5)); // Show first 5
      setPendingProposals(pendingProposalsData.slice(0, 5)); // Show first 5
      
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
    const markupPct = prompt('Enter admin markup percentage (0-100, default 0):');
    const markup = markupPct ? parseFloat(markupPct) : 0;
    
    if (isNaN(markup) || markup < 0 || markup > 100) {
      alert('Invalid markup percentage. Please enter a number between 0 and 100.');
      return;
    }
    
    try {
      await listingsApi.approveListing(listingId, { adminMarkupPct: markup });
      alert(`Listing approved with ${markup}% markup!`);
      loadDashboardData(); // Refresh data
    } catch (error: any) {
      console.error('Failed to approve listing:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to approve listing';
      alert(`Error: ${errorMessage}`);
    }
  };

  const handleRejectListing = async (listingId: string) => {
    const reason = prompt('Enter rejection reason (optional):') || 'Rejected by admin';
    if (!reason) return;
    
    try {
      await listingsApi.rejectListing(listingId, reason);
      alert('Listing rejected');
      loadDashboardData(); // Refresh data
    } catch (error: any) {
      console.error('Failed to reject listing:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to reject listing';
      alert(`Error: ${errorMessage}`);
    }
  };

  const handleApproveProposal = async (proposalId: string) => {
    const markupInput = prompt('Enter admin markup percentage (0-100):', '0');
    if (markupInput === null) return; // User cancelled
    
    const markup = parseFloat(markupInput);
    if (isNaN(markup) || markup < 0 || markup > 100) {
      alert('Invalid markup percentage. Please enter a number between 0 and 100.');
      return;
    }
    
    try {
      const response = await listingsApi.approveMedicineProposal(proposalId, markup);
      console.log('Proposal approved:', response.data);
      alert('Medicine proposal approved and listing activated successfully!');
      loadDashboardData(); // Refresh data
    } catch (error: any) {
      console.error('Failed to approve proposal:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to approve proposal';
      alert(`Error: ${errorMessage}`);
    }
  };

  const handleRejectProposal = async (proposalId: string) => {
    const reason = prompt('Enter rejection reason (optional):') || 'Rejected by admin';
    if (!reason) return;
    
    try {
      await listingsApi.rejectMedicineProposal(proposalId, reason);
      alert('Medicine proposal rejected');
      loadDashboardData(); // Refresh data
    } catch (error: any) {
      console.error('Failed to reject proposal:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to reject proposal';
      alert(`Error: ${errorMessage}`);
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

            {/* Medicine Proposals Alert */}
            {stats.pendingProposals > 0 && (
              <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-xl">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  <div>
                    <p className="font-semibold text-orange-900 dark:text-orange-100">
                      {stats.pendingProposals} New Medicine Proposal{stats.pendingProposals > 1 ? 's' : ''}
                    </p>
                    <p className="text-sm text-orange-700 dark:text-orange-300">
                      Sellers have proposed new medicines that need your approval
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Pending Medicine Proposals */}
              {stats.pendingProposals > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm lg:col-span-2">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Pending Medicine Proposals</h3>
                    <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm font-medium rounded-full">
                      {stats.pendingProposals} pending
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingProposals.map((proposal: any) => (
                      <div key={proposal.id} className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-gray-100">{proposal.name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {proposal.form} {proposal.strength && `- ${proposal.strength}`}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              by {proposal.seller?.name || 'Unknown'}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Manufacturer:</span>
                            <p className="text-gray-900 dark:text-gray-100 font-medium">{proposal.manufacturerName}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Base Price:</span>
                            <p className="text-gray-900 dark:text-gray-100 font-medium">₹{proposal.basePrice}</p>
                          </div>
                        </div>
                        {proposal.documentUrl && (
                          <div className="mb-3">
                            <a
                              href={proposal.documentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-sm font-medium"
                            >
                              <FileText className="w-4 h-4" />
                              View Document
                            </a>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-3 border-t border-orange-200 dark:border-orange-700">
                          <span className="text-sm text-gray-500">
                            {new Date(proposal.createdAt).toLocaleDateString()}
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApproveProposal(proposal.id)}
                              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectProposal(proposal.id)}
                              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
                            >
                              <XCircle className="w-4 h-4" />
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                              onClick={() => setSelectedUserForDocs({id: user.id, name: user.name})}
                              className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                              title="View Documents"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleApproveUser(user.id)}
                              className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors"
                              title="Approve User"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRejectUser(user.id)}
                              className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                              title="Reject User"
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
                        {listing.documentUrl && (
                          <div className="mb-3">
                            <a
                              href={listing.documentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                            >
                              📄 View Document
                            </a>
                          </div>
                        )}
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
                  href="/dashboard/admin/listings"
                  className="group p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 
                           hover:from-green-100 hover:to-green-200 dark:hover:from-green-900/30 dark:hover:to-green-800/30
                           rounded-xl border border-green-200 dark:border-green-700 hover:border-green-300 dark:hover:border-green-600 
                           transition-all text-center hover:scale-105"
                >
                  <div className="w-12 h-12 mx-auto mb-3 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Package className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">All Listings</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">View all listings</p>
                </Link>

                <Link
                  href="/dashboard/admin/buy-proposals"
                  className="group p-6 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 
                           hover:from-indigo-100 hover:to-indigo-200 dark:hover:from-indigo-900/30 dark:hover:to-indigo-800/30
                           rounded-xl border border-indigo-200 dark:border-indigo-700 hover:border-indigo-300 dark:hover:border-indigo-600 
                           transition-all text-center hover:scale-105"
                >
                  <div className="w-12 h-12 mx-auto mb-3 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Buy Proposals</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Review proposals</p>
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

      {/* Documents Modal */}
      {selectedUserForDocs && (
        <UserDocumentsModal
          userId={selectedUserForDocs.id}
          userName={selectedUserForDocs.name}
          onClose={() => setSelectedUserForDocs(null)}
          onDocumentReviewed={() => loadDashboardData()}
        />
      )}
    </div>
  );
}

