import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      // ── Noori Design Tokens ──────────────────────────────
      colors: {
        // Base
        background: {
          DEFAULT: '#0E0F11',
          surface: '#161820',
          elevated: '#1C1E28',
          overlay: '#22242E',
        },
        border: {
          DEFAULT: '#1E2028',
          subtle: '#2A2C38',
          strong: '#3A3D4E',
        },
        // Accent — warm amber
        amber: {
          50:  '#FFFBF0',
          100: '#FEF3CC',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F5A623',  // PRIMARY ACCENT
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },
        // Text
        foreground: {
          DEFAULT: '#F0EEE6',
          muted: '#7A7D8A',
          subtle: '#4A4D5C',
        },
        // Semantic
        success: {
          DEFAULT: '#22C55E',
          muted: '#16A34A20',
          text: '#4ADE80',
        },
        danger: {
          DEFAULT: '#EF4444',
          muted: '#EF444420',
          text: '#F87171',
        },
        info: {
          DEFAULT: '#4F8EF7',
          muted: '#4F8EF720',
          text: '#93C5FD',
        },
        warning: {
          DEFAULT: '#F59E0B',
          muted: '#F59E0B20',
          text: '#FCD34D',
        },
      },

      // ── Typography ───────────────────────────────────────
      fontFamily: {
        sora: ['Sora', 'sans-serif'],
        dm: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },

      // ── Spacing / Radius ─────────────────────────────────
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
        '2xl': '28px',
      },

      // ── Animations ───────────────────────────────────────
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-amber': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(245,166,35,0)' },
          '50%': { boxShadow: '0 0 0 8px rgba(245,166,35,0.08)' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out forwards',
        'fade-in-up': 'fade-in-up 0.5s ease-out forwards',
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-amber': 'pulse-amber 2s ease-in-out infinite',
        'spin-slow': 'spin-slow 8s linear infinite',
      },

      // ── Box shadows ──────────────────────────────────────
      boxShadow: {
        'glow-amber': '0 0 40px rgba(245,166,35,0.12)',
        'glow-amber-sm': '0 0 20px rgba(245,166,35,0.08)',
        'surface': '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        'elevated': '0 4px 16px rgba(0,0,0,0.5)',
      },

      // ── Background patterns ──────────────────────────────
      backgroundImage: {
        'grid-pattern': `linear-gradient(rgba(245,166,35,0.03) 1px, transparent 1px),
                         linear-gradient(90deg, rgba(245,166,35,0.03) 1px, transparent 1px)`,
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'shimmer-gradient': 'linear-gradient(90deg, transparent 0%, rgba(245,166,35,0.06) 50%, transparent 100%)',
      },
      backgroundSize: {
        'grid': '32px 32px',
      },
    },
  },
  plugins: [animate],
}

export default config
