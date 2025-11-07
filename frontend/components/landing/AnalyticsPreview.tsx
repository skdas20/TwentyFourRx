'use client';

import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';

export default function AnalyticsPreview() {
  const medicines = [
    { name: 'Paracetamol 500mg', change: 5.2, trending: 'up', price: '?45.00' },
    { name: 'Azithromycin 500mg', change: -2.1, trending: 'down', price: '?120.00' },
    { name: 'Amoxicillin 500mg', change: 3.8, trending: 'up', price: '?85.00' },
    { name: 'Ciprofloxacin 500mg', change: -1.5, trending: 'down', price: '?95.00' },
  ];

  return (
    <section className="py-24 bg-[var(--surface)]">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-[var(--ink)] mb-4">
              Real-Time Market Analytics
            </h2>
            <p className="text-lg text-[var(--muted)]">
              Track price movements and make informed decisions
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {medicines.map((med, index) => (
              <div
                key={index}
                className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6 hover:border-[var(--brand-blue)]/50 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--ink)] mb-1">{med.name}</h3>
                    <p className="text-2xl font-bold text-[var(--ink)]">{med.price}</p>
                  </div>
                  <div className={`flex items-center gap-1 px-3 py-1 rounded-lg ${med.trending === 'up' ? 'bg-[var(--up-blue)]/10 text-[var(--up-blue)]' : 'bg-[var(--brand-blue)]/10 text-[var(--brand-blue)]'}`}>
                    {med.trending === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span className="text-sm font-semibold">{med.change > 0 ? '+' : ''}{med.change}%</span>
                  </div>
                </div>

                {/* Chart with proper axes */}
                <div className="flex gap-2">
                  {/* Y-axis labels */}
                  <div className="flex flex-col justify-between text-xs text-[var(--muted)] h-24 py-1">
                    <span>₹150</span>
                    <span>₹100</span>
                    <span>₹50</span>
                    <span>₹0</span>
                  </div>
                  
                  {/* Chart container */}
                  <div className="flex-1">
                    {/* Chart area */}
                    <div className="h-24 flex items-end gap-1 border-l border-b border-[var(--border)] pl-2 pb-2">
                      {[...Array(12)].map((_, i) => {
                        // Generate realistic price data
                        const basePrice = parseFloat(med.price.replace('₹', ''));
                        const variation = (Math.sin(i * 0.5) + Math.random() * 0.4 - 0.2) * 10;
                        const price = basePrice + variation;
                        const height = (price / 150) * 100; // Scale to chart height
                        
                        return (
                          <div
                            key={i}
                            className={`flex-1 rounded-sm transition-all hover:opacity-80 ${
                              med.trending === 'up' ? 'bg-green-500' : 'bg-red-500'
                            }`}
                            style={{ 
                              height: `${Math.max(height, 5)}%`,
                              opacity: 0.6 + (i / 12) * 0.4 
                            }}
                            title={`Day ${i + 1}: ₹${price.toFixed(2)}`}
                          />
                        );
                      })}
                    </div>
                    
                    {/* X-axis labels */}
                    <div className="flex justify-between text-xs text-[var(--muted)] mt-1 pl-2">
                      <span>Jan</span>
                      <span>Feb</span>
                      <span>Mar</span>
                      <span>Apr</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <button className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--brand-blue)] text-white rounded-lg hover:opacity-90">
              <BarChart3 className="w-5 h-5" />
              View Full Analytics
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}