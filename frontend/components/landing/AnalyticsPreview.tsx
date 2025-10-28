'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

export default function AnalyticsPreview() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });

  const stats = [
    { label: 'Processing', count: 24 },
    { label: 'In Transit', count: 18 },
    { label: 'Out for Delivery', count: 12 },
    { label: 'Delivered Today', count: 36 },
  ];

  return (
    <section ref={sectionRef} className="py-16 md:py-24 bg-cloud-gray">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="bg-white border border-cloud-gray rounded-card p-8 md:p-12 shadow-light"
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.8, ease: [0.6, -0.05, 0.01, 0.99] as any }}
        >
          {/* Title */}
          <motion.h2 
            className="text-3xl md:text-4xl font-space font-bold text-deep-navy mb-8 tracking-tight"
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Counting Order History
          </motion.h2>

          {/* Line Chart */}
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div className="relative h-64 md:h-80">
              <svg className="w-full h-full" viewBox="0 0 800 300" fill="none">
                {/* Grid lines */}
                <line x1="0" y1="60" x2="800" y2="60" stroke="#E6E9ED" strokeWidth="1" />
                <line x1="0" y1="120" x2="800" y2="120" stroke="#E6E9ED" strokeWidth="1" />
                <line x1="0" y1="180" x2="800" y2="180" stroke="#E6E9ED" strokeWidth="1" />
                <line x1="0" y1="240" x2="800" y2="240" stroke="#E6E9ED" strokeWidth="1" />
                
                {/* Gold line with draw animation */}
                <motion.path
                  d="M 0 200 L 100 180 L 200 170 L 300 160 L 400 140 L 500 150 L 600 130 L 700 120 L 800 100"
                  stroke="#D4AF37"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={isInView ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
                  transition={{ duration: 2, delay: 0.6, ease: "easeInOut" }}
                />
                
                {/* Navy line with draw animation */}
                <motion.path
                  d="M 0 220 L 100 210 L 200 200 L 300 190 L 400 170 L 500 180 L 600 160 L 700 150 L 800 140"
                  stroke="#0C223E"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={isInView ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
                  transition={{ duration: 2, delay: 0.8, ease: "easeInOut" }}
                />
                
                {/* X-axis labels */}
                <text x="0" y="280" className="text-xs" fill="#747F8F" fontSize="12">Jan</text>
                <text x="140" y="280" className="text-xs" fill="#747F8F" fontSize="12">Feb</text>
                <text x="280" y="280" className="text-xs" fill="#747F8F" fontSize="12">Mar</text>
                <text x="420" y="280" className="text-xs" fill="#747F8F" fontSize="12">Apr</text>
                <text x="560" y="280" className="text-xs" fill="#747F8F" fontSize="12">May</text>
                <text x="700" y="280" className="text-xs" fill="#747F8F" fontSize="12">Jun</text>
              </svg>
            </div>

            {/* Legend */}
            <motion.div 
              className="flex items-center justify-center gap-8 mt-4"
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.6, delay: 2.5 }}
            >
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gold"></div>
                <span className="text-sm font-inter text-steel">Average Daily Price</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-deep-navy"></div>
                <span className="text-sm font-inter text-steel">Minimum Daily Price</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Pending Shipments Widget */}
          <div>
            <motion.h3 
              className="text-lg font-space font-semibold text-deep-navy mb-4"
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
              transition={{ duration: 0.6, delay: 1 }}
            >
              Pending Shipments
            </motion.h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((item, index) => (
                <motion.div
                  key={index}
                  className="bg-cloud-gray rounded-2xl p-4 border border-cloud-gray cursor-pointer"
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                  transition={{ duration: 0.6, delay: 1.2 + index * 0.1 }}
                  whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                >
                  <div className="flex items-center gap-3">
                    <motion.div 
                      className="w-10 h-10 bg-navy-gradient rounded-xl flex items-center justify-center shadow-dark"
                      whileHover={{ rotate: [0, -10, 10, -10, 0], transition: { duration: 0.5 } }}
                    >
                      <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                    </motion.div>
                    <div>
                      <motion.p 
                        className="text-2xl font-space font-bold text-deep-navy"
                        initial={{ scale: 0 }}
                        animate={isInView ? { scale: 1 } : { scale: 0 }}
                        transition={{ 
                          type: "spring", 
                          stiffness: 200, 
                          damping: 15,
                          delay: 1.5 + index * 0.1 
                        }}
                      >
                        {item.count}
                      </motion.p>
                      <p className="text-xs font-inter text-steel">{item.label}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
