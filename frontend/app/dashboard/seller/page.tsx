"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Package, TrendingUp, FileText, AlertCircle, Loader2, Clock } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { listingsApi, ordersApi } from "@/lib/api";

export default function SellerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/auth/login");
      return;
    }
    const parsed = JSON.parse(userData);
    if (parsed.roleCode !== "SELLER" && parsed.roleCode !== "TRADER") {
      router.push("/auth/login");
      return;
    }
    setUser(parsed);
    loadDashboardData();
  }, [router]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [listingsRes, ordersRes] = await Promise.all([
        listingsApi.getMyListings(),
        ordersApi.getMyOrders(),
      ]);
      setListings(listingsRes.data.slice(0, 4));
      setOrders(ordersRes.data.slice(0, 4));
    } catch (err: any) {
      setError("Failed to load dashboard data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const activeListings = listings.filter((l: any) => l.status === "ACTIVE").length;
  const pendingListings = listings.filter((l: any) => l.status === "PENDING").length;

  return (
    <DashboardLayout user={user} title="Dashboard" navLinks={[{ href: "/news", label: "News" }]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-[var(--ink)]">Welcome back, {user.name}</h2>
            <p className="text-[var(--muted)] mt-1">Your business dashboard</p>
          </div>
          <Link href="/listings/new" className="flex items-center gap-2 px-4 py-2 bg-[var(--brand-blue)] text-white rounded-lg hover:bg-[var(--brand-blue-hi)] transition font-semibold text-sm shadow-lg shadow-[var(--brand-blue)]/25">
            <Plus className="w-4 h-4" />
            New Listing
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 text-[var(--brand-blue)] animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-6 border border-[var(--brand-blue)]/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-[var(--brand-blue)]" />
                  <div className="text-sm text-[var(--muted)] font-medium">Revenue</div>
                </div>
                <div className="text-3xl font-bold text-[var(--ink)]">₹0</div>
              </div>
              <div className="bg-white rounded-xl p-6 border border-[var(--border)] shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-5 h-5 text-[var(--brand-blue)]" />
                  <div className="text-sm text-[var(--muted)] font-medium">Orders</div>
                </div>
                <div className="text-3xl font-bold text-[var(--ink)]">{orders.length}</div>
              </div>
              <div className="bg-white rounded-xl p-6 border border-[var(--border)] shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-5 h-5 text-[var(--brand-blue)]" />
                  <div className="text-sm text-[var(--muted)] font-medium">Active</div>
                </div>
                <div className="text-3xl font-bold text-[var(--ink)]">{activeListings}</div>
              </div>
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 rounded-xl p-6 border border-yellow-300/30">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  <div className="text-sm text-[var(--muted)] font-medium">Pending</div>
                </div>
                <div className="text-3xl font-bold text-yellow-600">{pendingListings}</div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100/30 rounded-xl p-6 border border-[var(--brand-blue)]/20">
              <h3 className="text-lg font-semibold text-[var(--ink)] mb-3">Getting Started</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/80 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-[var(--brand-blue)] text-white flex items-center justify-center font-bold">1</div>
                    <h4 className="font-semibold text-[var(--ink)]">Create Listings</h4>
                  </div>
                  <p className="text-sm text-[var(--muted)]">Search from 251K+ medicines</p>
                </div>
                <div className="bg-white/80 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-[var(--brand-blue)] text-white flex items-center justify-center font-bold">2</div>
                    <h4 className="font-semibold text-[var(--ink)]">Admin Approval</h4>
                  </div>
                  <p className="text-sm text-[var(--muted)]">Wait for review</p>
                </div>
                <div className="bg-white/80 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-[var(--brand-blue)] text-white flex items-center justify-center font-bold">3</div>
                    <h4 className="font-semibold text-[var(--ink)]">Start Trading</h4>
                  </div>
                  <p className="text-sm text-[var(--muted)]">Receive orders</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
