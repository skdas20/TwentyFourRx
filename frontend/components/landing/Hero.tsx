'use client';

import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef, useState } from 'react';

export default function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -150]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: (e.clientX - rect.left - rect.width / 2) / 20,
      y: (e.clientY - rect.top - rect.height / 2) / 20,
    });
  };

  return (
    <section 
      ref={containerRef}
      className="relative overflow-hidden bg-orbital-white py-16 md:py-24"
      onMouseMove={handleMouseMove}
    >
      {/* Animated Background Circles with Scroll Reveal */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full bg-deep-navy opacity-[0.06]"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.06 }}
          transition={{ duration: 1.2, delay: 0.2 }}
          style={{ y: y1 }}
        />
        <motion.div 
          className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full bg-deep-navy opacity-[0.04]"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.04 }}
          transition={{ duration: 1.2, delay: 0.4 }}
          style={{ y: y2 }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content with Stagger Animation */}
          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.h1 
              className="text-4xl md:text-5xl lg:text-6xl font-space font-bold text-deep-navy leading-tight tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              B2B Medicines, Approved and Analyzed.
            </motion.h1>
            
            <motion.p 
              className="text-lg md:text-xl text-slate font-inter leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              List, buy, or hold inventory with admin-approved pricing and 10-day auto-delivery for holds.
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 pt-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  href="/auth/register"
                  className="inline-flex items-center justify-center px-8 py-3.5 bg-gold-gradient text-deep-navy text-base font-inter font-semibold rounded-button hover:opacity-90 transition-all duration-200 shadow-light"
                >
                  Start Trading
                </Link>
              </motion.div>
              
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  href="#listings"
                  className="inline-flex items-center justify-center px-8 py-3.5 text-deep-navy text-base font-inter font-semibold border-2 border-deep-navy rounded-button hover:bg-deep-navy hover:text-white transition-all duration-200"
                >
                  Explore Listings
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Right: Analytics Card with Hover Grow & Cursor Movement */}
          <motion.div 
            className="relative"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            style={{
              x: mousePosition.x,
              y: mousePosition.y,
            }}
          >
            <motion.div 
              className="bg-cloud-gray rounded-card p-8 shadow-light cursor-pointer"
              whileHover={{ 
                scale: 1.05,
                boxShadow: "0 20px 40px rgba(12, 34, 62, 0.15)",
                transition: { duration: 0.3 }
              }}
            >
              {/* Chart Illustration with Animation */}
              <motion.div 
                className="bg-white rounded-2xl p-6 shadow-sm"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-inter font-semibold text-deep-navy">Price Analytics</h3>
                  <span className="text-xs font-inter text-steel">Last 30 days</span>
                </div>
                
                {/* Animated Line Chart */}
                <div className="relative h-48">
                  <svg className="w-full h-full" viewBox="0 0 400 200" fill="none">
                    {/* Grid lines */}
                    <line x1="0" y1="50" x2="400" y2="50" stroke="#E6E9ED" strokeWidth="1" />
                    <line x1="0" y1="100" x2="400" y2="100" stroke="#E6E9ED" strokeWidth="1" />
                    <line x1="0" y1="150" x2="400" y2="150" stroke="#E6E9ED" strokeWidth="1" />
                    
                    {/* Gold line with draw animation */}
                    <motion.path
                      d="M 0 120 L 50 110 L 100 100 L 150 95 L 200 85 L 250 90 L 300 80 L 350 75 L 400 70"
                      stroke="#D4AF37"
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 1.5, delay: 1 }}
                    />
                    
                    {/* Navy line with draw animation */}
                    <motion.path
                      d="M 0 140 L 50 135 L 100 130 L 150 125 L 200 115 L 250 120 L 300 110 L 350 105 L 400 100"
                      stroke="#0C223E"
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 1.5, delay: 1.2 }}
                    />
                  </svg>
                </div>

                {/* Legend with fade in */}
                <motion.div 
                  className="flex items-center justify-center gap-6 mt-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 2 }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gold"></div>
                    <span className="text-xs font-inter text-steel">Average</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-deep-navy"></div>
                    <span className="text-xs font-inter text-steel">Minimum</span>
                  </div>
                </motion.div>
              </motion.div>

              {/* Truck Icon Card with scale animation */}
              <motion.div 
                className="mt-4 bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.5 }}
                whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
              >
                <motion.div 
                  className="w-12 h-12 bg-navy-gradient rounded-xl flex items-center justify-center shadow-dark"
                  whileHover={{ rotate: [0, -10, 10, -10, 0], transition: { duration: 0.5 } }}
                >
                  <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                </motion.div>
                <div>
                  <p className="text-sm font-inter font-semibold text-deep-navy">Fast Delivery</p>
                  <p className="text-xs font-inter text-steel">10-day auto-delivery on holds</p>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
