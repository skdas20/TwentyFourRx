'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Package, Upload, CheckCircle, Clock, Truck, Bell, Eye, XCircle, Pill, ArrowLeft } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import Logo from '@/components/Logo';
import ProfileDropdown from '@/components/ProfileDropdown';
import { showToast } from '@/lib/toast';

interface DeliveryRequest {
  id: string;
  qty: number;
  status: string;
  invoiceUrl: string | null;
  sellerInvoiceUrl: string | null;
  proformaInvoiceUrl: string | null;
  paymentReceiptUrl: string | null;
  packageImageUrl: string | null;
  batchNumber: string | null;
  expiryDate: string | null;
  parcelWeightKg: number | null;
  transportMode: string | null;
  deliveryCharge: number | null;
  createdAt: string;
  dispatchedAt: string | null;
  requester: {
    name: string;
    email: string;
    phone: string;
  };
  inventoryLot: {
    medicine: {
      name: string;
      form: string;
      strength: string;
    };
  };
}

export default function SellerDeliveriesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [requests, setRequests] = useState<DeliveryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ [key: string]: File | null }>({});
  const [selectedPackageImage, setSelectedPackageImage] = useState<{ [key: string]: File | null }>({});
  const [batchNumber, setBatchNumber] = useState<{ [key: string]: string }>({});
  const [expiryDate, setExpiryDate] = useState<{ [key: string]: string }>({});
  const [parcelWeight, setParcelWeight] = useState<{ [key: string]: string }>({});
  const [transportMode, setTransportMode] = useState<{ [key: string]: 'ROAD' | 'AIR' }>({});

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/auth/login');
      return;
    }
    const parsed = JSON.parse(userData);
    if (!['SELLER', 'TRADER'].includes(parsed.roleCode)) {
      router.push('/dashboard');
      return;
    }
    setUser(parsed);
    fetchMyRequests();
  }, [router]);

  const fetchMyRequests = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

      const response = await fetch(`${apiUrl}/delivery-requests/seller/my`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch delivery requests');
      }

      const data = await response.json();
      setRequests(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    router.push('/auth/login');
  };

  const handleFileChange = (requestId: string, file: File | null) => {
    setSelectedFile(prev => ({
      ...prev,
      [requestId]: file,
    }));
  };

  const handlePackageImageChange = (requestId: string, file: File | null) => {
    setSelectedPackageImage(prev => ({
      ...prev,
      [requestId]: file,
    }));
  };

  const handleProvideShippingDetails = async (requestId: string) => {
    const batch = batchNumber[requestId];
    const expiry = expiryDate[requestId];
    const weight = parcelWeight[requestId];
    const transport = transportMode[requestId];
    const packageImage = selectedPackageImage[requestId];

    if (!batch || !batch.trim()) {
      showToast.error('Please enter the batch number');
      return;
    }

    if (!expiry || !expiry.trim()) {
      showToast.error('Please enter the expiry date');
      return;
    }

    if (!weight || !weight.trim() || Number(weight) <= 0) {
      showToast.error('Please enter a valid parcel weight');
      return;
    }

    if (!transport) {
      showToast.error('Please select transport mode (ROAD or AIR)');
      return;
    }

    if (!packageImage) {
      showToast.error('Please upload package image');
      return;
    }

    setUploadingId(requestId);
    try {
      const token = localStorage.getItem('accessToken');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

      const formData = new FormData();
      formData.append('batchNumber', batch.trim());
      formData.append('expiryDate', expiry.trim());
      formData.append('parcelWeightKg', String(Number(weight.trim())));
      formData.append('transportMode', transport);
      formData.append('packageImage', packageImage);

      const response = await fetch(`${apiUrl}/delivery-requests/${requestId}/shipping-details`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to provide shipping details');
      }

      showToast.success('Shipping details submitted! Proforma invoice sent to buyer.');
      await fetchMyRequests();
      
      // Clear form
      setBatchNumber(prev => ({ ...prev, [requestId]: '' }));
      setExpiryDate(prev => ({ ...prev, [requestId]: '' }));
      setParcelWeight(prev => ({ ...prev, [requestId]: '' }));
      setTransportMode(prev => ({ ...prev, [requestId]: 'ROAD' }));
      setSelectedPackageImage(prev => ({ ...prev, [requestId]: null }));
    } catch (err: any) {
      showToast.error(err.message);
    } finally {
      setUploadingId(null);
    }
  };

  const handleUploadSellerInvoice = async (requestId: string) => {
    const file = selectedFile[requestId];

    if (!file) {
      showToast.error('Please select an invoice to upload');
      return;
    }

    setUploadingId(requestId);
    try {
      const token = localStorage.getItem('accessToken');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

      const formData = new FormData();
      formData.append('invoice', file);

      const response = await fetch(`${apiUrl}/delivery-requests/${requestId}/seller-invoice`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload invoice');
      }

      showToast.success('Invoice uploaded successfully! Awaiting admin dispatch.');
      await fetchMyRequests();
      setSelectedFile(prev => ({ ...prev, [requestId]: null }));
    } catch (err: any) {
      showToast.error(err.message);
    } finally {
      setUploadingId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'AWAITING_SELLER_INFO':
        return <Clock className="text-yellow-600" size={18} />;
      case 'AWAITING_PAYMENT':
        return <Clock className="text-orange-600" size={18} />;
      case 'PAYMENT_PENDING_VERIFICATION':
        return <Clock className="text-blue-600" size={18} />;
      case 'AWAITING_SELLER_INVOICE':
        return <Upload className="text-purple-600" size={18} />;
      case 'AWAITING_ADMIN_DISPATCH':
        return <Clock className="text-indigo-600" size={18} />;
      case 'AWAITING_COURIER_PICKUP':
      case 'DISPATCHED':
      case 'IN_TRANSIT':
      case 'OUT_FOR_DELIVERY':
        return <Truck className="text-blue-600" size={18} />;
      case 'DELIVERED':
        return <CheckCircle className="text-green-600" size={18} />;
      default:
        return <Package className="text-gray-600" size={18} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AWAITING_SELLER_INFO':
        return 'bg-yellow-50 text-yellow-700 border-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800/30';
      case 'AWAITING_PAYMENT':
        return 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/30';
      case 'PAYMENT_PENDING_VERIFICATION':
        return 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/30';
      case 'AWAITING_SELLER_INVOICE':
        return 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800/30';
      case 'AWAITING_ADMIN_DISPATCH':
        return 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800/30';
      case 'AWAITING_COURIER_PICKUP':
      case 'DISPATCHED':
      case 'IN_TRANSIT':
      case 'OUT_FOR_DELIVERY':
        return 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/30';
      case 'DELIVERED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/30';
      case 'REJECTED':
      case 'CANCELLED':
        return 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/30';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header - Modern Style */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-16 gap-2">
            <div className="flex items-center gap-3 sm:gap-8 flex-shrink-0">
              <Link href={`/dashboard/${user.roleCode.toLowerCase()}`} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <Logo size="sm" href="/" isLoggedIn={true} />
              <nav className="hidden lg:flex items-center gap-1 border-l border-gray-200 dark:border-gray-800 ml-4 pl-4">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">Delivery Requests</span>
              </nav>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
              <ThemeToggle />
              <ProfileDropdown user={user} />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">My Delivery Requests</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage and process physical delivery requests from buyers</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-sm text-gray-500">Fetching requests...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl mb-6 flex items-center gap-3">
            <XCircle className="w-5 h-5" />
            <p className="text-sm">{error}</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-800 p-16 text-center shadow-sm">
            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="text-gray-300 dark:text-gray-600" size={40} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              No Delivery Requests
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
              You don't have any active delivery requests to process at the moment.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {requests.map((request) => (
              <div
                key={request.id}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Status Bar */}
                <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-700/50 flex justify-between items-center bg-gray-50/50 dark:bg-gray-700/20">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(request.status)}`}>
                      {request.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400 font-medium">
                    Requested on {new Date(request.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    {/* Left: Medicine Info */}
                    <div className="flex gap-4">
                      <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center flex-shrink-0 border border-blue-100/50 dark:border-blue-800/30">
                        <Pill className="text-blue-600 dark:text-blue-400" size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                          {request.inventoryLot?.medicine?.name || 'Unknown Medicine'}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
                          <span>{request.inventoryLot?.medicine?.form || 'N/A'}</span>
                          <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></span>
                          <span>{request.inventoryLot?.medicine?.strength || 'N/A'}</span>
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-semibold text-gray-700 dark:text-gray-300">
                          <Package size={12} />
                          {request.qty} units
                        </div>
                      </div>
                    </div>

                    {/* Right: Buyer Details */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 min-w-[240px] border border-gray-100 dark:border-gray-700/30">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm">
                          <Bell size={12} className="text-blue-600" />
                        </div>
                        <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Buyer Info</h4>
                      </div>
                      <div className="space-y-2">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Name</span>
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{request.requester?.name || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Email / Phone</span>
                          <span className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[200px]">{request.requester?.email || 'N/A'}</span>
                          {request.requester?.phone && <span className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{request.requester.phone}</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Section */}
                  <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700/50">
                    {/* STEP 2: Seller provides shipping details */}
                    {request.status === 'AWAITING_SELLER_INFO' && (
                      <div className="bg-yellow-50/50 dark:bg-yellow-900/10 rounded-xl p-6 border border-yellow-100 dark:border-yellow-800/30">
                        <div className="flex items-center gap-2 mb-4">
                          <Package size={18} className="text-yellow-600" />
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white">Provide Shipping Details</h4>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
                          Please provide batch number, expiry date, parcel weight, transport mode, and package image.
                        </p>

                        <div className="space-y-4">
                          {/* Batch Number */}
                          <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                              Batch Number <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={batchNumber[request.id] || ''}
                              onChange={(e) => setBatchNumber(prev => ({ ...prev, [request.id]: e.target.value }))}
                              placeholder="Enter batch number"
                              className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                            />
                          </div>

                          {/* Expiry Date */}
                          <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                              Expiry Date <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="date"
                              value={expiryDate[request.id] || ''}
                              onChange={(e) => setExpiryDate(prev => ({ ...prev, [request.id]: e.target.value }))}
                              className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                            />
                          </div>

                          {/* Parcel Weight */}
                          <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                              Parcel Weight (KG) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={parcelWeight[request.id] || ''}
                              onChange={(e) => setParcelWeight(prev => ({ ...prev, [request.id]: e.target.value }))}
                              placeholder="Enter weight in kg"
                              className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                            />
                          </div>

                          {/* Transport Mode */}
                          <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                              Transport Mode <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                type="button"
                                onClick={() => setTransportMode(prev => ({ ...prev, [request.id]: 'ROAD' }))}
                                className={`px-4 py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                                  transportMode[request.id] === 'ROAD'
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-400'
                                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                🚚 ROAD (₹60/kg)
                              </button>
                              <button
                                type="button"
                                onClick={() => setTransportMode(prev => ({ ...prev, [request.id]: 'AIR' }))}
                                className={`px-4 py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                                  transportMode[request.id] === 'AIR'
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-400'
                                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                ✈️ AIR (₹120/kg)
                              </button>
                            </div>
                          </div>

                          {/* Package Image Upload */}
                          <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                              Package Photo <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <input
                                type="file"
                                accept=".jpg,.jpeg,.png"
                                onChange={(e) => handlePackageImageChange(request.id, e.target.files?.[0] || null)}
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                              />
                              <div className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-center hover:border-yellow-400 dark:hover:border-yellow-500 transition-colors">
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  {selectedPackageImage[request.id]?.name || 'Click to upload package photo'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Submit Button */}
                          <button
                            onClick={() => handleProvideShippingDetails(request.id)}
                            disabled={
                              !batchNumber[request.id] ||
                              !expiryDate[request.id] ||
                              !parcelWeight[request.id] ||
                              !transportMode[request.id] ||
                              !selectedPackageImage[request.id] ||
                              uploadingId === request.id
                            }
                            className="w-full px-8 py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-yellow-600/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                          >
                            {uploadingId === request.id ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Submitting...
                              </>
                            ) : (
                              <>
                                <CheckCircle size={18} />
                                Submit Shipping Details
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* STEP 5: Seller uploads invoice after payment verified */}
                    {request.status === 'AWAITING_SELLER_INVOICE' && (
                      <div className="bg-purple-50/50 dark:bg-purple-900/10 rounded-xl p-6 border border-purple-100 dark:border-purple-800/30">
                        <div className="flex items-center gap-2 mb-4">
                          <Upload size={18} className="text-purple-600" />
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white">Upload Your Invoice</h4>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
                          Payment has been verified. Please upload your invoice to 24Rx.
                        </p>

                        <div className="space-y-4">
                          {/* Invoice Upload */}
                          <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                              Your Invoice <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => handleFileChange(request.id, e.target.files?.[0] || null)}
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                              />
                              <div className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-center hover:border-purple-400 dark:hover:border-purple-500 transition-colors">
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  {selectedFile[request.id]?.name || 'Click to select or drag & drop'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Submit Button */}
                          <button
                            onClick={() => handleUploadSellerInvoice(request.id)}
                            disabled={!selectedFile[request.id] || uploadingId === request.id}
                            className="w-full px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-600/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                          >
                            {uploadingId === request.id ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Uploading...
                              </>
                            ) : (
                              <>
                                <CheckCircle size={18} />
                                Upload Invoice
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Other statuses - just show info */}
                    {request.status === 'AWAITING_PAYMENT' && (
                      <div className="bg-orange-50 dark:bg-orange-900/10 rounded-xl p-4 border border-orange-100 dark:border-orange-800/30">
                        <div className="flex items-center gap-3">
                          <Clock size={18} className="text-orange-600" />
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">Awaiting Buyer Payment</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Proforma invoice sent to buyer. Waiting for payment.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {request.status === 'PAYMENT_PENDING_VERIFICATION' && (
                      <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-4 border border-blue-100 dark:border-blue-800/30">
                        <div className="flex items-center gap-3">
                          <Clock size={18} className="text-blue-600" />
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">Payment Under Verification</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Buyer uploaded payment receipt. Admin is verifying.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {request.status === 'AWAITING_ADMIN_DISPATCH' && (
                      <div className="bg-indigo-50 dark:bg-indigo-900/10 rounded-xl p-4 border border-indigo-100 dark:border-indigo-800/30">
                        <div className="flex items-center gap-3">
                          <Clock size={18} className="text-indigo-600" />
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">Awaiting Admin Dispatch</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Your invoice uploaded. Admin will dispatch soon.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {(request.status === 'AWAITING_COURIER_PICKUP' || request.status === 'DISPATCHED' || request.status === 'IN_TRANSIT' || request.status === 'OUT_FOR_DELIVERY') && (
                      <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-4 border border-blue-100 dark:border-blue-800/30">
                        <div className="flex items-center gap-3">
                          <Truck size={18} className="text-blue-600" />
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">In Transit</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Order is being delivered by courier partner.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {request.status === 'DELIVERED' && (
                      <div className="bg-green-50 dark:bg-green-900/10 rounded-xl p-4 border border-green-100 dark:border-green-800/30">
                        <div className="flex items-center gap-3">
                          <CheckCircle size={18} className="text-green-600" />
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">Delivered Successfully</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Order delivered on {new Date(request.dispatchedAt!).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
