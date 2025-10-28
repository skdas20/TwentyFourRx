"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Package, TrendingUp, FileText, BarChart3, Newspaper, Warehouse, Clock } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

// Demo data
const MY_LISTINGS = [
  { id: 1, name: "Paracetamol 500mg", manufacturer: "Sun Pharma", listPrice: 25, basePrice: 22, stock: 5000, status: "ACTIVE" },
  { id: 2, name: "Amoxicillin 250mg", manufacturer: "Cipla", listPrice: 28, basePrice: 24, stock: 3500, status: "ACTIVE" },
  { id: 3, name: "Ibuprofen 400mg", manufacturer: "Dr. Reddy's", listPrice: 32, basePrice: 28, stock: 0, status: "OUT_OF_STOCK" },
  { id: 4, name: "Azithromycin 500mg", manufacturer: "Lupin", listPrice: 55, basePrice: 48, stock: 2000, status: "PENDING" },
];

const RECENT_ORDERS = [
  { id: 1, medicine: "Paracetamol 500mg", buyer: "MedPlus Traders", qty: 500, amount: 12500, date: "2025-10-28", status: "DELIVERED" },
  { id: 2, medicine: "Amoxicillin 250mg", buyer: "Apollo Distribution", qty: 800, amount: 22400, date: "2025-10-27", status: "SHIPPED" },
  { id: 3, medicine: "Paracetamol 500mg", buyer: "PharmEasy B2B", qty: 1200, amount: 30000, date: "2025-10-26", status: "PAID" },
  { id: 4, medicine: "Amoxicillin 250mg", buyer: "1mg Wholesale", qty: 600, amount: 16800, date: "2025-10-25", status: "DELIVERED" },
];

const TOP_NEWS = [
  { id: 1, title: "New Import Regulations for Generic Medicines", date: "2025-10-28", medicines: 3 },
  { id: 2, title: "Price Cap on Essential Drugs Extended", date: "2025-10-27", medicines: 5 },
  { id: 3, title: "FDA Approves 12 New Generic Formulations", date: "2025-10-25", medicines: 12 },
  { id: 4, title: "Quality Compliance Updates for Q4 2025", date: "2025-10-24", medicines: 2 },
];

const SALES_STATS = {
  totalRevenue: 1250000,
  totalOrders: 156,
  activeListings: 12,
  pendingApprovals: 3,
};

