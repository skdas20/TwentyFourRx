import Link from 'next/link';
import Logo from '../Logo';

export default function Footer() {
  return (
    <footer className="bg-[var(--surface)] border-t border-[var(--border)] py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Brand */}
          <div className="flex items-center gap-4">
            <Logo size="sm" href="/" />
            <span className="text-sm text-[var(--muted)]">
              © {new Date().getFullYear()} 24Rx Exchange. All rights reserved.
            </span>
          </div>

          {/* Legal Links */}
          <div className="flex items-center gap-6 text-sm text-[var(--muted)]">
            <Link href="/privacy" className="hover:text-[var(--ink)] transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-[var(--ink)] transition-colors">
              Terms of Service
            </Link>
            <Link href="/contact" className="hover:text-[var(--ink)] transition-colors">
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
