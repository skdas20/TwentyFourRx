"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Package, TrendingUp, Clock, CheckCircle, XCircle, Activity, Pill, LogOut, Bell, Search, FileText, Newspaper, MessageCircle, Upload } from "lucide-react";
import { usersApi, listingsApi, buyProposalsApi, deliveryRequestsApi, medicineReferencesApi } from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";
import UserDocumentsModal from "@/components/admin/UserDocumentsModal";
import MarkupInputModal from "@/components/admin/MarkupInputModal";
import TextInputModal from "@/components/admin/TextInputModal";
import Logo from "@/components/Logo";
import { showToast } from "@/lib/toast";

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeListings: 0,
    pendingUsers: 0,
    pendingListings: 0,
    pendingProposals: 0,
    pendingContributions: 0,
    pendingBulkListings: 0,
    pendingBuyProposals: 0,
    pendingDeliveries: 0,
  });
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [pendingListings, setPendingListings] = useState<any[]>([]);
  const [pendingProposals, setPendingProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserForDocs, setSelectedUserForDocs] = useState<{id: string, name: string} | null>(null);
  
  // Modal states
  const [showMarkupModal, setShowMarkupModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showProposalMarkupModal, setShowProposalMarkupModal] = useState(false);
  const [showProposalRejectModal, setShowProposalRejectModal] = useState(false);
  const [currentActionId, setCurrentActionId] = useState<string | null>(null);

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
      
      // For each PENDING user, check if they have uploaded KYC documents
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
      const token = localStorage.getItem('accessToken');
      
      const pendingUsersWithDocs = await Promise.all(
        allUsers
          .filter((u: any) => u.status === 'PENDING')
          .map(async (user: any) => {
            try {
              const docsResponse = await fetch(`${API_URL}/admin/users/${user.id}/documents`, {
                headers: { 'Authorization': `Bearer ${token}` },
              });
              
              if (docsResponse.ok) {
                const docsData = await docsResponse.json();
                return {
                  ...user,
                  hasKycDocuments: docsData.documents && docsData.documents.length > 0,
                  kycDocumentsCount: docsData.documents?.length || 0,
                };
              }
            } catch (error) {
              console.error(`Failed to load KYC status for user ${user.id}:`, error);
            }
            
            return {
              ...user,
              hasKycDocuments: false,
              kycDocumentsCount: 0,
            };
          })
      );
      
      // ONLY show PENDING users who have uploaded KYC documents in the dashboard
      const pendingUsersData = pendingUsersWithDocs.filter((u: any) => u.hasKycDocuments);
      
      // Load listings data
      const listingsResponse = await listingsApi.getPendingListings();
      const pendingListingsData = listingsResponse.data;
      console.log('📋 Pending listings loaded:', pendingListingsData.length, 'listings');
      pendingListingsData.forEach((listing: any) => {
        console.log(`  - ${listing.medicine?.name} - Document: ${listing.documentUrl || 'No document'}`);
      });
      
      // Load all data in parallel for faster loading
      const [
        proposalsResponse,
        contributionsResponse,
        activeListingsResponse,
        bulkRequestsResponse,
        buyProposalsResponse,
        deliveryRequestsResponse
      ] = await Promise.all([
        listingsApi.getPendingProposals(),
        medicineReferencesApi.getContributions('PENDING'),
        listingsApi.getListings(),
        listingsApi.getBulkRequests(),
        buyProposalsApi.getPendingProposals(),
        deliveryRequestsApi.getAllRequests('PENDING')
      ]);

      const pendingProposalsData = proposalsResponse.data;
      const pendingContributionsData = contributionsResponse.data?.contributions || [];
      const activeListingsData = activeListingsResponse.data;
      const bulkRequestsData = bulkRequestsResponse.data || [];
      const pendingBulkData = bulkRequestsData.filter((r: any) => r.status === 'PENDING' || r.status === 'PROCESSED');
      const pendingBuyProposalsData = buyProposalsResponse.data || [];
      const pendingDeliveriesData = deliveryRequestsResponse.data || [];

      setStats({
        totalUsers: allUsers.length,
        activeListings: activeListingsData.length,
        pendingUsers: pendingUsersData.length,
        pendingListings: pendingListingsData.length,
        pendingProposals: pendingProposalsData.length,
        pendingContributions: pendingContributionsData.length,
        pendingBulkListings: pendingBulkData.length,
        pendingBuyProposals: pendingBuyProposalsData.length,
        pendingDeliveries: pendingDeliveriesData.length,
      });
      
      setPendingUsers(pendingUsersData); // Show all users
      setPendingListings(pendingListingsData); // Show all listings
      setPendingProposals(pendingProposalsData); // Show all proposals
      
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
    setCurrentActionId(listingId);
    setShowMarkupModal(true);
  };

  const confirmApproveListing = async (markupValue: number, markupType: 'PERCENTAGE' | 'FIXED') => {
    if (!currentActionId) return;
    
    try {
      await listingsApi.approveListing(currentActionId, { adminMarkupPct: markupValue, markupType });
      const displayText = markupType === 'PERCENTAGE' ? `${markupValue}%` : `₹${markupValue}`;
      showToast.success(`Listing approved with ${displayText} markup!`);
      loadDashboardData(); // Refresh data
    } catch (error: any) {
      console.error('Failed to approve listing:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to approve listing';
      showToast.error(`Error: ${errorMessage}`);
    } finally {
      setShowMarkupModal(false);
      setCurrentActionId(null);
    }
  };

  const handleRejectListing = async (listingId: string) => {
    setCurrentActionId(listingId);
    setShowRejectModal(true);
  };

  const confirmRejectListing = async (reason: string) => {
    if (!currentActionId) return;
    
    try {
      await listingsApi.rejectListing(currentActionId, reason || 'Rejected by admin');
      showToast.success('Listing rejected');
      loadDashboardData(); // Refresh data
    } catch (error: any) {
      console.error('Failed to reject listing:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to reject listing';
      showToast.error(`Error: ${errorMessage}`);
    } finally {
      setShowRejectModal(false);
      setCurrentActionId(null);
    }
  };

  const handleApproveProposal = async (proposalId: string) => {
    setCurrentActionId(proposalId);
    setShowProposalMarkupModal(true);
  };

  const confirmApproveProposal = async (markupValue: number, markupType: 'PERCENTAGE' | 'FIXED') => {
    if (!currentActionId) return;
    
    try {
      const response = await listingsApi.approveMedicineProposal(currentActionId, markupValue);
      console.log('Proposal approved:', response.data);
      const displayText = markupType === 'PERCENTAGE' ? `${markupValue}%` : `₹${markupValue}`;
      showToast.success(`Medicine proposal approved with ${displayText} markup and listing activated successfully!`);
      loadDashboardData(); // Refresh data
    } catch (error: any) {
      console.error('Failed to approve proposal:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to approve proposal';
      showToast.error(`Error: ${errorMessage}`);
    } finally {
      setShowProposalMarkupModal(false);
      setCurrentActionId(null);
    }
  };

  const handleRejectProposal = async (proposalId: string) => {
    setCurrentActionId(proposalId);
    setShowProposalRejectModal(true);
  };

  const confirmRejectProposal = async (reason: string) => {
    if (!currentActionId) return;
    
    try {
      await listingsApi.rejectMedicineProposal(currentActionId, reason || 'Rejected by admin');
      showToast.success('Medicine proposal rejected');
      loadDashboardData(); // Refresh data
    } catch (error: any) {
      console.error('Failed to reject proposal:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to reject proposal';
      showToast.error(`Error: ${errorMessage}`);
    } finally {
      setShowProposalRejectModal(false);
      setCurrentActionId(null);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-950 dark:via-blue-950/50 dark:to-indigo-950/50">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <Logo size="sm" href="/" isLoggedIn={true} />
              <div className="h-8 w-px bg-gray-300 dark:bg-gray-600"></div>
              <span className="text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">Admin Dashboard</span>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-lg mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users, listings..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-600/50 rounded-xl
                           text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2
                           focus:ring-blue-500/50 focus:border-blue-500/50 transition-all backdrop-blur-sm"
                />
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <Link href="/notifications" className="relative p-2.5 text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 transition-colors rounded-xl hover:bg-blue-50/50 dark:hover:bg-blue-900/20">
                <Bell className="w-5 h-5" />
                {(stats.pendingUsers + stats.pendingListings + stats.pendingProposals + stats.pendingBulkListings + stats.pendingBuyProposals + stats.pendingDeliveries) > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                )}
              </Link>
              <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-gray-700">
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{user.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{user.roleCode}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2.5 text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 transition-colors rounded-xl hover:bg-red-50/50 dark:hover:bg-red-900/20"
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
        <div className="mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-3">
            Welcome back, {user.name} 👋
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">Here's what's happening on your platform today.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              <div className="group relative bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">Total</span>
                  </div>
                  <p className="text-4xl font-bold text-white mb-1">{stats.totalUsers}</p>
                  <p className="text-sm font-medium text-white/90">Users</p>
                </div>
              </div>

              <div className="group relative bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                      <Package className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">Active</span>
                  </div>
                  <p className="text-4xl font-bold text-white mb-1">{stats.activeListings}</p>
                  <p className="text-sm font-medium text-white/90">Listings</p>
                </div>
              </div>

              <div className="group relative bg-gradient-to-br from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">Pending</span>
                  </div>
                  <p className="text-4xl font-bold text-white mb-1">{stats.pendingUsers}</p>
                  <p className="text-sm font-medium text-white/90">Users</p>
                </div>
              </div>

              <div className="group relative bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">Pending</span>
                  </div>
                  <p className="text-4xl font-bold text-white mb-1">{stats.pendingListings}</p>
                  <p className="text-sm font-medium text-white/90">Listings</p>
                </div>
              </div>
            </div>

            {/* Alert Banners */}
            {(stats.pendingProposals > 0 || stats.pendingBulkListings > 0 || stats.pendingBuyProposals > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                {stats.pendingProposals > 0 && (
                  <div className="relative bg-gradient-to-br from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700 rounded-xl p-4 shadow-lg overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
                    <div className="relative flex items-center gap-3">
                      <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                        <Pill className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-white text-lg">{stats.pendingProposals}</p>
                        <p className="text-sm text-white/90">Medicine Proposals</p>
                      </div>
                    </div>
                  </div>
                )}
                {stats.pendingBulkListings > 0 && (
                  <div className="relative bg-gradient-to-br from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700 rounded-xl p-4 shadow-lg overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
                    <div className="relative flex items-center gap-3">
                      <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                        <Upload className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-white text-lg">{stats.pendingBulkListings}</p>
                        <p className="text-sm text-white/90">Bulk Upload Requests</p>
                      </div>
                    </div>
                  </div>
                )}
                {stats.pendingBuyProposals > 0 && (
                  <div className="relative bg-gradient-to-br from-indigo-500 to-indigo-600 dark:from-indigo-600 dark:to-indigo-700 rounded-xl p-4 shadow-lg overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
                    <div className="relative flex items-center gap-3">
                      <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-white text-lg">{stats.pendingBuyProposals}</p>
                        <p className="text-sm text-white/90">Buy Proposals</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
              {/* Pending User Approvals */}
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Pending KYC Approvals</h3>
                  </div>
                  <span className="px-4 py-1.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-sm font-semibold rounded-full shadow-lg">
                    {stats.pendingUsers}
                  </span>
                </div>
                
                {pendingUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No pending KYC approvals</p>
                  </div>
                ) : (
                  <div className="max-h-[400px] overflow-y-auto space-y-4 pr-2">
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
              <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-xl">
                      <Package className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Pending Listing Approvals</h3>
                  </div>
                  <span className="px-4 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-semibold rounded-full shadow-lg">
                    {stats.pendingListings + stats.pendingProposals}
                  </span>
                </div>
                
                {(pendingListings.length === 0 && pendingProposals.length === 0) ? (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No pending listing approvals</p>
                  </div>
                ) : (
                  <div className="max-h-[500px] overflow-y-auto space-y-4 pr-2">
                    {/* Show regular listings first */}
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
                    
                    {/* Show medicine proposals (new medicines) */}
                    {pendingProposals.map((proposal: any) => (
                      <div key={proposal.id} className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 dark:text-gray-100">
                                {proposal.name}
                              </p>
                              <span className="px-2 py-0.5 bg-orange-500 text-white text-xs rounded">New Medicine</span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {proposal.form} {proposal.strength && `- ${proposal.strength}`}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              by {proposal.seller?.name || 'Unknown'}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Manufacturer:</span>
                            <p className="text-gray-900 dark:text-gray-100 font-medium text-xs">{proposal.manufacturerName}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Base Price:</span>
                            <span className="text-gray-900 dark:text-gray-100 ml-1 font-medium">₹{proposal.basePrice}</span>
                          </div>
                        </div>
                        {proposal.documentUrl && (
                          <div className="mb-3">
                            <a
                              href={proposal.documentUrl}
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
                            {new Date(proposal.createdAt).toLocaleDateString()}
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApproveProposal(proposal.id)}
                              className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRejectProposal(proposal.id)}
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
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-8 border border-gray-200/50 dark:border-gray-700/50 shadow-xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Quick Actions</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
                <Link
                  href="/dashboard/admin/news"
                  className="group p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 
                           hover:from-green-100 hover:to-green-200 dark:hover:from-green-900/30 dark:hover:to-green-800/30
                           rounded-xl border border-green-200 dark:border-green-700 hover:border-green-300 dark:hover:border-green-600 
                           transition-all text-center hover:scale-105"
                >
                  <div className="w-12 h-12 mx-auto mb-3 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Newspaper className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">News Management</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Create & manage news</p>
                </Link>

                <Link
                  href="/dashboard/admin/users"
                  className="group relative p-6 bg-gradient-to-br from-purple-500/10 to-purple-600/10 dark:from-purple-500/20 dark:to-purple-600/20
                           hover:from-purple-500/20 hover:to-purple-600/20 dark:hover:from-purple-500/30 dark:hover:to-purple-600/30
                           rounded-2xl border-2 border-purple-200/50 dark:border-purple-700/50 hover:border-purple-400 dark:hover:border-purple-500
                           transition-all text-center hover:scale-105 hover:shadow-lg"
                >
                  {stats.pendingUsers > 0 && (
                    <div className="absolute -top-3 -right-3 bg-gradient-to-br from-red-500 to-red-600 text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center shadow-lg animate-pulse z-50">
                      {stats.pendingUsers}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
                  <div className="relative">
                    <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                      <Users className="w-7 h-7 text-white" />
                    </div>
                    <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-1">All Users</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Manage accounts</p>
                  </div>
                </Link>

                <Link
                  href="/dashboard/admin/listings"
                  className="group relative p-6 bg-gradient-to-br from-green-500/10 to-green-600/10 dark:from-green-500/20 dark:to-green-600/20
                           hover:from-green-500/20 hover:to-green-600/20 dark:hover:from-green-500/30 dark:hover:to-green-600/30
                           rounded-2xl border-2 border-green-200/50 dark:border-green-700/50 hover:border-green-400 dark:hover:border-green-500
                           transition-all text-center hover:scale-105 hover:shadow-lg"
                >
                  {stats.pendingListings > 0 && (
                    <div className="absolute -top-3 -right-3 bg-gradient-to-br from-red-500 to-red-600 text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center shadow-lg animate-pulse z-50">
                      {stats.pendingListings}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
                  <div className="relative">
                    <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                      <Package className="w-7 h-7 text-white" />
                    </div>
                    <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-1">All Listings</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">View all listings</p>
                  </div>
                </Link>

                <Link
                  href="/dashboard/admin/bulk-listings"
                  className="group relative p-6 bg-gradient-to-br from-amber-500/10 to-amber-600/10 dark:from-amber-500/20 dark:to-amber-600/20
                           hover:from-amber-500/20 hover:to-amber-600/20 dark:hover:from-amber-500/30 dark:hover:to-amber-600/30
                           rounded-2xl border-2 border-amber-200/50 dark:border-amber-700/50 hover:border-amber-400 dark:hover:border-amber-500
                           transition-all text-center hover:scale-105 hover:shadow-lg"
                >
                  {stats.pendingBulkListings > 0 && (
                    <div className="absolute -top-3 -right-3 bg-gradient-to-br from-red-500 to-red-600 text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center shadow-lg animate-pulse z-50">
                      {stats.pendingBulkListings}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
                  <div className="relative">
                    <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                      <Upload className="w-7 h-7 text-white" />
                    </div>
                    <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-1">Bulk Listings</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">CSV uploads</p>
                  </div>
                </Link>

                <Link
                  href="/dashboard/admin/buy-proposals"
                  className="group relative p-6 bg-gradient-to-br from-indigo-500/10 to-indigo-600/10 dark:from-indigo-500/20 dark:to-indigo-600/20
                           hover:from-indigo-500/20 hover:to-indigo-600/20 dark:hover:from-indigo-500/30 dark:hover:to-indigo-600/30
                           rounded-2xl border-2 border-indigo-200/50 dark:border-indigo-700/50 hover:border-indigo-400 dark:hover:border-indigo-500
                           transition-all text-center hover:scale-105 hover:shadow-lg"
                >
                  {stats.pendingBuyProposals > 0 && (
                    <div className="absolute -top-3 -right-3 bg-gradient-to-br from-red-500 to-red-600 text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center shadow-lg animate-pulse z-50">
                      {stats.pendingBuyProposals}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
                  <div className="relative">
                    <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                      <FileText className="w-7 h-7 text-white" />
                    </div>
                    <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-1">Buy Proposals</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Review proposals</p>
                  </div>
                </Link>

                <Link
                  href="/dashboard/admin/delivery-requests"
                  className="group relative p-6 bg-gradient-to-br from-teal-500/10 to-teal-600/10 dark:from-teal-500/20 dark:to-teal-600/20
                           hover:from-teal-500/20 hover:to-teal-600/20 dark:hover:from-teal-500/30 dark:hover:to-teal-600/30
                           rounded-2xl border-2 border-teal-200/50 dark:border-teal-700/50 hover:border-teal-400 dark:hover:border-teal-500
                           transition-all text-center hover:scale-105 hover:shadow-lg"
                >
                  {stats.pendingDeliveries > 0 && (
                    <div className="absolute -top-3 -right-3 bg-gradient-to-br from-red-500 to-red-600 text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center shadow-lg animate-pulse z-50">
                      {stats.pendingDeliveries}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
                  <div className="relative">
                    <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                      <Activity className="w-7 h-7 text-white" />
                    </div>
                    <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-1">Delivery Requests</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Approve deliveries</p>
                  </div>
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

                <Link
                  href="/dashboard/admin/contributions"
                  className="group relative p-6 bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 dark:from-cyan-500/20 dark:to-cyan-600/20
                           hover:from-cyan-500/20 hover:to-cyan-600/20 dark:hover:from-cyan-500/30 dark:hover:to-cyan-600/30
                           rounded-2xl border-2 border-cyan-200/50 dark:border-cyan-700/50 hover:border-cyan-400 dark:hover:border-cyan-500
                           transition-all text-center hover:scale-105 hover:shadow-lg"
                >
                  {stats.pendingContributions > 0 && (
                    <div className="absolute -top-3 -right-3 bg-gradient-to-br from-red-500 to-red-600 text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center shadow-lg animate-pulse z-50">
                      {stats.pendingContributions}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
                  <div className="relative">
                    <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                      <Pill className="w-7 h-7 text-white" />
                    </div>
                    <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-1">Contributions</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Review medicines</p>
                  </div>
                </Link>

                <Link
                  href="/dashboard/admin/support"
                  className="group p-6 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20
                           hover:from-amber-100 hover:to-amber-200 dark:hover:from-amber-900/30 dark:hover:to-amber-800/30
                           rounded-xl border border-amber-200 dark:border-amber-700 hover:border-amber-300 dark:hover:border-amber-600
                           transition-all text-center hover:scale-105"
                >
                  <div className="w-12 h-12 mx-auto mb-3 bg-amber-100 dark:bg-amber-900/40 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <MessageCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Support</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">User queries</p>
                </Link>

                <Link
                  href="/dashboard/admin/medicines"
                  className="group p-6 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20
                           hover:from-indigo-100 hover:to-indigo-200 dark:hover:from-indigo-900/30 dark:hover:to-indigo-800/30
                           rounded-xl border border-indigo-200 dark:border-indigo-700 hover:border-indigo-300 dark:hover:border-indigo-600
                           transition-all text-center hover:scale-105"
                >
                  <div className="w-12 h-12 mx-auto mb-3 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Pill className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Medicines</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Manage medicines</p>
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

      {/* Markup Input Modal for Listing Approval */}
      <MarkupInputModal
        isOpen={showMarkupModal}
        onConfirm={confirmApproveListing}
        onClose={() => {
          setShowMarkupModal(false);
          setCurrentActionId(null);
        }}
        defaultMarkup={0}
        title="Approve Listing"
      />

      {/* Text Input Modal for Listing Rejection */}
      <TextInputModal
        isOpen={showRejectModal}
        title="Reject Listing"
        label="Rejection Reason (optional)"
        placeholder="Enter reason for rejection..."
        onConfirm={confirmRejectListing}
        onClose={() => {
          setShowRejectModal(false);
          setCurrentActionId(null);
        }}
        confirmText="Reject"
      />

      {/* Markup Input Modal for Proposal Approval */}
      <MarkupInputModal
        isOpen={showProposalMarkupModal}
        onConfirm={confirmApproveProposal}
        onClose={() => {
          setShowProposalMarkupModal(false);
          setCurrentActionId(null);
        }}
        defaultMarkup={0}
        title="Approve Medicine Proposal"
      />

      {/* Text Input Modal for Proposal Rejection */}
      <TextInputModal
        isOpen={showProposalRejectModal}
        title="Reject Medicine Proposal"
        label="Rejection Reason (optional)"
        placeholder="Enter reason for rejection..."
        onConfirm={confirmRejectProposal}
        onClose={() => {
          setShowProposalRejectModal(false);
          setCurrentActionId(null);
        }}
        confirmText="Reject"
      />
    </div>
  );
}

