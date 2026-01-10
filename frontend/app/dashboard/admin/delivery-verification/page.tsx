'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FileText, CheckCircle, XCircle, ExternalLink, Package } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { showToast } from '@/lib/toast';

interface DeliveryRequest {
  id: string;
  qty: number;
  invoiceUrl: string;
  createdAt: string;
  requester: {
    id: string;
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
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
}

export default function DeliveryVerificationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<DeliveryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      const response = await fetch('/api/delivery-requests/pending-verification');
      
      if (!response.ok) {
        throw new Error('Failed to fetch pending verifications');
      }

      const data = await response.json();
      setRequests(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (requestId: string, approved: boolean) => {
    setProcessingId(requestId);
    try {
      const response = await fetch(`/api/delivery-requests/${requestId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approved,
          note: note || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to verify invoice');
      }

      // Refresh the list
      await fetchPendingRequests();
      setNote('');
      setSelectedRequest(null);
    } catch (err: any) {
      showToast.error(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout user={session?.user} title="Invoice Verification">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading pending verifications...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={session?.user} title="Invoice Verification">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Invoice Verification</h1>
          <p className="text-gray-600 mt-2">
            Review and verify seller invoices before dispatch
          </p>
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
              No Pending Verifications
            </h3>
            <p className="text-gray-600">
              All invoices have been verified. Check back later for new submissions.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {requests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {request.inventoryLot.medicine.name}
                    </h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        <span className="font-medium">Form:</span>{' '}
                        {request.inventoryLot.medicine.form}
                      </p>
                      <p>
                        <span className="font-medium">Strength:</span>{' '}
                        {request.inventoryLot.medicine.strength}
                      </p>
                      <p>
                        <span className="font-medium">Quantity:</span> {request.qty} units
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Pending Verification
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Seller Details</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>{request.inventoryLot.user.name}</p>
                      <p>{request.inventoryLot.user.email}</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Buyer Details</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>{request.requester.name}</p>
                      <p>{request.requester.email}</p>
                      <p>{request.requester.phone}</p>
                    </div>
                  </div>
                </div>

                {request.invoiceUrl && (
                  <div className="mb-4">
                    <a
                      href={request.invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"
                    >
                      <FileText size={20} />
                      View Invoice
                      <ExternalLink size={16} />
                    </a>
                  </div>
                )}

                {selectedRequest === request.id ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Verification Note (Optional)
                      </label>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Add any notes about this verification..."
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleVerify(request.id, true)}
                        disabled={processingId === request.id}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckCircle size={20} />
                        {processingId === request.id ? 'Processing...' : 'Approve & Dispatch'}
                      </button>
                      <button
                        onClick={() => handleVerify(request.id, false)}
                        disabled={processingId === request.id}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <XCircle size={20} />
                        {processingId === request.id ? 'Processing...' : 'Reject Invoice'}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedRequest(null);
                          setNote('');
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedRequest(request.id)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Review & Verify
                  </button>
                )}

                <div className="mt-4 text-xs text-gray-500">
                  Submitted: {new Date(request.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
