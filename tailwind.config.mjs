/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        // Brand tokens — keep these as the single source of truth for colour.
        navy: {
          DEFAULT: '#0A1F44',
          light: '#12305F',
        },
        amber: {
          DEFAULT: '#F59E0B',
          dark: '#D97706',
        },
        surface: '#F8FAFC',
        ink: {
          DEFAULT: '#1E293B',
          light: '#64748B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(10, 31, 68, 0.06), 0 4px 16px rgba(10, 31, 68, 0.06)',
        'card-hover': '0 2px 4px rgba(10, 31, 68, 0.08), 0 12px 24px rgba(10, 31, 68, 0.10)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
      },
      maxWidth: {
        content: '72rem',
      },
    },
  },
  plugins: [],
};
