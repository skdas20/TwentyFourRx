'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Package, Upload, CheckCircle, Clock, Truck } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

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
  const { data: session, status } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<DeliveryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ [key: string]: File | null }>({});

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated' && !['SELLER', 'TRADER'].includes(session?.user?.role || '')) {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  useEffect(() => {
    fetchMyRequests();
  }, []);

  const fetchMyRequests = async () => {
    try {
      const response = await fetch('/api/delivery-requests/my');
      
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

  const handleFileChange = (requestId: string, file: File | null) => {
    setSelectedFile(prev => ({
      ...prev,
      [requestId]: file,
    }));
  };

  const handleDispatch = async (requestId: string) => {
    const file = selectedFile[requestId];
    
    if (!file) {
      alert('Please select an invoice file to upload');
      return;
    }

    setUploadingId(requestId);
    try {
      const formData = new FormData();
      formData.append('invoice', file);

      const response = await fetch(`/api/delivery-requests/${requestId}/dispatch`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to dispatch');
      }

      alert('Invoice uploaded successfully! Awaiting admin verification.');
      await fetchMyRequests();
      setSelectedFile(prev => ({
        ...prev,
        [requestId]: null,
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
        return <Clock className="text-yellow-600" size={20} />;
      case 'APPROVED':
        return <CheckCircle className="text-green-600" size={20} />;
      case 'DISPATCHED':
        return <Truck className="text-blue-600" size={20} />;
      case 'DELIVERED':
        return <CheckCircle className="text-green-600" size={20} />;
      default:
        return <Package className="text-gray-600" size={20} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'DISPATCHED':
        return 'bg-blue-100 text-blue-800';
      case 'DELIVERED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading delivery requests...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Delivery Requests</h1>
          <p className="text-gray-600 mt-2">Manage and dispatch your approved delivery requests</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Package className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Delivery Requests
            </h3>
            <p className="text-gray-600">
              You don't have any delivery requests yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(request.status)}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {request.inventoryLot.medicine.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {request.inventoryLot.medicine.form} | {request.inventoryLot.medicine.strength}
                      </p>
                      <p className="text-sm text-gray-600">Quantity: {request.qty} units</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                    {request.status}
                  </span>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Buyer Details</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><span className="font-medium">Name:</span> {request.requester.name}</p>
                    <p><span className="font-medium">Email:</span> {request.requester.email}</p>
                    <p><span className="font-medium">Phone:</span> {request.requester.phone}</p>
                  </div>
                </div>

                {request.status === 'APPROVED' && !request.invoiceUrl && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Upload Invoice (PDF, JPG, PNG)
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange(request.id, e.target.files?.[0] || null)}
                        className="block w-full text-sm text-gray-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-lg file:border-0
                          file:text-sm file:font-semibold
                          file:bg-blue-50 file:text-blue-700
                          hover:file:bg-blue-100
                          cursor-pointer"
                      />
                    </div>
                    <button
                      onClick={() => handleDispatch(request.id)}
                      disabled={!selectedFile[request.id] || uploadingId === request.id}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Upload size={20} />
                      {uploadingId === request.id ? 'Uploading...' : 'Upload Invoice & Confirm Dispatch'}
                    </button>
                  </div>
                )}

                {request.invoiceUrl && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900 mb-2">
                      ✓ Invoice uploaded - Awaiting admin verification
                    </p>
                    <a
                      href={request.invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      View Invoice
                    </a>
                  </div>
                )}

                {request.status === 'DISPATCHED' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-900">
                      ✓ Order dispatched on {new Date(request.dispatchedAt!).toLocaleString()}
                    </p>
                    <p className="text-sm text-green-800 mt-1">
                      OTP sent to buyer for delivery confirmation
                    </p>
                  </div>
                )}

                <div className="mt-4 text-xs text-gray-500">
                  Created: {new Date(request.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
