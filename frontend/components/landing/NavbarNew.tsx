"use client";
import Link from "next/link";
import { Bell, Menu, X } from "lucide-react";
import ThemeToggle from "../ThemeToggle";
import Logo from "../Logo";
import { useEffect, useState } from "react";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700 shadow-sm"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <nav className="container mx-auto px-4 h-20 flex items-center justify-between gap-4">
        {/* Logo */}
        <Logo size="md" href="/" />

        {/* Desktop - Right Actions */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          <button
            className={`p-2 rounded-lg transition-all ${
              isScrolled
                ? "hover:bg-gray-100 dark:hover:bg-gray-800"
                : "hover:bg-gray-100/50 dark:hover:bg-gray-800/50"
            }`}
          >
            <Bell className={`w-5 h-5 transition-colors ${
              isScrolled
                ? "text-gray-600 dark:text-gray-300"
                : "text-gray-700 dark:text-gray-100"
            }`} />
          </button>
          <Link
            href="/auth/login"
            className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600
                     transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-lg"
          >
            Login
          </Link>
          <Link
            href="/auth/register"
            className={`px-4 py-2 rounded-lg transition-all ${
              isScrolled
                ? "border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                : "border border-gray-400 dark:border-gray-300 text-gray-700 dark:text-gray-100 hover:bg-gray-50/50 dark:hover:bg-gray-800/50"
            }`}
          >
            Register
          </Link>
        </div>

        {/* Mobile - Right Actions */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`p-2 rounded-lg transition-all ${
              isScrolled
                ? "hover:bg-gray-100 dark:hover:bg-gray-800"
                : "hover:bg-gray-100/50 dark:hover:bg-gray-800/50"
            }`}
          >
            {mobileMenuOpen ? (
              <X className={`w-6 h-6 transition-colors ${
                isScrolled
                  ? "text-gray-600 dark:text-gray-300"
                  : "text-gray-700 dark:text-gray-100"
              }`} />
            ) : (
              <Menu className={`w-6 h-6 transition-colors ${
                isScrolled
                  ? "text-gray-600 dark:text-gray-300"
                  : "text-gray-700 dark:text-gray-100"
              }`} />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-4 py-4 space-y-3">
            <button
              className="w-full flex items-center gap-2 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              <span className="text-gray-700 dark:text-gray-200">Notifications</span>
            </button>
            <Link
              href="/auth/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full px-4 py-3 bg-blue-600 dark:bg-blue-500 text-white text-center rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600
                       transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-lg font-medium"
            >
              Login
            </Link>
            <Link
              href="/auth/register"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-center rounded-lg
                       hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
            >
              Register
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
