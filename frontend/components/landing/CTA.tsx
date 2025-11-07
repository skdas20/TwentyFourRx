import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function CTA() {
  return (
    <section className="py-24 bg-[var(--surface)]">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-[var(--ink)] mb-6">
            Ready to Start Trading?
          </h2>
          <p className="text-xl text-[var(--muted)] mb-8 max-w-2xl mx-auto">
            Join 500+ verified traders on 24Rx Exchange. Get instant access to real-time pricing,
            verified sellers, and seamless B2B transactions.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/register"
              className="px-8 py-4 bg-[var(--brand-blue)] text-white rounded-lg hover:opacity-90 
                       transition-opacity focus:ring-2 focus:ring-[var(--brand-blue)] focus:outline-none
                       flex items-center gap-2 text-lg font-semibold"
            >
              Create Free Account
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/medicines"
              className="px-8 py-4 border border-[var(--border)] text-[var(--ink)] rounded-lg 
                       hover:bg-[var(--surface-2)] transition-colors text-lg font-semibold"
            >
              Browse Medicines
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
