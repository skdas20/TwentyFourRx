"use client";
import Link from "next/link";
import { Bell } from "lucide-react";
import ThemeToggle from "../ThemeToggle";
import { useEffect, useState } from "react";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);

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
      <nav className="container mx-auto px-4 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <h1 className="text-2xl font-bold">
            <span className={`transition-colors ${isScrolled ? "text-gray-900 dark:text-white" : "text-gray-900 dark:text-white"}`}>
              24R
            </span>
            <span className="text-blue-600 dark:text-blue-400">x</span>
          </h1>
        </Link>

        {/* Center - Spacer */}
        <div className="flex-1"></div>

        {/* Right - Actions */}
        <div className="flex items-center gap-4">
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
                : "text-gray-700 dark:text-white"
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
                : "border border-gray-300 dark:border-white/30 text-gray-700 dark:text-white hover:bg-gray-100/50 dark:hover:bg-white/10"
            }`}
          >
            Register
          </Link>
        </div>
      </nav>
    </header>
  );
}
