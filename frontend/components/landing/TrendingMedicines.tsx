"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Pill, ArrowRight, Sparkles } from "lucide-react";
import axios from "axios";

interface Medicine {
  id?: string;
  medicineId?: string;
  name: string;
  form?: string;
  strength?: string;
  manufacturer?: string;
  currentPrice?: number;
  change?: number;
  changePercent?: number;
  totalQty?: number;
  activityScore?: number;
}

export default function TrendingMedicines() {
  const [trending, setTrending] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

      const trendingRes = await axios.get(`${API_URL}/dashboard/trending?limit=8`).catch(() => ({ data: [] }));
      setTrending(trendingRes.data || []);
    } catch (error) {
      console.error("Failed to load medicines:", error);
    } finally {
      setLoading(false);
    }
  };

  const MedicineCard = ({ medicine, index }: { medicine: Medicine; index: number }) => (
    <Link
      href={`/medicines/${medicine.medicineId || medicine.id}`}
      className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-700 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 transform hover:-translate-y-1"
    >
      {/* Rank Badge */}
      <div className="absolute -top-2 -left-2 w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
        {index + 1}
      </div>

      {/* Medicine Icon */}
      <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        <Pill className="w-7 h-7 text-blue-600 dark:text-blue-400" />
      </div>

      {/* Medicine Info */}
      <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        {medicine.name}
      </h3>
      
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        {medicine.form}{medicine.strength ? ` • ${medicine.strength}` : ""}
      </p>

      {/* Price */}
      {medicine.currentPrice && medicine.currentPrice > 0 && (
        <div className="flex items-center justify-between">
          <div>
            <span className="text-lg font-bold text-gray-900 dark:text-white block">
              ₹{medicine.currentPrice.toFixed(2)}
            </span>
            {medicine.changePercent !== undefined && (
              <span className={`text-xs font-medium flex items-center gap-1 ${medicine.changePercent > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                {medicine.changePercent > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(medicine.changePercent).toFixed(2)}%
              </span>
            )}
          </div>
          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            View <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      )}
    </Link>
  );

  if (loading) {
    return (
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        {/* Top Trending Section */}
        {trending.length > 0 && (
          <div>
            {/* Section Header */}
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                    Top Trending
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Most watched medicines this week
                  </p>
                </div>
              </div>
              <Link
                href="/medicines"
                className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-full text-sm font-medium hover:shadow-lg hover:shadow-orange-500/30 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Explore All
              </Link>
            </div>

            {/* Trending Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {trending.slice(0, 8).map((medicine, index) => (
                <MedicineCard key={medicine.medicineId || index} medicine={medicine} index={index} />
              ))}
            </div>

            {/* Mobile CTA */}
            <div className="md:hidden mt-6 text-center">
              <Link
                href="/medicines"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-full text-sm font-medium"
              >
                <Sparkles className="w-4 h-4" />
                Explore All Trending
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}