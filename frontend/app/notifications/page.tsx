'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Bell,
  Package,
  FileText,
  CheckCircle,
  AlertCircle,
  MessageCircle,
  TrendingUp,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import { notificationsApi } from '@/lib/api';
import ThemeToggle from '@/components/ThemeToggle';
import Logo from '@/components/Logo';
import ProfileDropdown from '@/components/ProfileDropdown';

interface Notification {
  id: string;
  subject: string;
  body: string;
  channel: string;
  isRead: boolean;
  createdAt: string;
  meta?: any;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/auth/login');
      return;
    }
    setUser(JSON.parse(userData));
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await notificationsApi.getNotifications();
      setNotifications(response.data || []);
    } catch (err: any) {
      console.error('Failed to fetch notifications:', err);
      setError('Failed to load notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await notificationsApi.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
    } catch (err: any) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, isRead: true }))
      );
    } catch (err: any) {
      console.error('Error marking all as read:', err);
    }
  };

  const clearReadNotifications = async () => {
    const readNotifications = notifications.filter(n => n.isRead);
    if (readNotifications.length === 0) return;

    if (!confirm(`Delete ${readNotifications.length} read notification(s)?`)) return;

    try {
      await Promise.all(
        readNotifications.map(notif => notificationsApi.deleteNotification(notif.id))
      );
      setNotifications(prev => prev.filter(n => !n.isRead));
    } catch (err: any) {
      console.error('Error clearing read notifications:', err);
      setError('Failed to clear notifications. Please try again.');
    }
  };

  const getNotificationIcon = (subject: string) => {
    if (subject.includes('Delivery') || subject.includes('Dispatch')) {
      return <Package className="text-blue-600 dark:text-blue-400" size={24} />;
    }
    if (subject.includes('Invoice') || subject.includes('Order')) {
      return <FileText className="text-purple-600 dark:text-purple-400" size={24} />;
    }
    if (subject.includes('Support') || subject.includes('Requirement')) {
      return <MessageCircle className="text-orange-600 dark:text-orange-400" size={24} />;
    }
    if (subject.includes('Approved') || subject.includes('Success')) {
      return <CheckCircle className="text-green-600 dark:text-green-400" size={24} />;
    }
    if (subject.includes('Alert') || subject.includes('Price')) {
      return <TrendingUp className="text-red-600 dark:text-red-400" size={24} />;
    }
    return <Bell className="text-gray-600 dark:text-gray-400" size={24} />;
  };

  const filteredNotifications = notifications.filter(notif =>
    filter === 'all' ? true : !notif.isRead
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.back()}
                className="p-2 -ml-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Notifications</h1>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <ProfileDropdown user={user} />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2 p-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === 'all'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === 'unread'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Unread
            </button>
          </div>

          <div className="flex gap-3">
            {notifications.some(n => !n.isRead) && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Mark all as read
              </button>
            )}
            {notifications.some(n => n.isRead) && (
              <button
                onClick={clearReadNotifications}
                className="text-sm text-red-600 dark:text-red-400 hover:underline font-medium"
              >
                Clear read ({notifications.filter(n => n.isRead).length})
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {filteredNotifications.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Bell className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {filter === 'unread' ? 'No Unread Notifications' : 'No Notifications'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {filter === 'unread'
                ? "You're all caught up!"
                : "You don't have any notifications yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => !notification.isRead && markAsRead(notification.id)}
                className={`bg-white dark:bg-gray-800 rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${
                  notification.isRead
                    ? 'border-gray-200 dark:border-gray-700'
                    : 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.subject)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`text-base font-semibold ${notification.isRead ? 'text-gray-900 dark:text-white' : 'text-blue-700 dark:text-blue-300'}`}>
                        {notification.subject}
                      </h3>
                      {!notification.isRead && (
                        <span className="flex-shrink-0 h-2 w-2 bg-blue-600 rounded-full mt-2"></span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 whitespace-pre-wrap">
                      {notification.body}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <Clock size={14} />
                      {new Date(notification.createdAt).toLocaleString()}
                    </div>
                    
                    {/* Action Links */}
                    {notification.subject.includes('Delivery Request') && (
                      <div className="mt-3">
                        <Link
                          href="/dashboard/seller/deliveries"
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Package size={14} />
                          View Deliveries
                        </Link>
                      </div>
                    )}
                    {notification.subject.includes('Requirement') && (
                      <div className="mt-3">
                        <Link
                          href="/dashboard/seller/listings/new"
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <TrendingUp size={14} />
                          List Medicine
                        </Link>
                      </div>
                    )}
                    {notification.meta?.buyProposalId && user?.roleCode === 'ADMIN' && (
                      <div className="mt-3">
                        <Link
                          href="/dashboard/admin/buy-proposals"
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded hover:bg-purple-700 transition"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FileText size={14} />
                          Review Proposal
                        </Link>
                      </div>
                    )}
                    {notification.meta?.supportTicketId && (
                      <div className="mt-3">
                        <Link
                          href={user?.roleCode === 'ADMIN' ? "/dashboard/admin/support" : "/support"}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-600 text-white text-xs font-medium rounded hover:bg-orange-700 transition"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MessageCircle size={14} />
                          View Ticket
                        </Link>
                      </div>
                    )}
                    {notification.meta?.type === 'UPLOAD_INVOICE' && notification.meta?.buyProposalId && (
                      <div className="mt-3">
                        <Link
                          href={`/dashboard/seller/proposals/${notification.meta.buyProposalId}`}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FileText size={14} />
                          Upload Invoice
                        </Link>
                      </div>
                    )}
                    {(notification.meta?.type === 'PROPOSAL_SELLER_CONFIRMATION_REQUIRED' || notification.meta?.type === 'PROPOSAL_REMINDER') && (
                      <div className="mt-3">
                        <Link
                          href="/dashboard/seller/proposals"
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <CheckCircle size={14} />
                          Confirm Proposal
                        </Link>
                      </div>
                    )}
                    {(notification.meta?.type === 'PROPOSAL_SELLER_CONFIRMED' || notification.meta?.type === 'PROPOSAL_PI_GENERATED' || notification.meta?.type === 'PROPOSAL_QUANTITY_MODIFIED') && (
                      <div className="mt-3">
                        <Link
                          href="/dashboard/my-proposals"
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FileText size={14} />
                          {notification.meta?.type === 'PROPOSAL_PI_GENERATED' ? 'Complete Payment' : 'View Proposal'}
                        </Link>
                      </div>
                    )}
                    {/* Admin Links for Listing Management */}
                    {user?.roleCode === 'ADMIN' && (
                      <>
                        {(notification.meta?.listingId || notification.meta?.type === 'NEW_LISTING') && (
                          <div className="mt-3">
                            <Link href="/dashboard/admin/listings" className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition" onClick={(e) => e.stopPropagation()}>
                              <FileText size={14} /> Review Listing
                            </Link>
                          </div>
                        )}
                        {(notification.meta?.proposalId || notification.meta?.type === 'MEDICINE_PROPOSAL') && (
                          <div className="mt-3">
                            <Link href="/dashboard/admin/listings" className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 transition" onClick={(e) => e.stopPropagation()}>
                              <FileText size={14} /> Review Proposal
                            </Link>
                          </div>
                        )}
                        {(notification.meta?.bulkRequestId || notification.meta?.type === 'BULK_LISTING') && (
                          <div className="mt-3">
                            <Link href={`/dashboard/admin/bulk-listings/${notification.meta.bulkRequestId}`} className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded hover:bg-teal-700 transition" onClick={(e) => e.stopPropagation()}>
                              <FileText size={14} /> Review Bulk Request
                            </Link>
                          </div>
                        )}
                        {(notification.meta?.contributionId || notification.meta?.type === 'CONTRIBUTION') && (
                          <div className="mt-3">
                            <Link href="/dashboard/admin/contributions" className="inline-flex items-center gap-2 px-3 py-1.5 bg-cyan-600 text-white text-xs font-medium rounded hover:bg-cyan-700 transition" onClick={(e) => e.stopPropagation()}>
                              <FileText size={14} /> Review Contribution
                            </Link>
                          </div>
                        )}
                      </>
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