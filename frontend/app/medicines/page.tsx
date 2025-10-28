"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pill, Search, SlidersHorizontal, Package, TrendingUp, Users, Filter } from "lucide-react";

// Demo medicines data
const ALL_MEDICINES = [
  { id: 1, name: "Paracetamol 500mg", form: "Tablet", manufacturer: "Sun Pharma", minPrice: 22, maxPrice: 28, sellers: 12, stock: 50000 },
  { id: 2, name: "Amoxicillin 250mg", form: "Capsule", manufacturer: "Cipla", minPrice: 24, maxPrice: 32, sellers: 8, stock: 35000 },
  { id: 3, name: "Ibuprofen 400mg", form: "Tablet", manufacturer: "Dr. Reddy's", minPrice: 28, maxPrice: 35, sellers: 10, stock: 28000 },
  { id: 4, name: "Azithromycin 500mg", form: "Tablet", manufacturer: "Lupin", minPrice: 48, maxPrice: 58, sellers: 6, stock: 20000 },
  { id: 5, name: "Cetirizine 10mg", form: "Tablet", manufacturer: "Alkem", minPrice: 18, maxPrice: 24, sellers: 15, stock: 80000 },
  { id: 6, name: "Metformin 500mg", form: "Tablet", manufacturer: "USV", minPrice: 28, maxPrice: 35, sellers: 9, stock: 65000 },
  { id: 7, name: "Omeprazole 20mg", form: "Capsule", manufacturer: "Zydus", minPrice: 26, maxPrice: 34, sellers: 11, stock: 52000 },
  { id: 8, name: "Atorvastatin 10mg", form: "Tablet", manufacturer: "Torrent", minPrice: 45, maxPrice: 55, sellers: 7, stock: 48000 },
  { id: 9, name: "Amlodipine 5mg", form: "Tablet", manufacturer: "Sun Pharma", minPrice: 38, maxPrice: 48, sellers: 10, stock: 60000 },
  { id: 10, name: "Losartan 50mg", form: "Tablet", manufacturer: "Cipla", minPrice: 32, maxPrice: 42, sellers: 8, stock: 45000 },
  { id: 11, name: "Rosuvastatin 10mg", form: "Tablet", manufacturer: "Dr. Reddy's", minPrice: 52, maxPrice: 65, sellers: 6, stock: 30000 },
  { id: 12, name: "Pantoprazole 40mg", form: "Tablet", manufacturer: "Lupin", minPrice: 24, maxPrice: 32, sellers: 12, stock: 55000 },
];

