'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit, Edit2, Trash2, Search, Pill, Plus, Bell, LogOut } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import Logo from '@/components/Logo';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import MarkupInputModal from '@/components/admin/MarkupInputModal';
import { showToast } from '@/lib/toast';

interface Medicine {
  id: string;
  name: string;
  form: string;
  strength: string;
  imageUrl: string | null;
  manufacturer: {
    name: string;
  };
  marketer: {
    name: string;
  } | null;
  isActive: boolean;
  listings?: Array<{
    id: string;
    status: string;
    adminMarkupPct: number;
    adminMarkupType: string;
    seller: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

export default function MedicineManagementPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sellerFilter, setSellerFilter] = useState<string>('all');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [medicineToDelete, setMedicineToDelete] = useState<string | null>(null);
  const [selectedMedicines, setSelectedMedicines] = useState<Set<string>>(new Set());
  const [showMassDeleteDialog, setShowMassDeleteDialog] = useState(false);
  const [showMarkupModal, setShowMarkupModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/auth/login');
      return;
    }
    const parsed = JSON.parse(userData);
    if (parsed.roleCode !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }
    setUser(parsed);
    fetchMedicines();
  }, [router]);

  const fetchMedicines = async () => {
    try {
      setLoading(true);
      const { medicinesApi } = await import('@/lib/api');
      const response = await medicinesApi.getAllMedicinesForAdmin();
      console.log('Medicines loaded:', response.data.length);
      setMedicines(response.data);
    } catch (error: any) {
      console.error('Failed to load medicines:', error);
      showToast.error(`Failed to load medicines: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    setMedicineToDelete(id);
    setShowDeleteDialog(true);
  };
  const handleEditMarkup = (listing: any) => {
    setSelectedListing(listing);
    setShowMarkupModal(true);
  };

  const confirmEditMarkup = async (markupValue: number, markupType: 'PERCENTAGE' | 'FIXED') => {
    try {
      const { listingsApi } = await import('@/lib/api');
      await listingsApi.updateListingMarkup(selectedListing.id, { adminMarkupPct: markupValue, markupType });
      const displayText = markupType === 'PERCENTAGE' ? `${markupValue}%` : `₹${markupValue}`;
      showToast.success(`Markup updated to ${displayText}!`);
      setShowMarkupModal(false);
      loadMedicines();
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Failed to update markup');
    }
  };
  const confirmDelete = async () => {
    if (!medicineToDelete) return;

    try {
      const { api } = await import('@/lib/api');
      await api.delete(`/medicines/${medicineToDelete}`);
      showToast.success('Medicine deleted successfully');
      fetchMedicines();
    } catch (error: any) {
      console.error('Failed to delete medicine:', error);
      showToast.error(error.response?.data?.message || 'Failed to delete medicine');
    } finally {
      setShowDeleteDialog(false);
      setMedicineToDelete(null);
    }
  };

  const toggleSelectMedicine = (id: string) => {
    const newSelected = new Set(selectedMedicines);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedMedicines(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedMedicines.size === filteredMedicines.length) {
      setSelectedMedicines(new Set());
    } else {
      setSelectedMedicines(new Set(filteredMedicines.map(m => m.id)));
    }
  };

  const handleMassDelete = () => {
    if (selectedMedicines.size === 0) {
      showToast.warning('Please select medicines to delete');
      return;
    }
    setShowMassDeleteDialog(true);
  };

  const confirmMassDelete = async () => {
    // Close dialog immediately and show progress
    setShowMassDeleteDialog(false);
    const totalCount = selectedMedicines.size;
    showToast.info(`Deleting ${totalCount} medicine(s)...`);

    try {
      const { api } = await import('@/lib/api');
      const medicineIds = Array.from(selectedMedicines);
      
      // Delete in batches of 10 to avoid overwhelming the server
      const BATCH_SIZE = 10;
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < medicineIds.length; i += BATCH_SIZE) {
        const batch = medicineIds.slice(i, i + BATCH_SIZE);
        
        // Delete current batch in parallel
        const batchPromises = batch.map(async (id) => {
          try {
            await api.delete(`/medicines/${id}`);
            return { success: true, id };
          } catch (error) {
            return { success: false, id };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        successCount += batchResults.filter(r => r.success).length;
        failCount += batchResults.filter(r => !r.success).length;

        // Show progress
        if (medicineIds.length > BATCH_SIZE) {
          const progress = Math.min(i + BATCH_SIZE, medicineIds.length);
          showToast.info(`Deleted ${progress}/${totalCount}...`);
        }
      }

      if (successCount > 0) {
        showToast.success(`${successCount} medicine(s) deleted successfully`);
      }
      if (failCount > 0) {
        showToast.error(`${failCount} medicine(s) could not be deleted`);
      }

      setSelectedMedicines(new Set());
      fetchMedicines();
    } catch (error: any) {
      console.error('Failed to delete medicines:', error);
      showToast.error('Failed to delete medicines');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    router.push('/auth/login');
  };

  // Get unique sellers from medicines
  const uniqueSellers = Array.from(
    new Map(
      medicines
        .flatMap(m => m.listings || [])
        .map(l => [l.seller.id, l.seller])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const filteredMedicines = medicines.filter((medicine) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      medicine.name.toLowerCase().includes(searchLower) ||
      medicine.manufacturer.name.toLowerCase().includes(searchLower) ||
      medicine.form.toLowerCase().includes(searchLower) ||
      medicine.strength.toLowerCase().includes(searchLower);
    
    const matchesSeller = 
      sellerFilter === 'all' || 
      (medicine.listings && medicine.listings.some(l => l.seller.id === sellerFilter));
    
    return matchesSearch && matchesSeller;
  });

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <Logo size="sm" href="/" isLoggedIn={true} />
              <span className="text-sm text-gray-500 dark:text-gray-400">Admin - Medicines</span>
            </div>

            {/* Search and Filters */}
            <div className="flex-1 max-w-2xl mx-8 flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search medicines..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg
                           text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2
                           focus:ring-[var(--brand-blue)] focus:border-transparent"
                />
              </div>
              <select
                value={sellerFilter}
                onChange={(e) => setSellerFilter(e.target.value)}
                className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg
                         text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] focus:border-transparent"
              >
                <option value="all">All Sellers</option>
                {uniqueSellers.map((seller) => (
                  <option key={seller.id} value={seller.id}>
                    {seller.name}
                  </option>
                ))}
              </select>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/admin"
                className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <ThemeToggle />
              <Link href="/notifications" className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors" title="Notifications">
                <Bell className="w-5 h-5" />
              </Link>
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Medicine Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage all medicines in the system</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Medicines</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{medicines.length}</p>
                </div>
                <Pill className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {medicines.filter((m) => m.isActive).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">With Images</p>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {medicines.filter((m) => m.imageUrl).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Medicines Table */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Loading medicines...</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Mass Delete Actions */}
              {selectedMedicines.size > 0 && (
                <div className="px-6 py-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {selectedMedicines.size} medicine(s) selected
                  </span>
                  <button
                    onClick={handleMassDelete}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Selected
                  </button>
                </div>
              )}
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedMedicines.size === filteredMedicines.length && filteredMedicines.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Medicine
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Form & Strength
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Manufacturer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Image
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredMedicines.map((medicine) => (
                      <tr key={medicine.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedMedicines.has(medicine.id)}
                            onChange={() => toggleSelectMedicine(medicine.id)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{medicine.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {medicine.form} - {medicine.strength}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600 dark:text-gray-400">{medicine.manufacturer.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {medicine.imageUrl ? (
                            <img
                              src={medicine.imageUrl}
                              alt={medicine.name}
                              className="w-12 h-12 rounded object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                              <Pill className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              medicine.isActive
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            }`}
                          >
                            {medicine.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex flex-col gap-1">
                            {medicine.listings && medicine.listings.length > 0 && (medicine.listings[0].status === 'APPROVED' || medicine.listings[0].status === 'ACTIVE') && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                Markup: {medicine.listings[0].adminMarkupType === 'FIXED' ? `₹${medicine.listings[0].adminMarkupPct}` : `${medicine.listings[0].adminMarkupPct}%`}
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              {medicine.listings && medicine.listings.length > 0 && (medicine.listings[0].status === 'APPROVED' || medicine.listings[0].status === 'ACTIVE') && (
                                <button
                                  onClick={() => handleEditMarkup(medicine.listings[0])}
                                  className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                  title="Edit Markup"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(medicine.id)}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                title="Delete Medicine"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
      </main>

      {/* Markup Edit Modal */}
      {showMarkupModal && selectedListing && (
        <MarkupInputModal
          isOpen={showMarkupModal}
          onClose={() => setShowMarkupModal(false)}
          onConfirm={confirmEditMarkup}
          title="Edit Listing Markup"
          defaultMarkup={selectedListing.adminMarkupPct}
          defaultMarkupType={selectedListing.adminMarkupType}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <ConfirmDialog
          title="Delete Medicine"
          message="Are you sure you want to delete this medicine? This will also delete all associated listings!"
          type="danger"
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDelete}
          onCancel={() => {
            setShowDeleteDialog(false);
            setMedicineToDelete(null);
          }}
        />
      )}

      {/* Mass Delete Confirmation Dialog */}
      {showMassDeleteDialog && (
        <ConfirmDialog
          title="Delete Multiple Medicines"
          message={`Are you sure you want to delete ${selectedMedicines.size} medicine(s)? This will also delete all associated listings!`}
          type="danger"
          confirmText="Delete All"
          cancelText="Cancel"
          onConfirm={confirmMassDelete}
          onCancel={() => setShowMassDeleteDialog(false)}
        />
      )}
    </div>
  );
}
