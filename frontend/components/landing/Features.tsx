'use client';

import { TrendingUp, Package, Shield, BarChart3, Clock, Users } from 'lucide-react';

export default function Features() {
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

  return (
    <section id="features" className="py-24 bg-[var(--bg)]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-[var(--ink)] mb-4">
            Why Choose 24Rx Exchange?
          </h2>
          <p className="text-lg text-[var(--muted)] max-w-2xl mx-auto">
            Everything you need to trade medicines efficiently
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 hover:border-[var(--brand-blue)]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[var(--brand-blue)]/10 group"
            >
              <div className="w-14 h-14 bg-[var(--surface-2)] rounded-lg flex items-center justify-center text-[var(--brand-blue)] mb-4 group-hover:bg-[var(--brand-blue)] group-hover:text-white transition-colors">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-[var(--ink)] mb-2">
                {feature.title}
              </h3>
              <p className="text-[var(--muted)] leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
