'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Package, Upload, CheckCircle, Clock, Truck, Bell, Eye, XCircle, Pill, ArrowLeft } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import Logo from '@/components/Logo';
import ProfileDropdown from '@/components/ProfileDropdown';

interface DeliveryRequest {
  id: string;
  qty: number;
  status: string;
  invoiceUrl: string | null;
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
  const [trackingNumber, setTrackingNumber] = useState<{ [key: string]: string }>({});
  const [deliveryPartner, setDeliveryPartner] = useState<{ [key: string]: string }>({});

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

      const response = await fetch(`${apiUrl}/delivery-requests/my`, {
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

  const handleDispatch = async (requestId: string) => {
    const file = selectedFile[requestId];
    const tracking = trackingNumber[requestId];
    const partner = deliveryPartner[requestId];

    if (!file) {
      alert('Please select a courier invoice/document to upload');
      return;
    }

    if (!tracking || !tracking.trim()) {
      alert('Please enter the tracking number');
      return;
    }

    if (!partner || !partner.trim()) {
      alert('Please enter the delivery partner name');
      return;
    }

    setUploadingId(requestId);
    try {
      const token = localStorage.getItem('accessToken');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

      const formData = new FormData();
      formData.append('invoice', file);
      formData.append('trackingNumber', tracking.trim());
      formData.append('deliveryPartner', partner.trim());

      const response = await fetch(`${apiUrl}/delivery-requests/${requestId}/dispatch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to confirm dispatch');
      }

      alert('Dispatch confirmed! Request sent to admin for approval.');
      await fetchMyRequests();
      setSelectedFile(prev => ({
        ...prev,
        [requestId]: null,
      }));
      setTrackingNumber(prev => ({
        ...prev,
        [requestId]: '',
      }));
      setDeliveryPartner(prev => ({
        ...prev,
        [requestId]: '',
      }));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploadingId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="text-yellow-600" size={18} />;
      case 'APPROVED':
        return <CheckCircle className="text-green-600" size={18} />;
      case 'DISPATCHED':
        return <Truck className="text-blue-600" size={18} />;
      case 'DELIVERED':
        return <CheckCircle className="text-green-600" size={18} />;
      default:
        return <Package className="text-gray-600" size={18} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-50 text-yellow-700 border-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800/30';
      case 'APPROVED':
        return 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/30';
      case 'DISPATCHED':
        return 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/30';
      case 'DELIVERED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/30';
      case 'REJECTED':
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
                    {request.status === 'AWAITING_SELLER' && !request.invoiceUrl ? (
                      <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-xl p-6 border border-blue-100 dark:border-blue-800/30">
                        <div className="flex items-center gap-2 mb-4">
                          <Upload size={18} className="text-blue-600" />
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white">Dispatch Details</h4>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
                          Please provide tracking information and upload the courier invoice to confirm this delivery.
                        </p>

                        <div className="space-y-4">
                          {/* Tracking Number */}
                          <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                              Tracking Number <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={trackingNumber[request.id] || ''}
                              onChange={(e) => setTrackingNumber(prev => ({ ...prev, [request.id]: e.target.value }))}
                              placeholder="Enter tracking number"
                              className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          {/* Delivery Partner */}
                          <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                              Delivery Partner <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={deliveryPartner[request.id] || ''}
                              onChange={(e) => setDeliveryPartner(prev => ({ ...prev, [request.id]: e.target.value }))}
                              placeholder="e.g., Blue Dart, DTDC, FedEx"
                              className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          {/* Courier Invoice Upload */}
                          <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                              Courier Invoice <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => handleFileChange(request.id, e.target.files?.[0] || null)}
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                              />
                              <div className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  {selectedFile[request.id]?.name || 'Click to select or drag & drop'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Submit Button */}
                          <button
                            onClick={() => handleDispatch(request.id)}
                            disabled={!selectedFile[request.id] || !trackingNumber[request.id] || !deliveryPartner[request.id] || uploadingId === request.id}
                            className="w-full px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                          >
                            {uploadingId === request.id ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Uploading...
                              </>
                            ) : (
                              <>
                                <CheckCircle size={18} />
                                Confirm Dispatch
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : request.invoiceUrl ? (
                      <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/10 rounded-xl p-4 border border-green-100 dark:border-green-800/30">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm">
                            <CheckCircle size={18} className="text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">Documents Uploaded</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Awaiting final admin verification</p>
                          </div>
                        </div>
                        <a
                          href={request.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-white dark:bg-gray-800 text-xs font-bold text-blue-600 dark:text-blue-400 rounded-lg border border-blue-100 dark:border-blue-800/30 hover:bg-blue-50 transition-colors flex items-center gap-2"
                        >
                          <Eye size={14} />
                          View Proof
                        </a>
                      </div>
                    ) : request.status === 'DISPATCHED' ? (
                      <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-4 border border-blue-100 dark:border-blue-800/30 flex items-center gap-4">
                        <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm">
                          <Truck size={18} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">Order Dispatched</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Dispatched on {new Date(request.dispatchedAt!).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 font-medium italic">
                        {request.status === 'PENDING' ? 'Waiting for admin to approve the delivery request...' : 'No actions required at this stage.'}
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
