'use client';

import { TrendingUp, Package, Shield, BarChart3, Clock, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

export default function Features() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const features = [
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: 'Real-Time Price Tracking',
      description: 'Monitor medicine prices with live updates and historical trends.',
    },
    {
      icon: <Package className="w-8 h-8" />,
      title: 'Efficient Inventory Management',
      description: 'Track and manage your medicine stock with real-time updates.',
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: 'Verified Sellers Only',
      description: 'Trade with confidence. All sellers are KYC-verified.',
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: 'Advanced Analytics',
      description: 'Comprehensive insights into market trends and trading volume.',
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: 'Quick Settlement',
      description: 'Fast and secure payment processing with multiple options.',
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: 'B2B Marketplace',
      description: 'Connect with verified traders and distributors across India.',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <section id="features" className="py-24 bg-white dark:bg-gray-900 relative overflow-hidden">

      <div className="container mx-auto px-4 relative z-10" ref={ref}>
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl font-bold text-[var(--ink)] mb-4">
            Why Choose 24Rx Exchange?
          </h2>
          <p className="text-lg text-[var(--muted)] max-w-2xl mx-auto">
            Everything you need to trade medicines efficiently
          </p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 hover:border-[var(--brand-blue)]/50 transition-all duration-300 hover:shadow-xl hover:shadow-[var(--brand-blue)]/10 group hover:-translate-y-1 cursor-pointer"
            >
              <div className="w-14 h-14 bg-[var(--surface-2)] rounded-lg flex items-center justify-center text-[var(--brand-blue)] mb-4 group-hover:bg-[var(--brand-blue)] group-hover:text-white transition-all duration-300 group-hover:scale-110">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-[var(--ink)] mb-2">
                {feature.title}
              </h3>
              <p className="text-[var(--muted)] leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
