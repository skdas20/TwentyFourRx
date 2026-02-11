"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Check, X, TrendingDown, TrendingUp, Package, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  subject: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  meta?: {
    type?: string;
    medicineId?: string;
    proposalId?: string;
    buyProposalId?: string;
  };
}

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await api.get("/notifications");
      const notifs = response.data;
      console.log("🔍 Loaded notifications:", notifs); // DEBUG
      setNotifications(notifs.slice(0, 10)); // Show latest 10
      setUnreadCount(notifs.filter((n: Notification) => !n.isRead).length);
    } catch (error) {
      // Silently fail - don't show error toast on background refresh
      console.error("Failed to load notifications:", error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(notifications.map(n =>
        n.id === id ? { ...n, isRead: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      toast.error("Failed to mark as read");
    }
  };

  const markAllAsRead = async () => {
    try {
      setLoading(true);
      await api.post("/notifications/mark-all-read");
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error("Failed to mark all as read");
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case "PRICE_ALERT":
        return <TrendingDown className="w-5 h-5 text-[var(--brand-blue)]" />;
      case "ORDER_UPDATE":
      case "PROPOSAL_SELLER_CONFIRMATION_REQUIRED":
      case "PROPOSAL_REMINDER":
        return <Package className="w-5 h-5 text-[var(--brand-blue)]" />;
      case "SYSTEM":
        return <AlertCircle className="w-5 h-5 text-[var(--muted)]" />;
      default:
        return <Bell className="w-5 h-5 text-[var(--muted)]" />;
    }
  };

  const getNotificationAction = (notif: Notification) => {
    const type = notif.meta?.type;
    console.log("🔍 Checking notification action for:", { id: notif.id, type, meta: notif.meta }); // DEBUG

    if (type === "PROPOSAL_SELLER_CONFIRMATION_REQUIRED" || type === "PROPOSAL_REMINDER") {
      console.log("✅ Found seller confirmation notification!"); // DEBUG
      return {
        label: "Confirm Proposal",
        href: "/dashboard/seller/proposals",
      };
    }

    if (type === "UPLOAD_INVOICE" && notif.meta?.buyProposalId) {
      return {
        label: "Upload Invoice",
        href: `/dashboard/seller/proposals/${notif.meta.buyProposalId}`,
      };
    }

    if (type === "PROPOSAL_QUANTITY_MODIFIED" || type === "PROPOSAL_SELLER_CONFIRMED") {
      return {
        label: "View Proposal",
        href: "/dashboard/my-proposals",
      };
    }

    if (type === "PROPOSAL_PI_GENERATED") {
      return {
        label: "Complete Payment",
        href: "/dashboard/my-proposals",
      };
    }

    console.log("❌ No action for this notification type"); // DEBUG
    return null;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-[var(--surface)]/50 rounded-lg transition-colors"
        title="Notifications"
      >
        <Bell className="w-6 h-6 text-[var(--ink)]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-[var(--border)]/20 overflow-hidden z-50">
          {/* Header */}
          <div className="p-4 border-b border-[var(--border)]/10 flex items-center justify-between bg-[var(--surface)]/30">
            <div>
              <h3 className="font-semibold text-[var(--ink)]">Notifications</h3>
              <p className="text-xs text-[var(--muted)]">
                {unreadCount} unread
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                disabled={loading}
                className="text-xs text-[var(--brand-blue)] hover:text-[var(--brand-blue-hi)] font-semibold flex items-center gap-1 disabled:opacity-50"
              >
                <Check className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-[var(--muted)]/40 mx-auto mb-3" />
                <p className="text-[var(--muted)]">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 border-b border-[var(--border)]/10 hover:bg-[var(--surface)]/20 transition-colors cursor-pointer ${
                    !notif.isRead ? "bg-blue-50/30" : ""
                  }`}
                  onClick={() => {
                    if (!notif.isRead) markAsRead(notif.id);
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="mt-0.5">
                      {getNotificationIcon(notif.meta?.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className={`text-sm font-semibold ${
                          !notif.isRead ? "text-[var(--ink)]" : "text-[var(--muted)]"
                        }`}>
                          {notif.subject}
                        </h4>
                        {!notif.isRead && (
                          <div className="w-2 h-2 bg-[var(--brand-blue)] rounded-full flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-sm text-[var(--muted)] mb-2 line-clamp-2">
                        {notif.body}
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-[var(--muted)]/70">
                          {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                        </p>
                        {(() => {
                          const action = getNotificationAction(notif);
                          if (action) {
                            return (
                              <a
                                href={action.href}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsOpen(false);
                                }}
                                className="text-xs font-semibold text-white bg-[var(--brand-blue)] hover:bg-[var(--brand-blue-hi)] px-3 py-1.5 rounded-lg transition-colors"
                              >
                                {action.label}
                              </a>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-[var(--border)]/10 bg-[var(--surface)]/20 text-center">
              <button
                onClick={() => {
                  setIsOpen(false);
                  // Navigate to full notifications page (create this later)
                }}
                className="text-sm text-[var(--brand-blue)] hover:text-[var(--brand-blue-hi)] font-semibold"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