export default function SellerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/auth/login");
      return;
    }
    const parsed = JSON.parse(userData);
    if (parsed.role !== "SELLER") {
      router.push("/auth/login");
      return;
    }
    setUser(parsed);
  }, [router]);

  if (!user) return null;

  return (
    <DashboardLayout
      user={user}
      title="Seller Dashboard"
      navLinks={[{ href: "/news", label: "News" }]}
    >
      <h2 className="text-3xl font-bold text-deep-navy font-space mb-8">Welcome back, {user.name}</h2>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-gold/10 to-gold/5 rounded-xl p-6 border border-gold/20">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-gold" />
            <div className="text-sm text-slate">Total Revenue</div>
          </div>
          <div className="text-3xl font-bold text-deep-navy">₹{(SALES_STATS.totalRevenue / 100000).toFixed(1)}L</div>
        </div>
        <div className="bg-white rounded-xl p-6 border border-slate/10 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-5 h-5 text-gold" />
            <div className="text-sm text-slate">Total Orders</div>
          </div>
          <div className="text-3xl font-bold text-deep-navy">{SALES_STATS.totalOrders}</div>
        </div>
        <div className="bg-white rounded-xl p-6 border border-slate/10 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-gold" />
            <div className="text-sm text-slate">Active Listings</div>
          </div>
          <div className="text-3xl font-bold text-deep-navy">{SALES_STATS.activeListings}</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 rounded-xl p-6 border border-yellow-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-yellow-600" />
            <div className="text-sm text-slate">Pending Approvals</div>
          </div>
          <div className="text-3xl font-bold text-yellow-600">{SALES_STATS.pendingApprovals}</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* My Listings */}
        <div className="bg-white rounded-2xl p-6 border border-slate/10 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-gold" />
              <h3 className="text-xl font-semibold text-deep-navy">My Listings</h3>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-gold text-white rounded-lg hover:bg-gold-dark transition-colors font-semibold text-sm shadow-sm">
              <Plus className="w-4 h-4" />
              New Listing
            </button>
          </div>
          <div className="space-y-3">
            {MY_LISTINGS.map((item) => (
              <div key={item.id} className="p-4 bg-cloud-gray/30 rounded-xl border border-slate/10">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-deep-navy">{item.name}</p>
                    <p className="text-sm text-slate">{item.manufacturer}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    item.status === "ACTIVE" ? "bg-green-100 text-green-700" :
                    item.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    {item.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <span className="text-slate">Base:</span>
                    <span className="text-deep-navy ml-1 font-medium">₹{item.basePrice}</span>
                  </div>
                  <div>
                    <span className="text-slate">List:</span>
                    <span className="text-gold ml-1 font-semibold">₹{item.listPrice}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate">Stock:</span>
                    <span className="text-deep-navy ml-1 font-medium">{item.stock}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-2xl p-6 border border-slate/10 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Package className="w-5 h-5 text-gold" />
            <h3 className="text-xl font-semibold text-deep-navy">Recent Orders</h3>
          </div>
          <div className="space-y-3">
            {RECENT_ORDERS.map((order) => (
              <div key={order.id} className="p-4 bg-cloud-gray/30 rounded-xl border border-slate/10">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-deep-navy">{order.medicine}</p>
                    <p className="text-sm text-slate">{order.buyer}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    order.status === "DELIVERED" ? "bg-green-100 text-green-700" :
                    order.status === "SHIPPED" ? "bg-blue-100 text-blue-700" :
                    "bg-yellow-100 text-yellow-700"
                  }`}>
                    {order.status}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate">{order.qty} units</span>
                  <span className="text-gold font-semibold">₹{order.amount.toLocaleString()}</span>
                </div>
                <div className="text-xs text-slate mt-1">{order.date}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Industry News */}
        <div className="bg-white rounded-2xl p-6 border border-slate/10 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <Newspaper className="w-5 h-5 text-gold" />
            <h3 className="text-xl font-semibold text-deep-navy">Industry News</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TOP_NEWS.map((item) => (
              <Link
                key={item.id}
                href="/news"
                className="p-4 bg-cloud-gray/30 rounded-xl hover:bg-cloud-gray/50 transition-all hover:scale-[1.01] border border-transparent hover:border-gold/20"
              >
                <p className="font-semibold text-deep-navy mb-2 line-clamp-2">{item.title}</p>
                <div className="flex justify-between text-sm">
                  <span className="text-slate">{item.date}</span>
                  <span className="text-gold">{item.medicines} medicines</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-6 border border-slate/10 shadow-sm">
        <h3 className="text-xl font-semibold text-deep-navy mb-6">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button className="group p-6 bg-gradient-to-br from-gold/5 to-gold/10 hover:from-gold/10 hover:to-gold/20 rounded-xl border border-gold/20 hover:border-gold/40 transition-all hover:scale-105 text-center">
            <Plus className="w-10 h-10 text-gold mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="font-semibold text-deep-navy mb-1">Create Listing</h4>
            <p className="text-sm text-slate">Add new medicine</p>
          </button>
          <button className="group p-6 bg-gradient-to-br from-gold/5 to-gold/10 hover:from-gold/10 hover:to-gold/20 rounded-xl border border-gold/20 hover:border-gold/40 transition-all hover:scale-105 text-center">
            <BarChart3 className="w-10 h-10 text-gold mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="font-semibold text-deep-navy mb-1">Analytics</h4>
            <p className="text-sm text-slate">View sales data</p>
          </button>
          <button className="group p-6 bg-gradient-to-br from-gold/5 to-gold/10 hover:from-gold/10 hover:to-gold/20 rounded-xl border border-gold/20 hover:border-gold/40 transition-all hover:scale-105 text-center">
            <Warehouse className="w-10 h-10 text-gold mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="font-semibold text-deep-navy mb-1">Inventory</h4>
            <p className="text-sm text-slate">Manage stock levels</p>
          </button>
          <button className="group p-6 bg-gradient-to-br from-gold/5 to-gold/10 hover:from-gold/10 hover:to-gold/20 rounded-xl border border-gold/20 hover:border-gold/40 transition-all hover:scale-105 text-center">
            <FileText className="w-10 h-10 text-gold mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="font-semibold text-deep-navy mb-1">Documents</h4>
            <p className="text-sm text-slate">KYC & Licenses</p>
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
