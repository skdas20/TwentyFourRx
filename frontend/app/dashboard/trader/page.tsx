"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, ShoppingCart, Newspaper, Sparkles, Search, Package, Briefcase } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

// Demo data
const TOP_HELD = [
  { id: 1, name: "Paracetamol 500mg", manufacturer: "Sun Pharma", heldQty: 5000, value: 125000 },
  { id: 2, name: "Amoxicillin 250mg", manufacturer: "Cipla", heldQty: 3500, value: 87500 },
  { id: 3, name: "Ibuprofen 400mg", manufacturer: "Dr. Reddy's", heldQty: 2800, value: 70000 },
  { id: 4, name: "Azithromycin 500mg", manufacturer: "Lupin", heldQty: 2000, value: 100000 },
];

const TOP_BOUGHT = [
  { id: 5, name: "Cetirizine 10mg", manufacturer: "Alkem", boughtQty: 8000, amount: 160000 },
  { id: 6, name: "Metformin 500mg", manufacturer: "USV", boughtQty: 6500, amount: 195000 },
  { id: 7, name: "Omeprazole 20mg", manufacturer: "Zydus", boughtQty: 5200, amount: 156000 },
  { id: 8, name: "Atorvastatin 10mg", manufacturer: "Torrent", boughtQty: 4800, amount: 240000 },
];

const TOP_NEWS = [
  { id: 1, title: "New Import Regulations for Generic Medicines", date: "2025-10-28", medicines: 3 },
  { id: 2, title: "Price Cap on Essential Drugs Extended", date: "2025-10-27", medicines: 5 },
  { id: 3, title: "FDA Approves 12 New Generic Formulations", date: "2025-10-25", medicines: 12 },
  { id: 4, title: "Quality Compliance Updates for Q4 2025", date: "2025-10-24", medicines: 2 },
];

const RECENT_LISTINGS = [
  { id: 9, name: "Amlodipine 5mg", seller: "MedSupply Inc", price: 45, stock: 10000, listedAt: "2 hours ago" },
  { id: 10, name: "Losartan 50mg", seller: "PharmaTrade Ltd", price: 38, stock: 8500, listedAt: "5 hours ago" },
  { id: 11, name: "Rosuvastatin 10mg", seller: "HealthFirst Co", price: 62, stock: 6000, listedAt: "1 day ago" },
  { id: 12, name: "Pantoprazole 40mg", seller: "MedCore", price: 28, stock: 12000, listedAt: "2 days ago" },
];

