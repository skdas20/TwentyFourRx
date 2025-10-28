import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-orbital-white border-t border-cloud-gray py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Brand */}
          <div className="flex items-center space-x-1">
            <span className="text-2xl font-space font-bold text-gold">24</span>
            <span className="text-2xl font-space font-bold text-deep-navy">Rx</span>
            <span className="ml-3 text-sm font-inter text-steel">
              © {new Date().getFullYear()} B2B Medicine Trading
            </span>
          </div>

          {/* Legal Links */}
          <div className="flex items-center gap-6 text-sm font-inter text-steel">
            <Link href="/privacy" className="hover:text-deep-navy transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-deep-navy transition-colors">
              Terms of Service
            </Link>
            <Link href="/contact" className="hover:text-deep-navy transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
