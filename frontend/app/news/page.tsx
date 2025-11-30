"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Newspaper, Eye, Calendar, User, ArrowLeft } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import ProfileDropdown from "@/components/ProfileDropdown";
import { newsApi } from "@/lib/api";

export default function NewsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
    loadNews();
  }, []);

  const loadNews = async () => {
    try {
      const response = await newsApi.getNews();
      setNews(response.data);
    } catch (error) {
      console.error("Failed to load news:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    router.push("/auth/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-2">
            {/* Left Side - Back Button + Logo */}
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <Link href="/" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </Link>
              <Link href="/" className="flex items-center">
                <h1 className="text-xl sm:text-2xl font-bold">
                  <span className="text-gray-900 dark:text-white">24R</span>
                  <span className="text-blue-600 dark:text-blue-400">x</span>
                </h1>
              </Link>
            </div>

            {/* Center - Fixed Navigation */}
            <div className="hidden md:flex items-center gap-3 lg:gap-6">
              <Link
                href="/medicines"
                className="text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
              >
                Explore
              </Link>
              {user && (
                <Link
                  href={`/dashboard/${user.roleCode.toLowerCase()}`}
                  className="text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
                >
                  Dashboard
                </Link>
              )}
            </div>

            {/* Right Side - User Menu */}
            <div className="flex items-center gap-1.5 sm:gap-3 lg:gap-4 flex-shrink-0">
              {user && (user.roleCode === 'TRADER' || user.roleCode === 'SELLER') && (
                <>
                  <Link
                    href="/portfolio"
                    className="hidden lg:block text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
                  >
                    Portfolio
                  </Link>
                  <Link
                    href="/watchlist"
                    className="hidden lg:block text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
                  >
                    Watchlist
                  </Link>
                </>
              )}
              <ThemeToggle />
              {user ? (
                <ProfileDropdown user={user} />
              ) : (
                <Link
                  href="/auth/login"
                  className="hidden sm:block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Latest News & Updates</h1>
          <p className="text-gray-600 dark:text-gray-400">Stay informed about pharmaceutical industry updates</p>
        </div>

        {/* News Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : news.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <Newspaper className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No news articles yet</h3>
            <p className="text-gray-600 dark:text-gray-400">Check back later for updates</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {news.map((article: any) => (
            <article
              key={article.id}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all"
            >
              <div className="flex items-start gap-6">
                {/* Icon */}
                <div className="w-16 h-16 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Newspaper className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {article.title}
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400 mb-3">
                        {article.excerpt}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm font-medium rounded-full whitespace-nowrap ml-4">
                      {article.category}
                    </span>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(article.createdAt || article.publishedAt).toLocaleDateString()}</span>
                    </div>
                    {article.views && (
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        <span>{article.views.toLocaleString()} views</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
