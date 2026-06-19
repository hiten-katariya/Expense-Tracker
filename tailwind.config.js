/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#4F46E5', // Indigo 600
          600: '#7C3AED', // Violet 600
          700: '#A855F7', // Purple 500
          800: '#6D28D9',
          900: '#4C1D95',
        },
        secondary: {
          500: '#06B6D4', // Cyan 500
          600: '#14B8A6', // Teal 500
          700: '#3B82F6', // Blue 500
        },
        accent: {
          amber: '#F59E0B',
          pink: '#F472B6', // Pink 400
          'pink-dark': '#EC4899', // Pink 500
        },
        background: 'rgb(var(--background) / <alpha-value>)',
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)',
        'bg-dark': 'rgb(var(--background) / <alpha-value>)', // Fallback mapped to CSS variable
        'bg-deep': 'rgb(var(--card) / <alpha-value>)',     // Fallback mapped to CSS variable
        'bg-card': 'rgb(var(--card) / <alpha-value>)',     // Fallback mapped to CSS variable
        status: {
          success: '#10B981', // Emerald 500
          warning: '#F59E0B', // Amber 500
          danger: '#EF4444', // Red 500
        },
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'brand-glow': '0 0 48px 12px rgba(99, 102, 241, 0.2)', // Sleek brand glow mapping to indigo/violet accents
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-out': 'slideOut 0.3s ease-in',
        'fade-in': 'fadeIn 0.2s ease-out',
        'pulse-subtle': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulseSlow 8s ease-in-out infinite',
        'grid-fade': 'gridFade 4s ease-in-out infinite',
        'spin-slow': 'spin 12s linear infinite',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideOut: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(100%)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseSlow: {
          '0%, 100%': { opacity: '0.2', transform: 'scale(1)' },
          '50%': { opacity: '0.4', transform: 'scale(1.05)' },
        },
        gridFade: {
          '0%, 100%': { opacity: '0.04' },
          '50%': { opacity: '0.12' },
        },
      },
    },
  },
  plugins: [],
}
