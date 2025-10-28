import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 24Rx Design System
        'orbital-white': '#FCFDFD',
        'cloud-gray': '#E6E9ED',
        'deep-navy': '#0C223E',
        'slate': '#465569',
        'steel': '#747F8F',
        'gold': '#D4AF37',
        'gold-dark': '#B08D2A',
        'navy-gradient-start': '#0E2C52',
        'navy-gradient-end': '#0A1E3A',
        // Keep shadcn compatibility
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
      },
      fontFamily: {
        'space': ['Space Grotesk', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #D4AF37 0%, #B08D2A 100%)',
        'navy-gradient': 'linear-gradient(160deg, #0E2C52 0%, #0A1E3A 100%)',
      },
      boxShadow: {
        'light': '0 10px 26px rgba(12, 34, 62, 0.08)',
        'dark': '0 12px 30px rgba(0, 0, 0, 0.35)',
      },
      borderRadius: {
        'card': '20px',
        'button': '16px',
        'input': '12px',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      animation: {
        'spin': 'spin 1s linear infinite',
        'spin-slow': 'spin 1.8s linear infinite',
        'orbit': 'orbit 1.8s linear infinite',
        'marquee': 'marquee 1.1s ease-in-out infinite',
        'ellipsis': 'ellipsis 1.2s steps(1,end) infinite',
        'shine': 'shine 1.6s ease-in-out infinite',
        'ping': 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'progress': 'progress 1.5s ease-in-out infinite',
      },
      keyframes: {
        progress: {
          '0%': { transform: 'translateX(-100%)' },
          '50%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        orbit: {
          from: { transform: 'rotate(0deg) translateY(0) rotate(0deg)' },
          to: { transform: 'rotate(360deg) translateY(0) rotate(-360deg)' },
        },
        marquee: {
          from: { transform: 'translateX(0%)' },
          to: { transform: 'translateX(180%)' },
        },
        ellipsis: {
          '0%': { boxShadow: '0 0 currentColor, 6px 0 transparent, 12px 0 transparent' },
          '33%': { boxShadow: '0 0 currentColor, 6px 0 currentColor, 12px 0 transparent' },
          '66%': { boxShadow: '0 0 currentColor, 6px 0 currentColor, 12px 0 currentColor' },
          '100%': { boxShadow: '0 0 currentColor, 6px 0 transparent, 12px 0 transparent' },
        },
        shine: {
          '0%': { filter: 'brightness(1)' },
          '50%': { filter: 'brightness(1.25)' },
          '100%': { filter: 'brightness(1)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
