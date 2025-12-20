'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Clock,
  CheckCircle,
  MessageCircle,
  Send,
  CheckCheck,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status: string;
  adminResponse: string | null;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
  deliveryRequest?: {
    id: string;
    inventoryLot: {
      medicine: {
        name: string;
      };
    };
  };
}

export default function AdminSupportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<string>('');
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [response, setResponse] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  useEffect(() => {
    fetchTickets();
  }, [filter]);

  const fetchTickets = async () => {
    try {
      const url = filter ? `/api/support?status=${filter}` : '/api/support';
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch tickets');
      }

      const data = await response.json();
      setTickets(data.tickets || data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/support/${ticketId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminResponse: response }),
      });

      if (!res.ok) {
        throw new Error('Failed to respond to ticket');
      }

      setResponse('');
      setRespondingTo(null);
      fetchTickets();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResolve = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/support/${ticketId}/resolve`, {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error('Failed to resolve ticket');
      }

      fetchTickets();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Clock className="text-yellow-600" size={20} />;
      case 'IN_PROGRESS':
        return <MessageCircle className="text-blue-600" size={20} />;
      case 'RESOLVED':
        return <CheckCircle className="text-green-600" size={20} />;
      default:
        return null;
    }
  };

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading support tickets...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Support Tickets</h1>
          <p className="text-gray-600 mt-2">Manage and respond to user support requests</p>
        </div>

        {/* Filter */}
        <div className="mb-6 flex gap-4">
          <button
            onClick={() => setFilter('')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === ''
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('OPEN')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === 'OPEN'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Open
          </button>
          <button
            onClick={() => setFilter('IN_PROGRESS')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === 'IN_PROGRESS'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            In Progress
          </button>
          <button
            onClick={() => setFilter('RESOLVED')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === 'RESOLVED'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Resolved
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {tickets.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <MessageCircle className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Support Tickets
            </h3>
            <p className="text-gray-600">No tickets found with the selected filter.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(ticket.status)}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {ticket.subject}
                      </h3>
                      <p className="text-sm text-gray-600">
                        From: {ticket.user.name} ({ticket.user.email})
                      </p>
                      {ticket.deliveryRequest && (
                        <p className="text-sm text-gray-600">
                          Related to: {ticket.deliveryRequest.inventoryLot.medicine.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {ticket.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Message:</p>
                  <p className="text-gray-600 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                    {ticket.message}
                  </p>
                </div>

                {ticket.adminResponse && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm font-medium text-blue-900 mb-2">
                      Your Response:
                    </p>
                    <p className="text-blue-800 whitespace-pre-wrap">
                      {ticket.adminResponse}
                    </p>
                  </div>
                )}

                <div className="flex gap-3 mt-4">
                  {ticket.status !== 'RESOLVED' && (
                    <>
                      {respondingTo === ticket.id ? (
                        <div className="flex-1 flex gap-2">
                          <textarea
                            value={response}
                            onChange={(e) => setResponse(e.target.value)}
                            placeholder="Type your response..."
                            rows={3}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => handleRespond(ticket.id)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                            >
                              <Send size={16} /> Send
                            </button>
                            <button
                              onClick={() => {
                                setRespondingTo(null);
                                setResponse('');
                              }}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => setRespondingTo(ticket.id)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                          >
                            <MessageCircle size={16} /> Respond
                          </button>
                          <button
                            onClick={() => handleResolve(ticket.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                          >
                            <CheckCheck size={16} /> Mark Resolved
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>

                <div className="mt-4 text-xs text-gray-500">
                  Created: {new Date(ticket.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
