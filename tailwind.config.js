/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Dark Mode via class toggle
  theme: {
    extend: {
      // ==========================================
      // Swiss Modern Design System 2026
      // ==========================================
      colors: {
        // Legacy support
        'freiluft': '#5c888f',

        // Swiss Modern: Sidebar (Dark)
        sidebar: {
          bg: '#0f172a',           // slate-900
          hover: '#1e293b',        // slate-800
          text: '#94a3b8',         // slate-400
          'text-active': '#ffffff',
          border: '#1e293b',       // slate-800
        },

        // Swiss Modern: App Background
        app: {
          bg: '#f8fafc',           // slate-50 (main content area)
          'bg-dark': '#0f172a',    // Dark mode background
        },

        // Swiss Modern: Surfaces (Cards, Modals)
        surface: {
          DEFAULT: '#ffffff',
          inset: '#f1f5f9',        // slate-100
          border: '#e2e8f0',       // slate-200
          'dark': '#1e293b',       // Dark mode surface
        },

        // Swiss Modern: Brand/Accent (High Contrast Active States)
        brand: {
          light: '#dbeafe',        // blue-100 (subtle backgrounds)
          DEFAULT: '#2563eb',      // blue-600 (primary action, active nav)
          dark: '#1d4ed8',         // blue-700 (hover)
          darker: '#1e40af',       // blue-800 (pressed)
        },

        // Swiss Modern: Semantic Colors
        success: {
          light: '#dcfce7',
          DEFAULT: '#16a34a',      // green-600
          dark: '#15803d',
        },
        warning: {
          light: '#fef3c7',
          DEFAULT: '#d97706',      // amber-600
          dark: '#b45309',
        },
        danger: {
          light: '#fee2e2',
          DEFAULT: '#dc2626',      // red-600
          dark: '#b91c1c',
        },

        // Swiss Modern: Text Palette
        text: {
          primary: '#0f172a',      // slate-900
          secondary: '#475569',    // slate-600
          tertiary: '#94a3b8',     // slate-400
          inverse: '#f8fafc',      // For dark backgrounds
        },
      },

      // Enhanced Shadow System (Swiss Modern Depth)
      boxShadow: {
        'rest': '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'elevated': '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
        'floating': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        // Swiss Modern: Glow effect for active elements
        'glow-brand': '0 0 0 3px rgba(37, 99, 235, 0.15)',
        'glow-success': '0 0 0 3px rgba(22, 163, 74, 0.15)',
        'glow-danger': '0 0 0 3px rgba(220, 38, 38, 0.15)',
      },

      // Typography (Neo-Grotesk)
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      letterSpacing: {
        'tighter': '-0.025em',
      },

      // Swiss Modern: Border Radius
      borderRadius: {
        'card': '12px',
        'xl': '12px',
        'button': '8px',
        'input': '6px',
      },

      // Swiss Modern: Bento Grid Gaps
      gap: {
        'bento': '16px',
        'bento-lg': '24px',
      },

      // Swiss Modern: Transitions
      transitionTimingFunction: {
        'swiss': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        'fast': '150ms',
        'normal': '200ms',
      },
    },
  },
  plugins: [],
}
