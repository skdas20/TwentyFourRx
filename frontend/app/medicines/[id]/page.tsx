"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Pill, Package, TrendingUp, ShoppingCart, Lock, Star, ArrowLeft, BarChart3 } from "lucide-react";

// Demo medicine details
const MEDICINE_DETAILS: any = {
  "1": {
    id: 1,
    name: "Paracetamol 500mg",
    form: "Tablet",
    strength: "500mg",
    manufacturer: "Sun Pharma",
    marketer: "Sun Pharmaceutical Industries Ltd",
    description: "Paracetamol is a pain reliever and a fever reducer used to treat many conditions such as headache, muscle aches, arthritis, backache, toothaches, colds, and fevers.",
    isActive: true,
  }
};

// Demo price history (last 30 days)
const PRICE_HISTORY = [
  { day: "2025-09-29", minPrice: 24, avgPrice: 26, maxPrice: 28 },
  { day: "2025-10-01", minPrice: 23, avgPrice: 25, maxPrice: 27 },
  { day: "2025-10-05", minPrice: 22, avgPrice: 24, maxPrice: 26 },
  { day: "2025-10-10", minPrice: 22, avgPrice: 25, maxPrice: 28 },
  { day: "2025-10-15", minPrice: 22, avgPrice: 25, maxPrice: 28 },
  { day: "2025-10-20", minPrice: 22, avgPrice: 25, maxPrice: 28 },
  { day: "2025-10-25", minPrice: 22, avgPrice: 25, maxPrice: 28 },
  { day: "2025-10-28", minPrice: 22, avgPrice: 25, maxPrice: 28 },
];

// Demo available listings
const AVAILABLE_LISTINGS = [
  { id: 1, seller: "MedSupply Inc", listPrice: 22, stock: 15000, rating: 4.8 },
  { id: 2, seller: "PharmaTrade Ltd", listPrice: 24, stock: 12000, rating: 4.6 },
  { id: 3, seller: "HealthFirst Co", listPrice: 25, stock: 8000, rating: 4.7 },
  { id: 4, seller: "MedCore", listPrice: 26, stock: 10000, rating: 4.5 },
  { id: 5, seller: "QuickPharma", listPrice: 28, stock: 5000, rating: 4.4 },
];

