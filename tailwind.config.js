/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        assassin: {
          red: '#B91C1C',
          'red-light': '#FEE2E2',
          'red-hover': '#991B1B',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F8F8F6',
          border: '#E5E5E5',
          hover: '#F3F3F1',
        },
        ink: {
          DEFAULT: '#0D0D0D',
          muted: '#737373',
          faint: '#A8A8A8',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-red': 'pulseRed 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseRed: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(185, 28, 28, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(185, 28, 28, 0)' },
        },
      },
    },
  },
  plugins: [],
}