export default function TraderDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/auth/login");
      return;
    }
    const parsed = JSON.parse(userData);
    if (parsed.role !== "TRADER") {
      router.push("/auth/login");
      return;
    }
    setUser(parsed);
  }, [router]);

  if (!user) return null;

  return (
    <DashboardLayout
      user={user}
      title="Trader Dashboard"
      navLinks={[
        { href: "/medicines", label: "Browse Medicines" },
        { href: "/news", label: "News" },
      ]}
    >
      <h2 className="text-3xl font-bold text-deep-navy font-space mb-8">Welcome back, {user.name}</h2>

      {/* Top 4 Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Held */}
        <div className="bg-white rounded-2xl p-6 border border-slate/10 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="w-5 h-5 text-gold" />
            <h3 className="text-xl font-semibold text-deep-navy">Top 4 Most Held</h3>
          </div>
          <div className="space-y-3">
            {TOP_HELD.map((item) => (
              <Link
                key={item.id}
                href={`/medicines/${item.id}`}
                className="block p-4 bg-cloud-gray/30 rounded-xl hover:bg-cloud-gray/50 transition-all hover:scale-[1.01] border border-transparent hover:border-gold/20"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-deep-navy">{item.name}</p>
                    <p className="text-sm text-slate">{item.manufacturer}</p>
                  </div>
                  <span className="text-gold font-bold">₹{item.value.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate">Held Quantity:</span>
                  <span className="text-deep-navy font-medium">{item.heldQty.toLocaleString()} units</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Top Bought */}
        <div className="bg-white rounded-2xl p-6 border border-slate/10 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <ShoppingCart className="w-5 h-5 text-gold" />
            <h3 className="text-xl font-semibold text-deep-navy">Top 4 Most Bought</h3>
          </div>
          <div className="space-y-3">
            {TOP_BOUGHT.map((item) => (
              <Link
                key={item.id}
                href={`/medicines/${item.id}`}
                className="block p-4 bg-cloud-gray/30 rounded-xl hover:bg-cloud-gray/50 transition-all hover:scale-[1.01] border border-transparent hover:border-gold/20"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-deep-navy">{item.name}</p>
                    <p className="text-sm text-slate">{item.manufacturer}</p>
                  </div>
                  <span className="text-gold font-bold">₹{item.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate">Total Purchased:</span>
                  <span className="text-deep-navy font-medium">{item.boughtQty.toLocaleString()} units</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Top in News */}
        <div className="bg-white rounded-2xl p-6 border border-slate/10 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Newspaper className="w-5 h-5 text-gold" />
            <h3 className="text-xl font-semibold text-deep-navy">Top 4 in News</h3>
          </div>
          <div className="space-y-3">
            {TOP_NEWS.map((item) => (
              <Link
                key={item.id}
                href="/news"
                className="block p-4 bg-cloud-gray/30 rounded-xl hover:bg-cloud-gray/50 transition-all hover:scale-[1.01] border border-transparent hover:border-gold/20"
              >
                <p className="font-semibold text-deep-navy mb-2 line-clamp-2">{item.title}</p>
                <div className="flex justify-between text-sm">
                  <span className="text-slate">{item.date}</span>
                  <span className="text-gold">{item.medicines} medicines mentioned</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recently Listed */}
        <div className="bg-white rounded-2xl p-6 border border-slate/10 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-gold" />
            <h3 className="text-xl font-semibold text-deep-navy">Recently Listed</h3>
          </div>
          <div className="space-y-3">
            {RECENT_LISTINGS.map((item) => (
              <Link
                key={item.id}
                href={`/medicines/${item.id}`}
                className="block p-4 bg-cloud-gray/30 rounded-xl hover:bg-cloud-gray/50 transition-all hover:scale-[1.01] border border-transparent hover:border-gold/20"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-deep-navy">{item.name}</p>
                    <p className="text-sm text-slate">{item.seller}</p>
                  </div>
                  <span className="text-gold font-bold">₹{item.price}/unit</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate">Stock: {item.stock.toLocaleString()}</span>
                  <span className="text-slate">{item.listedAt}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-6 border border-slate/10 shadow-sm">
        <h3 className="text-xl font-semibold text-deep-navy mb-6">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/medicines"
            className="group p-6 bg-gradient-to-br from-gold/5 to-gold/10 hover:from-gold/10 hover:to-gold/20 rounded-xl border border-gold/20 hover:border-gold/40 transition-all hover:scale-105 text-center"
          >
            <Search className="w-10 h-10 text-gold mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="font-semibold text-deep-navy mb-1">Browse Medicines</h4>
            <p className="text-sm text-slate">Find and buy medicines</p>
          </Link>
          <button className="group p-6 bg-gradient-to-br from-gold/5 to-gold/10 hover:from-gold/10 hover:to-gold/20 rounded-xl border border-gold/20 hover:border-gold/40 transition-all hover:scale-105 text-center">
            <Package className="w-10 h-10 text-gold mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="font-semibold text-deep-navy mb-1">My Orders</h4>
            <p className="text-sm text-slate">View order history</p>
          </button>
          <button className="group p-6 bg-gradient-to-br from-gold/5 to-gold/10 hover:from-gold/10 hover:to-gold/20 rounded-xl border border-gold/20 hover:border-gold/40 transition-all hover:scale-105 text-center">
            <Briefcase className="w-10 h-10 text-gold mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="font-semibold text-deep-navy mb-1">My Inventory</h4>
            <p className="text-sm text-slate">Manage your stock</p>
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
