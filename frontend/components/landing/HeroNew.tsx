"use client";
import Link from "next/link";
import { ArrowRight, Activity } from "lucide-react";
import BackgroundDNA from "../BackgroundDNA";

export default function HeroNew() {
  return (
    <section className="relative w-full min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Background decorative elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-20 w-96 h-96 bg-blue-400/10 dark:bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-purple-400/10 dark:bg-purple-500/10 rounded-full blur-3xl"></div>
        <BackgroundDNA className="opacity-20 dark:opacity-10" />
      </div>

      <div className="container mx-auto px-4 py-12 md:py-20 relative z-10 w-full pt-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 mb-6">
            <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Live Medicine Trading Platform</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span className="text-gray-900 dark:text-white">24Rx</span>{" "}
            <span className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">Exchange</span>
          </h1>

          <p className="text-lg md:text-xl text-blue-600 dark:text-blue-400 font-semibold mb-6">
            World's Only Med-Trade Platform
          </p>

          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Elevate Your Medicine Business
          </h2>

          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            Find All the Rare and High demand medicines at the rate you never thought of.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/auth/register"
              className="px-8 py-4 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 
                       transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none flex items-center gap-2 text-lg font-semibold shadow-lg shadow-blue-500/30"
            >
              Start Trading
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="#features"
              className="px-8 py-4 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg 
                       hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-lg font-semibold"
            >
              Learn More
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto">
            <div className="p-4 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">10K+</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Medicines</div>
            </div>
            <div className="p-4 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">500+</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Verified Sellers</div>
            </div>
            <div className="p-4 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">₹50Cr+</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Monthly Volume</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
