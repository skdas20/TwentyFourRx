"use client";
import { useState, useEffect, useRef } from "react";
import { Search, Package, FileText, TrendingUp, BarChart3, Users, X, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
          
          // Search medicines via API
          const medicineResponse = await fetch(`${apiUrl}/medicine-references/search?q=${encodeURIComponent(query)}`);
          const medicineData = await medicineResponse.json();

          const medicineResults: SearchResult[] = (medicineData.data || []).slice(0, 5).map((med: any) => ({
            id: med.id,
            type: "medicine" as const,
            title: `${med.name} ${med.strength || ''}`,
            description: `${med.form} - ${med.manufacturer}`,
            price: med.price || med.mrp, // Show price if available from reference data
            url: `/medicines/${med.id}`,
            icon: <Package className="w-4 h-4" />,
            clickable: isLoggedIn, // Only clickable if user is logged in
          }));

          // Search listings via API
          const listingsResponse = await fetch(`${apiUrl}/listings?search=${encodeURIComponent(query)}`);
          const listingsData = await listingsResponse.json();

          const listingResults: SearchResult[] = (listingsData.data || []).slice(0, 2).map((listing: any) => ({
            id: listing.id,
            type: "listing" as const,
            title: listing.medicine?.name || 'Medicine',
            description: `${listing.stock} units available`,
            price: listing.listPrice || listing.basePrice,
            url: `/medicines/${listing.medicineId}`,
            icon: <TrendingUp className="w-4 h-4" />,
            clickable: isLoggedIn,
          }));

          // Filter static results
          const featureResults = staticResults.filter(
            (item) =>
              item.title.toLowerCase().includes(query.toLowerCase()) ||
              item.description?.toLowerCase().includes(query.toLowerCase())
          );

          // Combine results (medicines first, then listings, then features)
          setResults([...medicineResults, ...listingResults, ...featureResults]);
        } catch (error) {
          console.error("Search error:", error);
          // Fallback to static results only
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
          className={`absolute ${isHeroVariant ? "top-full mt-2 w-full" : "top-full mt-1 w-full min-w-[400px]"}
            bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl
            overflow-hidden z-[9999] max-h-[500px] overflow-y-auto`}
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
              <p className="text-sm">No results found for "{query}"</p>
              <p className="text-xs mt-1">Try searching for medicines, features, or news</p>
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
    </div>
  );
}
