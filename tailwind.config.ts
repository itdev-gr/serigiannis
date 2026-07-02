import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1.25rem',
        sm: '1.5rem',
        lg: '2rem',
      },
      screens: {
        '2xl': '1280px',
      },
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1B3A5C',
          hover: '#152E49',
        },
        sea: '#5B9FD4',
        cta: {
          DEFAULT: '#C96A47',
          hover: '#B25939',
        },
        background: '#F7F2EB',
        surface: '#FDFCFA',
        body: '#1A1817',
        muted: '#6B6259',
        olive: '#6E7C4A',
        'deep-ink': '#0F2233',
        border: 'rgba(27, 58, 92, 0.12)',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        'display-hero': ['clamp(3.5rem, 7vw, 6rem)', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-section': ['clamp(2.5rem, 4.5vw, 3.5rem)', { lineHeight: '1.1', letterSpacing: '-0.015em', fontWeight: '600' }],
        'display-editorial': ['clamp(1.5rem, 3vw, 2rem)', { lineHeight: '1.2', fontWeight: '500' }],
      },
      spacing: {
        '18': '4.5rem',
        '30': '7.5rem',
      },
      maxWidth: {
        prose: '68ch',
        content: '1280px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 34, 51, 0.04)',
        'card-hover': '0 20px 40px -12px rgba(15, 34, 51, 0.15)',
        cta: '0 8px 16px -4px rgba(201, 106, 71, 0.35)',
      },
      transitionTimingFunction: {
        'editorial': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
