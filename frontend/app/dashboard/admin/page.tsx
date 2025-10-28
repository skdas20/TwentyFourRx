"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Package, TrendingUp, Clock, CheckCircle, XCircle, Activity, Pill, Newspaper, Settings, BarChart3 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

// Demo data
const PENDING_USERS = [
  { id: 1, name: "Rajesh Medicals Pvt Ltd", email: "rajesh@medicals.com", role: "SELLER", kycDocs: 8, createdAt: "2025-10-28" },
  { id: 2, name: "Mumbai Pharma Traders", email: "info@mumbaitrade.com", role: "TRADER", kycDocs: 6, createdAt: "2025-10-27" },
  { id: 3, name: "Delhi HealthCare Supply", email: "delhi@healthcare.com", role: "SELLER", kycDocs: 9, createdAt: "2025-10-26" },
];

const PENDING_LISTINGS = [
  { id: 1, medicine: "Pantoprazole 40mg", seller: "MedSupply Inc", basePrice: 24, proposedMarkup: 15, createdAt: "2025-10-28" },
  { id: 2, medicine: "Losartan 50mg", seller: "PharmaTrade Ltd", basePrice: 32, proposedMarkup: 12, createdAt: "2025-10-27" },
  { id: 3, medicine: "Amlodipine 5mg", seller: "HealthFirst Co", basePrice: 38, proposedMarkup: 18, createdAt: "2025-10-26" },
];

const PLATFORM_STATS = {
  totalUsers: 1247,
  activeListings: 3456,
  todayOrders: 89,
  todayRevenue: 2340000,
  pendingUsers: 3,
  pendingListings: 3,
};

const TOP_MEDICINES = [
  { id: 1, name: "Paracetamol 500mg", totalVolume: 125000, revenue: 3125000 },
  { id: 2, name: "Amoxicillin 250mg", totalVolume: 98000, revenue: 2744000 },
  { id: 3, name: "Cetirizine 10mg", totalVolume: 87500, revenue: 1750000 },
  { id: 4, name: "Metformin 500mg", totalVolume: 76000, revenue: 2280000 },
];

