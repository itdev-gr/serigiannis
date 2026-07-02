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
          DEFAULT: '#000000',
          hover: '#333535',
        },
        sea: '#d4002a',
        cta: {
          DEFAULT: '#d4002a',
          hover: '#a80020',
        },
        red: {
          DEFAULT: '#d4002a',
          hover: '#a80020',
        },
        gold: {
          DEFAULT: '#fcb900',
          hover: '#e6a800',
        },
        amber: '#f99a00',
        background: '#f4f4f4',
        surface: '#ffffff',
        body: '#333535',
        muted: '#5f6b73',
        olive: '#3f7d58',
        'deep-ink': '#000000',
        border: 'rgba(0, 0, 0, 0.10)',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
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
        card: '0 1px 2px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 14px 32px -16px rgba(0, 0, 0, 0.20)',
        cta: 'none',
        gold: '0 8px 20px -8px rgba(252, 185, 0, 0.35)',
      },
      backgroundImage: {
        'mesh-blue':
          'linear-gradient(160deg, #000000, #333535)',
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
