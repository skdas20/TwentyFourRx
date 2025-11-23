'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

export default function CTA() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-24 bg-gray-50 dark:bg-gray-800 relative overflow-hidden">

      <div className="container mx-auto px-4 relative z-10" ref={ref}>
        <motion.div
          className="max-w-4xl mx-auto text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-[var(--ink)] mb-6">
            Ready to Start Trading?
          </h2>
          <p className="text-xl text-[var(--muted)] mb-8 max-w-2xl mx-auto">
            Join 500+ verified traders on 24Rx Exchange. Get instant access to real-time pricing,
            verified sellers, and seamless B2B transactions.
          </p>
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Link
              href="/auth/register"
              className="px-8 py-4 bg-[var(--brand-blue)] text-white rounded-lg hover:opacity-90 hover:scale-105
                       transition-all focus:ring-2 focus:ring-[var(--brand-blue)] focus:outline-none
                       flex items-center gap-2 text-lg font-semibold shadow-lg shadow-blue-500/30"
            >
              Create Free Account
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/medicines"
              className="px-8 py-4 border-2 border-[var(--border)] text-[var(--ink)] rounded-lg
                       hover:bg-[var(--surface-2)] hover:scale-105 transition-all text-lg font-semibold"
            >
              Browse Medicines
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
