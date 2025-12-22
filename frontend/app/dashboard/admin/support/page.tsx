'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Clock,
  CheckCircle,
  MessageCircle,
  Send,
  CheckCheck,
  Bell,
  Search,
  LogOut,
  ArrowLeft,
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import Logo from '@/components/Logo';

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
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<string>('');
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [response, setResponse] = useState('');

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
    fetchTickets();
  }, [router, filter]);

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
      const url = filter ? `${apiUrl}/support?status=${filter}` : `${apiUrl}/support`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

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

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    router.push('/auth/login');
  };

  const handleRespond = async (ticketId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

      const res = await fetch(`${apiUrl}/support/${ticketId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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
      const token = localStorage.getItem('accessToken');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

      const res = await fetch(`${apiUrl}/support/${ticketId}/resolve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <Logo size="sm" href="/" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Admin - Support</span>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-lg mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tickets..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg
                           text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2
                           focus:ring-[var(--brand-blue)] focus:border-transparent"
                />
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <Link href="/dashboard/admin">
                <button className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors" title="Back to Dashboard">
                  <ArrowLeft className="w-5 h-5" />
                </button>
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Support Tickets</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage and respond to user support requests</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div>

        {/* Filter */}
        <div className="mb-6 flex gap-4">
          <button
            onClick={() => setFilter('')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === ''
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('OPEN')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === 'OPEN'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Open
          </button>
          <button
            onClick={() => setFilter('IN_PROGRESS')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === 'IN_PROGRESS'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            In Progress
          </button>
          <button
            onClick={() => setFilter('RESOLVED')}
            className={`px-4 py-2 rounded-lg transition ${
              filter === 'RESOLVED'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Resolved
          </button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {tickets.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <MessageCircle className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No Support Tickets
            </h3>
            <p className="text-gray-600 dark:text-gray-400">No tickets found with the selected filter.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(ticket.status)}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {ticket.subject}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        From: {ticket.user.name} ({ticket.user.email})
                      </p>
                      {ticket.deliveryRequest && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Related to: {ticket.deliveryRequest.inventoryLot.medicine.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                    {ticket.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Message:</p>
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    {ticket.message}
                  </p>
                </div>

                {ticket.adminResponse && (
                  <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-4">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                      Your Response:
                    </p>
                    <p className="text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
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
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
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

                <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                  Created: {new Date(ticket.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
        )}
      </main>
    </div>
  );
}
