"use client";
import { useState, useEffect, useRef } from "react";
import { Search, Package, FileText, TrendingUp, BarChart3, Users, X, ShoppingCart, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { notificationsApi, listingsApi } from "@/lib/api";
import { showToast } from "@/lib/toast";

interface SearchResult {
  id: string;
  type: "medicine" | "feature" | "news" | "listing";
  title: string;
  description?: string;
  price?: number;
  url: string;
  icon: React.ReactNode;
  clickable?: boolean;
}

interface SearchBarProps {
  variant?: "navbar" | "hero";
  isScrolled?: boolean;
  isLoggedIn?: boolean;
}

export default function SearchBar({ variant = "navbar", isScrolled = false, isLoggedIn = false }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Requirement Modal State
  const [showReqModal, setShowReqModal] = useState(false);
  const [reqData, setReqData] = useState({ medicineName: "", quantity: "", message: "" });
  const [reqSubmitting, setReqSubmitting] = useState(false);

  const handlePostRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqData.medicineName || !reqData.quantity) return;

    try {
      setReqSubmitting(true);
      await notificationsApi.postRequirement({
        medicineName: reqData.medicineName,
        quantity: parseInt(reqData.quantity),
        message: reqData.message
      });
      showToast.success("Requirement posted successfully! Sellers will be notified.");
      setShowReqModal(false);
      setReqData({ medicineName: "", quantity: "", message: "" });
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to post requirement:", error);
      showToast.error("Failed to post requirement. Please try again.");
    } finally {
      setReqSubmitting(false);
    }
  };

  // Static feature/page results
  const staticResults: SearchResult[] = [
    { id: "feat-1", type: "feature", title: "Browse All Medicines", description: "Explore our complete medicine catalog", url: "/medicines", icon: <Package className="w-4 h-4" />, clickable: isLoggedIn },
    { id: "feat-2", type: "feature", title: "My Portfolio", description: "Track your medicine holdings", url: "/portfolio", icon: <BarChart3 className="w-4 h-4" />, clickable: isLoggedIn },
    { id: "feat-3", type: "feature", title: "Watchlist", description: "Monitor your favorite medicines", url: "/watchlist", icon: <TrendingUp className="w-4 h-4" />, clickable: isLoggedIn },
    { id: "feat-4", type: "news", title: "Latest News & Updates", description: "Stay updated with industry news", url: "/news", icon: <FileText className="w-4 h-4" />, clickable: isLoggedIn },
    { id: "feat-5", type: "feature", title: "Dashboard", description: "Access your trading dashboard", url: "/dashboard", icon: <Users className="w-4 h-4" />, clickable: isLoggedIn },
  ];

  // Handle search
  useEffect(() => {
    if (query.length > 1) {
      setIsLoading(true);

      const timer = setTimeout(async () => {
        try {
          // Search only active listings (medicines available for trade)
          const listingsRes = await listingsApi.getListings({ search: query }).catch(() => ({ data: [] }));
          const listingsData = listingsRes.data || [];

          // Process Listings (Available for Buy/Sell)
          const listingResults: SearchResult[] = listingsData.slice(0, 8).map((listing: any) => {
            const expiryDate = listing.expiryDate ? new Date(listing.expiryDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '';
            const mrp = listing.medicine?.mrp ? ` • MRP: ₹${Number(listing.medicine.mrp).toFixed(2)}` : '';
            return {
              id: listing.id,
              type: "listing" as const,
              title: listing.medicine?.name || "Medicine",
              description: `${listing.medicine?.manufacturer?.name || 'Unknown'} • ${listing.stock} units${expiryDate ? ` • Exp: ${expiryDate}` : ''}${mrp}`,
              price: listing.listPrice || listing.basePrice,
              url: `/medicines/${listing.medicineId}`,
              icon: <ShoppingCart className="w-4 h-4" />,
              clickable: isLoggedIn,
            };
          });

          // Static Features (Navigation)
          const featureResults = staticResults.filter(
            (item) =>
              item.title.toLowerCase().includes(query.toLowerCase()) ||
              item.description?.toLowerCase().includes(query.toLowerCase())
          );

          setResults([...listingResults, ...featureResults]);
        } catch (error) {
          console.error("Search error:", error);
          const featureResults = staticResults.filter(
            (item) =>
              item.title.toLowerCase().includes(query.toLowerCase()) ||
              item.description?.toLowerCase().includes(query.toLowerCase())
          );
          setResults(featureResults);
        } finally {
          setIsLoading(false);
        }
      }, 300);

      return () => clearTimeout(timer);
    } else {
      setResults([]);
      setIsLoading(false);
    }
  }, [query]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleResultClick = (url: string, clickable: boolean = true) => {
    if (!clickable) return; // Don't navigate if not logged in
    setIsOpen(false);
    setQuery("");
    router.push(url);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "medicine":
        return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30";
      case "feature":
        return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30";
      case "news":
        return "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30";
      case "listing":
        return "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30";
      default:
        return "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30";
    }
  };

  const isHeroVariant = variant === "hero";
  const inputClasses = isHeroVariant
    ? "w-full max-w-2xl px-5 py-4 pl-12 text-lg bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-all shadow-xl"
    : `w-full px-4 py-2 pl-10 text-sm rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        isScrolled
          ? "bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
          : "bg-white/90 dark:bg-gray-800/90 border border-gray-300 dark:border-gray-600"
      }`;

  return (
    <div ref={searchRef} className={`relative ${isHeroVariant ? "w-full" : "flex-1 max-w-md"}`}>
      <div className="relative">
        <Search
          className={`absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 ${
            isHeroVariant ? "w-6 h-6" : "w-4 h-4"
          }`}
        />
        <input
          type="text"
          placeholder={isHeroVariant ? "Search medicines, listings, news, and more..." : "Search..."}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className={inputClasses}
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className={isHeroVariant ? "w-5 h-5" : "w-4 h-4"} />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (query.length > 0 || results.length > 0) && (
        <div
          className={`absolute ${isHeroVariant ? "top-full mt-2 w-full" : "top-full mt-1 left-0 right-0 sm:min-w-[400px] sm:left-auto sm:right-auto sm:w-full"}
            bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl
            overflow-hidden max-h-[500px] overflow-y-auto`}
          style={{ zIndex: 99999 }}
        >
          {isLoading ? (
            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm">Searching...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result.url, result.clickable)}
                  className={`w-full px-4 py-3 flex items-start gap-3 transition-colors text-left ${
                    result.clickable
                      ? "hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                      : "cursor-default opacity-75"
                  }`}
                  disabled={!result.clickable}
                >
                  <div className={`p-2 rounded-lg ${getTypeColor(result.type)}`}>
                    {result.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {result.title}
                        </h4>
                        <span className="text-xs text-gray-500 dark:text-gray-400 capitalize flex-shrink-0">
                          {result.type}
                        </span>
                      </div>
                      {result.price && (
                        <span className="text-sm font-bold text-green-600 dark:text-green-400 flex-shrink-0">
                          ₹{result.price.toLocaleString()}
                        </span>
                      )}
                    </div>
                    {result.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">
                        {result.description}
                      </p>
                    )}
                    {!result.clickable && (
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 font-medium">
                        Login to view details
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm mb-4">No results found for "{query}"</p>
              
              {isLoggedIn ? (
                <button
                  onClick={() => {
                    setReqData(prev => ({ ...prev, medicineName: query }));
                    setShowReqModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  <MessageCircle className="w-4 h-4" />
                  Post Your Requirement
                </button>
              ) : (
                <p className="text-xs mt-1">Try searching for medicines, features, or news</p>
              )}
            </div>
          )}

          {/* Quick Links */}
          {!query && (
            <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-semibold">Quick Links</p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/medicines"
                  className="px-3 py-1.5 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  All Medicines
                </Link>
                <Link
                  href="/news"
                  className="px-3 py-1.5 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  News
                </Link>
                <Link
                  href="/analytics"
                  className="px-3 py-1.5 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  Analytics
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Requirement Posting Modal */}
      {showReqModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100000] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Post Requirement</h3>
              <button 
                onClick={() => setShowReqModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handlePostRequirement} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Medicine Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={reqData.medicineName}
                  onChange={(e) => setReqData({ ...reqData, medicineName: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Dolo 650"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={reqData.quantity}
                  onChange={(e) => setReqData({ ...reqData, quantity: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. 100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Message (Optional)
                </label>
                <textarea
                  rows={3}
                  value={reqData.message}
                  onChange={(e) => setReqData({ ...reqData, message: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  placeholder="Any specific requirements..."
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReqModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reqSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {reqSubmitting ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <MessageCircle className="w-4 h-4" />
                      Post Requirement
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}