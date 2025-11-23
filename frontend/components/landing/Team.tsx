"use client";
import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

export default function Team() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="team" className="py-24 bg-white dark:bg-gray-900 relative overflow-hidden">

      <div className="container mx-auto px-4 relative z-10" ref={ref}>
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl font-bold text-[var(--ink)] mb-4">
            Meet Our Team
          </h2>
          <p className="text-lg text-[var(--muted)] max-w-2xl mx-auto mb-12">
            The passionate professionals revolutionizing pharmaceutical trading in India
          </p>

          {/* Team Icon */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-blue-hi)]
                          rounded-full flex items-center justify-center mb-6 hover:scale-110 transition-transform shadow-lg shadow-blue-500/30">
              <Users className="w-12 h-12 text-white" />
            </div>
            <p className="text-[var(--muted)] text-lg max-w-2xl mx-auto">
              Our dedicated team of experts brings together years of experience in pharmaceutical trading,
              technology, and healthcare to build India's most trusted medicine exchange platform.
            </p>
          </motion.div>

          {/* Meet Full Team Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Link
              href="/team"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[var(--brand-blue)] text-white rounded-lg
                     hover:bg-[var(--brand-blue-hi)] hover:scale-105 transition-all font-semibold text-lg shadow-lg"
            >
              Meet Our Entire Team
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
