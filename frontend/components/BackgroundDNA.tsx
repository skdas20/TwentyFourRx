"use client";

export default function BackgroundDNA({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <div className="dna-container">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="dna-strand"
            style={{
              animationDelay: `${i * -0.5}s`,
              left: `${15 + i * 15}%`,
            }}
          />
        ))}
      </div>

      <style jsx>{`
        .dna-container {
          position: absolute;
          inset: 0;
          perspective: 1000px;
          transform: rotate(-45deg) scale(1.4);
          transform-origin: center;
        }

        .dna-strand {
          position: absolute;
          width: 4px;
          height: 200%;
          top: -50%;
          background: linear-gradient(to bottom, transparent, #3BA7FF 20%, #5BB9FF 50%, #3BA7FF 80%, transparent);
          box-shadow: 0 0 20px rgba(59, 167, 255, 0.6), 0 0 40px rgba(59, 167, 255, 0.3);
          animation: dna-wave 3s ease-in-out infinite;
          transform-style: preserve-3d;
        }

        .dna-strand::before,
        .dna-strand::after {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          background: inherit;
          box-shadow: inherit;
        }

        .dna-strand::before {
          transform: translateZ(-20px) translateX(-15px);
          opacity: 0.4;
        }

        .dna-strand::after {
          transform: translateZ(-40px) translateX(-30px);
          opacity: 0.2;
        }

        @keyframes dna-wave {
          0%, 100% { transform: translateY(0) rotateY(0deg); opacity: 0.3; }
          50% { transform: translateY(-100px) rotateY(180deg); opacity: 0.8; }
        }

        @media (prefers-reduced-motion: reduce) {
          .dna-strand { animation: none !important; }
        }
      `}</style>
    </div>
  );
}