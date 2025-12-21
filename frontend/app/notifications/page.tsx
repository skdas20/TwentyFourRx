'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Package,
  FileText,
  CheckCircle,
  AlertCircle,
  MessageCircle,
  TrendingUp,
  Clock,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

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
  const { data: session, status } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      setNotifications(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to mark as read');
      }

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
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to mark all as read');
      }

      setNotifications(prev =>
        prev.map(notif => ({ ...notif, isRead: true }))
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getNotificationIcon = (subject: string) => {
    if (subject.includes('Delivery') || subject.includes('Dispatch')) {
      return <Package className="text-blue-600" size={24} />;
    }
    if (subject.includes('Invoice')) {
      return <FileText className="text-purple-600" size={24} />;
    }
    if (subject.includes('Support')) {
      return <MessageCircle className="text-orange-600" size={24} />;
    }
    if (subject.includes('Approved')) {
      return <CheckCircle className="text-green-600" size={24} />;
    }
    if (subject.includes('Alert') || subject.includes('Price')) {
      return <TrendingUp className="text-red-600" size={24} />;
    }
    return <Bell className="text-gray-600" size={24} />;
  };

  const filteredNotifications = notifications.filter(notif =>
    filter === 'all' ? true : !notif.isRead
  );

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout user={session?.user} title="Notifications">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading notifications...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={session?.user} title="Notifications">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-600 mt-2">Stay updated with your latest activities</p>
          </div>
          {notifications.some(n => !n.isRead) && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Mark All as Read
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-4 mb-6 border-b">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 font-medium transition ${
              filter === 'all'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 font-medium transition ${
              filter === 'unread'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Unread ({notifications.filter(n => !n.isRead).length})
          </button>
        </div>

        {filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Bell className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {filter === 'unread' ? 'No Unread Notifications' : 'No Notifications'}
            </h3>
            <p className="text-gray-600">
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
                className={`bg-white rounded-lg shadow-sm border p-4 cursor-pointer transition hover:shadow-md ${
                  notification.isRead
                    ? 'border-gray-200'
                    : 'border-blue-200 bg-blue-50'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {getNotificationIcon(notification.subject)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-semibold text-gray-900">
                        {notification.subject}
                      </h3>
                      {!notification.isRead && (
                        <span className="flex-shrink-0 h-2 w-2 bg-blue-600 rounded-full mt-2"></span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                      {notification.body}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <Clock size={14} />
                      {new Date(notification.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
