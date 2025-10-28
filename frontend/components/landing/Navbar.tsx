'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-orbital-white/80 backdrop-blur-md border-b border-cloud-gray">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-1">
            <span className="text-2xl font-space font-bold text-gold">24</span>
            <span className="text-2xl font-space font-bold text-deep-navy">Rx</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="#products" className="text-slate hover:text-deep-navy transition-colors text-sm font-inter font-medium">
              Products
            </Link>
            <Link href="#listings" className="text-slate hover:text-deep-navy transition-colors text-sm font-inter font-medium">
              Listings
            </Link>
            <Link href="#news" className="text-slate hover:text-deep-navy transition-colors text-sm font-inter font-medium">
              News
            </Link>
            <Link href="#analytics" className="text-slate hover:text-deep-navy transition-colors text-sm font-inter font-medium">
              Analytics
            </Link>
            <Link href="#b2b" className="text-slate hover:text-deep-navy transition-colors text-sm font-inter font-medium">
              B2B
            </Link>
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            <Link
              href="/auth/login"
              className="px-5 py-2 text-deep-navy text-sm font-inter font-medium border border-cloud-gray rounded-button hover:border-deep-navy transition-all duration-200"
            >
              Login
            </Link>
            <Link
              href="/auth/register"
              className="px-5 py-2 bg-gold-gradient text-deep-navy text-sm font-inter font-semibold rounded-button hover:opacity-90 transition-all duration-200 shadow-sm"
            >
              Sign up
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-deep-navy"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-orbital-white border-t border-cloud-gray">
          <div className="px-4 py-4 space-y-3">
            <Link href="#products" className="block text-slate hover:text-deep-navy transition-colors font-inter">
              Products
            </Link>
            <Link href="#listings" className="block text-slate hover:text-deep-navy transition-colors font-inter">
              Listings
            </Link>
            <Link href="#news" className="block text-slate hover:text-deep-navy transition-colors font-inter">
              News
            </Link>
            <Link href="#analytics" className="block text-slate hover:text-deep-navy transition-colors font-inter">
              Analytics
            </Link>
            <Link href="#b2b" className="block text-slate hover:text-deep-navy transition-colors font-inter">
              B2B
            </Link>
            <div className="pt-3 space-y-2">
              <Link
                href="/auth/login"
                className="block w-full text-center px-5 py-2 text-deep-navy text-sm font-inter font-medium border border-cloud-gray rounded-button hover:border-deep-navy transition-all"
              >
                Login
              </Link>
              <Link
                href="/auth/register"
                className="block w-full text-center px-5 py-2 bg-gold-gradient text-deep-navy text-sm font-inter font-semibold rounded-button hover:opacity-90 transition-all shadow-sm"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
