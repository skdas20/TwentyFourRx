'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

export default function Features() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });

  const features = [
    {
      icon: (
        <svg className="w-10 h-10 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      title: 'Efficient Inventory Management',
      description: 'Track and manage your medicine stock with real-time updates and automated alerts.',
      cta: 'Secure Services',
    },
    {
      icon: (
        <svg className="w-10 h-10 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      title: 'B2B Bulk Ordering',
      description: 'Order medicines in bulk quantities with flexible payment terms and delivery schedules.',
      cta: 'Login for Bulk Ordering',
    },
    {
      icon: (
        <svg className="w-10 h-10 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      title: 'Secure Bulk Pricing',
      description: 'Admin-approved pricing with transparent markup and competitive wholesale rates.',
      cta: 'Wholesale Pricing',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.6, -0.05, 0.01, 0.99] as any,
      },
    },
  };

  return (
    <section ref={sectionRef} className="py-16 md:py-24 bg-orbital-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="grid md:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ 
                y: -8, 
                transition: { duration: 0.3, ease: "easeOut" }
              }}
              className="group bg-white border border-cloud-gray rounded-card p-8 shadow-light hover:shadow-xl transition-shadow duration-300"
            >
              {/* Icon Tile with 3D tilt on hover */}
              <motion.div 
                className="mb-6 inline-flex"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <motion.div 
                  className="w-[92px] h-[92px] bg-navy-gradient rounded-2xl flex items-center justify-center border border-gold shadow-dark relative overflow-hidden cursor-pointer"
                  whileHover={{ rotate: [0, 5, -5, 0], transition: { duration: 0.5 } }}
                >
                  {/* Inner highlight */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                  <motion.div 
                    className="relative z-10"
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    {feature.icon}
                  </motion.div>
                </motion.div>
              </motion.div>

              {/* Content */}
              <h3 className="text-xl font-space font-semibold text-deep-navy mb-3 tracking-tight">
                {feature.title}
              </h3>
              <p className="text-slate font-inter mb-6 leading-relaxed">
                {feature.description}
              </p>

              {/* CTA Button with scale animation */}
              <motion.button 
                className="inline-flex items-center justify-center px-5 py-2.5 bg-deep-navy text-white text-sm font-inter font-semibold rounded-button hover:bg-opacity-90 transition-all duration-200"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {feature.cta}
              </motion.button>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
