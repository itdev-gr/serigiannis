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
          DEFAULT: '#00519d',
          hover: '#00296b',
        },
        sea: '#4d83c9',
        cta: {
          DEFAULT: '#00519d',
          hover: '#00296b',
        },
        gold: {
          DEFAULT: '#f99a00',
          hover: '#df8500',
        },
        amber: '#f99a00',
        background: '#f4f7fb',
        surface: '#ffffff',
        body: '#16233b',
        muted: '#5b6b82',
        olive: '#3f7d58',
        'deep-ink': '#00296b',
        border: 'rgba(0, 41, 107, 0.12)',
      },
      fontFamily: {
        display: ['Poppins', 'system-ui', 'sans-serif'],
        sans: ['"Open Sans"', 'system-ui', '-apple-system', 'sans-serif'],
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
        card: '0 1px 2px rgba(0, 41, 107, 0.05)',
        'card-hover': '0 20px 40px -12px rgba(0, 41, 107, 0.18)',
        cta: '0 8px 20px -6px rgba(0, 81, 157, 0.35)',
        gold: '0 8px 20px -6px rgba(249, 154, 0, 0.4)',
      },
      backgroundImage: {
        'mesh-blue':
          'radial-gradient(60% 80% at 20% 10%, #4d83c9 0%, transparent 60%), radial-gradient(50% 70% at 90% 20%, #00519d 0%, transparent 55%), linear-gradient(160deg, #00296b, #00519d)',
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