const RECENT_ACTIVITIES = [
  { id: 1, type: "USER_APPROVED", message: "Approved seller: PharmaCorp Ltd", time: "5 mins ago" },
  { id: 2, type: "LISTING_APPROVED", message: "Approved listing: Azithromycin 500mg", time: "15 mins ago" },
  { id: 3, type: "NEWS_PUBLISHED", message: "Published: New Import Regulations", time: "1 hour ago" },
  { id: 4, type: "USER_BLOCKED", message: "Blocked trader: Suspicious Activity", time: "2 hours ago" },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/auth/login");
      return;
    }
    const parsed = JSON.parse(userData);
    if (parsed.role !== "ADMIN") {
      router.push("/auth/login");
      return;
    }
    setUser(parsed);
  }, [router]);

  if (!user) return null;

  return (
    <DashboardLayout
      user={user}
      title="Admin Dashboard"
      navLinks={[
        { href: "/medicines", label: "Medicines" },
        { href: "/news", label: "News" },
      ]}
    >
      <h2 className="text-3xl font-bold text-deep-navy font-space mb-8">Platform Overview</h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 border border-slate/10 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-gold" />
            <div className="text-xs text-slate">Total Users</div>
          </div>
          <div className="text-2xl font-bold text-deep-navy">{PLATFORM_STATS.totalUsers}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate/10 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-gold" />
            <div className="text-xs text-slate">Active Listings</div>
          </div>
          <div className="text-2xl font-bold text-deep-navy">{PLATFORM_STATS.activeListings}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate/10 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-gold" />
            <div className="text-xs text-slate">Today Orders</div>
          </div>
          <div className="text-2xl font-bold text-deep-navy">{PLATFORM_STATS.todayOrders}</div>
        </div>
        <div className="bg-gradient-to-br from-gold/10 to-gold/5 rounded-xl p-4 border border-gold/20">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-gold" />
            <div className="text-xs text-slate">Today Revenue</div>
          </div>
          <div className="text-xl font-bold text-gold">₹{(PLATFORM_STATS.todayRevenue / 100000).toFixed(1)}L</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 rounded-xl p-4 border border-yellow-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-yellow-600" />
            <div className="text-xs text-slate">Pending Users</div>
          </div>
          <div className="text-2xl font-bold text-yellow-600">{PLATFORM_STATS.pendingUsers}</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 rounded-xl p-4 border border-yellow-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-yellow-600" />
            <div className="text-xs text-slate">Pending Listings</div>
          </div>
          <div className="text-2xl font-bold text-yellow-600">{PLATFORM_STATS.pendingListings}</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Pending User Approvals */}
        <div className="bg-white rounded-2xl p-6 border border-slate/10 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-gold" />
            <h3 className="text-xl font-semibold text-deep-navy">Pending User Approvals</h3>
          </div>
          <div className="space-y-3">
            {PENDING_USERS.map((pendingUser) => (
              <div key={pendingUser.id} className="p-4 bg-cloud-gray/30 rounded-xl border border-slate/10">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-deep-navy">{pendingUser.name}</p>
                    <p className="text-sm text-slate">{pendingUser.email}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gold/10 text-gold">
                    {pendingUser.role}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate">{pendingUser.kycDocs} KYC docs • {pendingUser.createdAt}</span>
                  <div className="flex gap-2">
                    <button className="p-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 transition-colors">
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition-colors">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Listing Approvals */}
        <div className="bg-white rounded-2xl p-6 border border-slate/10 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Package className="w-5 h-5 text-gold" />
            <h3 className="text-xl font-semibold text-deep-navy">Pending Listing Approvals</h3>
          </div>
          <div className="space-y-3">
            {PENDING_LISTINGS.map((listing) => (
              <div key={listing.id} className="p-4 bg-cloud-gray/30 rounded-xl border border-slate/10">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-deep-navy">{listing.medicine}</p>
                    <p className="text-sm text-slate">{listing.seller}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3 text-sm">
                  <div>
                    <span className="text-slate">Base:</span>
                    <span className="text-deep-navy ml-1 font-medium">₹{listing.basePrice}</span>
                  </div>
                  <div>
                    <span className="text-slate">Markup:</span>
                    <input
                      type="number"
                      defaultValue={listing.proposedMarkup}
                      className="w-12 ml-1 bg-white text-gold px-1 py-0.5 rounded border border-gold/30 text-xs font-semibold"
                    />
                    <span className="text-gold text-xs">%</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate">List:</span>
                    <span className="text-gold ml-1 font-semibold">₹{(listing.basePrice * (1 + listing.proposedMarkup / 100)).toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate">{listing.createdAt}</span>
                  <div className="flex gap-2">
                    <button className="p-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 transition-colors">
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition-colors">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Medicines */}
        <div className="bg-white rounded-2xl p-6 border border-slate/10 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-gold" />
            <h3 className="text-xl font-semibold text-deep-navy">Top Medicines (30 days)</h3>
          </div>
          <div className="space-y-3">
            {TOP_MEDICINES.map((med, idx) => (
              <Link
                key={med.id}
                href={`/medicines/${med.id}`}
                className="block p-4 bg-cloud-gray/30 rounded-xl hover:bg-cloud-gray/50 transition-all border border-transparent hover:border-gold/20"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center">
                    <span className="text-gold font-bold text-sm">#{idx + 1}</span>
                  </div>
                  <p className="font-semibold text-deep-navy flex-1">{med.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-slate">Volume:</span>
                    <span className="text-deep-navy ml-1 font-medium">{med.totalVolume.toLocaleString()} units</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate">Revenue:</span>
                    <span className="text-gold ml-1 font-semibold">₹{(med.revenue / 100000).toFixed(1)}L</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-2xl p-6 border border-slate/10 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-gold" />
            <h3 className="text-xl font-semibold text-deep-navy">Recent Activities</h3>
          </div>
          <div className="space-y-3">
            {RECENT_ACTIVITIES.map((activity) => (
              <div key={activity.id} className="p-4 bg-cloud-gray/30 rounded-xl border border-slate/10">
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${
                    activity.type === "USER_APPROVED" ? "bg-green-500" :
                    activity.type === "LISTING_APPROVED" ? "bg-blue-500" :
                    activity.type === "NEWS_PUBLISHED" ? "bg-purple-500" :
                    "bg-red-500"
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-deep-navy text-sm font-medium">{activity.message}</p>
                    <p className="text-xs text-slate mt-1">{activity.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-6 border border-slate/10 shadow-sm">
        <h3 className="text-xl font-semibold text-deep-navy mb-6">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <button className="group p-6 bg-gradient-to-br from-gold/5 to-gold/10 hover:from-gold/10 hover:to-gold/20 rounded-xl border border-gold/20 hover:border-gold/40 transition-all hover:scale-105 text-center">
            <Users className="w-10 h-10 text-gold mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="font-semibold text-deep-navy mb-1">All Users</h4>
            <p className="text-sm text-slate">Manage accounts</p>
          </button>
          <button className="group p-6 bg-gradient-to-br from-gold/5 to-gold/10 hover:from-gold/10 hover:to-gold/20 rounded-xl border border-gold/20 hover:border-gold/40 transition-all hover:scale-105 text-center">
            <Pill className="w-10 h-10 text-gold mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="font-semibold text-deep-navy mb-1">Medicines</h4>
            <p className="text-sm text-slate">Manage catalog</p>
          </button>
          <button className="group p-6 bg-gradient-to-br from-gold/5 to-gold/10 hover:from-gold/10 hover:to-gold/20 rounded-xl border border-gold/20 hover:border-gold/40 transition-all hover:scale-105 text-center">
            <Newspaper className="w-10 h-10 text-gold mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="font-semibold text-deep-navy mb-1">Publish News</h4>
            <p className="text-sm text-slate">Create article</p>
          </button>
          <button className="group p-6 bg-gradient-to-br from-gold/5 to-gold/10 hover:from-gold/10 hover:to-gold/20 rounded-xl border border-gold/20 hover:border-gold/40 transition-all hover:scale-105 text-center">
            <BarChart3 className="w-10 h-10 text-gold mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="font-semibold text-deep-navy mb-1">Analytics</h4>
            <p className="text-sm text-slate">View reports</p>
          </button>
          <button className="group p-6 bg-gradient-to-br from-gold/5 to-gold/10 hover:from-gold/10 hover:to-gold/20 rounded-xl border border-gold/20 hover:border-gold/40 transition-all hover:scale-105 text-center">
            <Settings className="w-10 h-10 text-gold mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="font-semibold text-deep-navy mb-1">Settings</h4>
            <p className="text-sm text-slate">Platform config</p>
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