export default function MedicineDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [medicine, setMedicine] = useState<any>(null);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [quantity, setQuantity] = useState(1000);
  const [priceRange, setPriceRange] = useState("30");

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }

    // Load medicine details (in real app, fetch from API)
    const medId = params.id as string;
    setMedicine(MEDICINE_DETAILS[medId] || MEDICINE_DETAILS["1"]);
  }, [params.id]);

  if (!medicine) return null;

  const currentMinPrice = PRICE_HISTORY[PRICE_HISTORY.length - 1].minPrice;

  return (
    <div className="min-h-screen bg-orbital-white">
      {/* Header */}
      <header className="border-b border-slate/10 bg-white/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-2xl font-bold text-[#D4AF37] font-space">24Rx</Link>
            <span className="text-slate/40">|</span>
            <Link href="/medicines" className="text-deep-navy hover:text-[#D4AF37] transition-colors font-semibold flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Medicines
            </Link>
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
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Medicine Header */}
        <div className="bg-white rounded-2xl p-8 border border-slate/10 shadow-sm mb-8">
          <div className="flex gap-8">
            <div className="w-48 h-48 bg-gradient-to-br from-[#D4AF37]/10 to-[#D4AF37]/5 rounded-2xl flex items-center justify-center">
              <Pill className="w-24 h-24 text-[#D4AF37]" />
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-deep-navy mb-4 font-space">{medicine.name}</h1>
              <div className="flex gap-3 mb-4">
                <span className="px-3 py-1 bg-[#D4AF37]/10 text-[#D4AF37] rounded-lg font-semibold flex items-center gap-1">
                  <Pill className="w-4 h-4" />
                  {medicine.form}
                </span>
                <span className="px-3 py-1 bg-[#D4AF37]/10 text-[#D4AF37] rounded-lg font-semibold">
                  {medicine.strength}
                </span>
                {medicine.isActive && (
                  <span className="px-3 py-1 bg-green-500/10 text-green-600 rounded-lg font-semibold">
                    ✓ Active
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-sm text-slate mb-1">Manufacturer</div>
                  <div className="text-deep-navy font-semibold">{medicine.manufacturer}</div>
                </div>
                <div>
                  <div className="text-sm text-slate mb-1">Marketer</div>
                  <div className="text-deep-navy font-semibold">{medicine.marketer}</div>
                </div>
              </div>
              <p className="text-slate leading-relaxed">{medicine.description}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Price Trend */}
          <div className="lg:col-span-2 space-y-8">
            {/* Price Trend Chart */}
            <div className="bg-white rounded-2xl p-6 border border-slate/10 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-deep-navy flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-[#D4AF37]" />
                  Price Trend
                </h2>
                <select
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value)}
                  className="px-4 py-2 bg-cloud-gray/30 text-deep-navy rounded-lg border border-slate/20 focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="7">Last 7 Days</option>
                  <option value="15">Last 15 Days</option>
                  <option value="30">Last 30 Days</option>
                </select>
              </div>

              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={PRICE_HISTORY}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#D4AF37" opacity={0.1} />
                    <XAxis 
                      dataKey="day" 
                      stroke="#64748b"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => new Date(value).getDate().toString()}
                    />
                    <YAxis 
                      stroke="#64748b"
                      tick={{ fontSize: 12 }}
                      label={{ value: '₹ Price', angle: -90, position: 'insideLeft', fill: '#D4AF37' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #D4AF37',
                        borderRadius: '8px',
                        color: '#0C223E'
                      }}
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="minPrice" 
                      stroke="#22c55e" 
                      strokeWidth={2}
                      name="Min Price"
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="avgPrice" 
                      stroke="#D4AF37" 
                      strokeWidth={3}
                      name="Avg Price"
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="maxPrice" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      name="Max Price"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-sm text-green-600 mb-1 flex items-center justify-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    Min Price
                  </div>
                  <div className="text-2xl font-bold text-deep-navy">₹{currentMinPrice}</div>
                </div>
                <div className="text-center p-4 bg-[#D4AF37]/10 rounded-lg">
                  <div className="text-sm text-[#D4AF37] mb-1 flex items-center justify-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    Avg Price
                  </div>
                  <div className="text-2xl font-bold text-deep-navy">₹{PRICE_HISTORY[PRICE_HISTORY.length - 1].avgPrice}</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-sm text-red-600 mb-1 flex items-center justify-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    Max Price
                  </div>
                  <div className="text-2xl font-bold text-deep-navy">₹{PRICE_HISTORY[PRICE_HISTORY.length - 1].maxPrice}</div>
                </div>
              </div>
            </div>

            {/* Available Sellers */}
            <div className="bg-white rounded-2xl p-6 border border-slate/10 shadow-sm">
              <h2 className="text-2xl font-semibold text-deep-navy mb-6 flex items-center gap-2">
                <Package className="w-6 h-6 text-[#D4AF37]" />
                Available Sellers
              </h2>
              <div className="space-y-3">
                {AVAILABLE_LISTINGS.map((listing) => (
                  <div
                    key={listing.id}
                    className={`p-4 rounded-lg border transition-all cursor-pointer ${
                      selectedListing?.id === listing.id
                        ? "bg-[#D4AF37]/10 border-[#D4AF37]"
                        : "bg-cloud-gray/20 border-slate/10 hover:border-[#D4AF37]/30 hover:bg-[#D4AF37]/5"
                    }`}
                    onClick={() => setSelectedListing(listing)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-deep-navy mb-1">{listing.seller}</div>
                        <div className="flex items-center gap-3 text-sm text-slate">
                          <span className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-[#D4AF37] text-[#D4AF37]" />
                            {listing.rating}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Package className="w-4 h-4" />
                            {listing.stock.toLocaleString()} units
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-[#D4AF37]">₹{listing.listPrice}</div>
                        <div className="text-xs text-slate">per unit</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Order Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 border border-slate/10 shadow-sm sticky top-24">
              <h2 className="text-2xl font-semibold text-deep-navy mb-6 flex items-center gap-2">
                <ShoppingCart className="w-6 h-6 text-[#D4AF37]" />
                Place Order
              </h2>

              {!selectedListing ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-slate/40 mx-auto mb-3" />
                  <p className="text-slate">Select a seller to continue</p>
                </div>
              ) : (
                <>
                  <div className="mb-6 p-3 bg-cloud-gray/20 rounded-lg">
                    <div className="text-sm text-slate mb-1">Selected Seller</div>
                    <div className="font-semibold text-deep-navy">{selectedListing.seller}</div>
                  </div>

                  <div className="mb-6">
                    <label className="text-sm text-slate mb-2 block font-semibold">Quantity (units)</label>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                      min="1"
                      max={selectedListing.stock}
                      className="w-full px-4 py-3 bg-cloud-gray/30 text-deep-navy text-lg font-semibold rounded-lg border border-slate/20 focus:outline-none focus:border-[#D4AF37]"
                    />
                    <div className="text-xs text-slate mt-1">
                      Max: {selectedListing.stock.toLocaleString()} units available
                    </div>
                  </div>

                  <div className="bg-cloud-gray/20 rounded-lg p-4 mb-6 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate">Unit Price:</span>
                      <span className="text-deep-navy font-semibold">₹{selectedListing.listPrice}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate">Quantity:</span>
                      <span className="text-deep-navy font-semibold">{quantity.toLocaleString()} units</span>
                    </div>
                    <div className="border-t border-slate/10 pt-2 mt-2"></div>
                    <div className="flex justify-between">
                      <span className="text-deep-navy font-semibold">Total Amount:</span>
                      <span className="text-2xl font-bold text-[#D4AF37]">₹{(selectedListing.listPrice * quantity).toLocaleString()}</span>
                    </div>
                  </div>

                  {user && user.role === "TRADER" ? (
                    <div className="space-y-3">
                      <button className="w-full px-6 py-3 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2">
                        <ShoppingCart className="w-5 h-5" />
                        Buy Now
                      </button>
                      <button className="w-full px-6 py-3 bg-white hover:bg-cloud-gray/20 text-[#D4AF37] border-2 border-[#D4AF37] rounded-lg font-semibold transition-colors flex items-center justify-center gap-2">
                        <Lock className="w-5 h-5" />
                        Hold (10 days)
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-slate mb-4">Login as Trader to place orders</p>
                      <Link href="/auth/login" className="px-6 py-3 bg-[#D4AF37] text-white rounded-lg hover:bg-[#D4AF37]/90 transition-colors font-semibold inline-block">
                        Login
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