export default function MedicinesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedForm, setSelectedForm] = useState("ALL");
  const [sortBy, setSortBy] = useState("name");

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  // Filter and sort medicines
  const filteredMedicines = ALL_MEDICINES
    .filter(med => {
      const matchesSearch = med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          med.manufacturer.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesForm = selectedForm === "ALL" || med.form === selectedForm;
      return matchesSearch && matchesForm;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "price-low") return a.minPrice - b.minPrice;
      if (sortBy === "price-high") return b.maxPrice - a.maxPrice;
      if (sortBy === "stock") return b.stock - a.stock;
      return 0;
    });

  return (
    <div className="min-h-screen bg-orbital-white">
      {/* Header */}
      <header className="border-b border-slate/10 bg-white/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-2xl font-bold text-[#D4AF37] font-space">24Rx</Link>
            <span className="text-slate/40">|</span>
            <span className="text-deep-navy font-semibold">Browse Medicines</span>
          </div>
          <div className="flex items-center gap-6">
            {user && (
              <>
                <Link 
                  href={`/dashboard/${user.role.toLowerCase()}`} 
                  className="text-deep-navy hover:text-[#D4AF37] transition-colors font-semibold"
                >
                  Dashboard
                </Link>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm text-deep-navy font-semibold">{user.name}</p>
                    <p className="text-xs text-[#D4AF37]">{user.role}</p>
                  </div>
                  <button
                    onClick={() => {
                      localStorage.removeItem("user");
                      router.push("/auth/login");
                    }}
                    className="px-4 py-2 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] rounded-lg transition-colors font-semibold"
                  >
                    Logout
                  </button>
                </div>
              </>
            )}
            {!user && (
              <Link href="/auth/login" className="px-4 py-2 bg-[#D4AF37] text-white rounded-lg hover:bg-[#D4AF37]/90 transition-colors font-semibold">
                Login
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-deep-navy mb-2 font-space">Browse Medicines</h1>
          <p className="text-slate">Find the best prices from verified sellers</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-6 border border-slate/10 shadow-sm mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="text-sm text-slate mb-2 flex items-center gap-2">
                <Search className="w-4 h-4" />
                Search
              </label>
              <input
                type="text"
                placeholder="Medicine name or manufacturer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-cloud-gray/30 text-deep-navy rounded-lg border border-slate/20 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            {/* Form Type */}
            <div>
              <label className="text-sm text-slate mb-2 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Form
              </label>
              <select
                value={selectedForm}
                onChange={(e) => setSelectedForm(e.target.value)}
                className="w-full px-4 py-2 bg-cloud-gray/30 text-deep-navy rounded-lg border border-slate/20 focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="ALL">All Forms</option>
                <option value="Tablet">Tablet</option>
                <option value="Capsule">Capsule</option>
                <option value="Syrup">Syrup</option>
                <option value="Injection">Injection</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="text-sm text-slate mb-2 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" />
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 bg-cloud-gray/30 text-deep-navy rounded-lg border border-slate/20 focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="name">Name (A-Z)</option>
                <option value="price-low">Price (Low to High)</option>
                <option value="price-high">Price (High to Low)</option>
                <option value="stock">Stock Availability</option>
              </select>
            </div>
          </div>

          <div className="mt-4 text-sm text-slate">
            Found <span className="text-[#D4AF37] font-semibold">{filteredMedicines.length}</span> medicines
          </div>
        </div>

        {/* Medicines Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMedicines.map((medicine) => (
            <Link
              key={medicine.id}
              href={`/medicines/${medicine.id}`}
              className="bg-white rounded-2xl p-6 border border-slate/10 shadow-sm hover:border-[#D4AF37]/50 hover:shadow-lg transition-all hover:scale-[1.02] group"
            >
              {/* Medicine Icon */}
              <div className="w-full h-32 bg-gradient-to-br from-[#D4AF37]/10 to-[#D4AF37]/5 rounded-xl flex items-center justify-center mb-4 group-hover:from-[#D4AF37]/20 group-hover:to-[#D4AF37]/10 transition-all">
                <Pill className="w-16 h-16 text-[#D4AF37]" />
              </div>

              {/* Medicine Info */}
              <h3 className="text-xl font-semibold text-deep-navy mb-2">{medicine.name}</h3>
              <div className="flex gap-2 mb-3">
                <span className="px-2 py-1 bg-[#D4AF37]/10 text-[#D4AF37] rounded text-xs font-semibold">
                  {medicine.form}
                </span>
                <span className="px-2 py-1 bg-cloud-gray/50 text-slate rounded text-xs">
                  {medicine.manufacturer}
                </span>
              </div>

              {/* Price Range */}
              <div className="mb-4">
                <div className="text-sm text-slate mb-1">Price Range</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-[#D4AF37]">₹{medicine.minPrice}</span>
                  <span className="text-slate">-</span>
                  <span className="text-lg font-semibold text-[#D4AF37]/80">₹{medicine.maxPrice}</span>
                  <span className="text-sm text-slate">/unit</span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex justify-between text-sm pb-4 border-b border-slate/10">
                <div className="flex items-center gap-1">
                  <Package className="w-4 h-4 text-slate" />
                  <span className="text-deep-navy font-semibold">{medicine.stock.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-slate" />
                  <span className="text-slate">{medicine.sellers} sellers</span>
                </div>
              </div>

              {/* Action Button */}
              <button className="w-full mt-4 px-4 py-2 bg-[#D4AF37] text-white rounded-lg hover:bg-[#D4AF37]/90 transition-colors font-semibold">
                View Details →
              </button>
            </Link>
          ))}
        </div>

        {filteredMedicines.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate/10">
            <Search className="w-16 h-16 text-slate/40 mx-auto mb-4" />
            <h3 className="text-2xl font-semibold text-deep-navy mb-2">No medicines found</h3>
            <p className="text-slate">Try adjusting your search or filters</p>
          </div>
        )}
      </main>
    </div>
  );
}
