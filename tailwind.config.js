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
      // Swiss Modern Design System 2026 (Updated Phase 5.5)
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
          light: '#dbeafe',        // blue-100
          DEFAULT: '#2563eb',      // blue-600 (primary action)
          dark: '#1d4ed8',         // blue-700
          darker: '#1e40af',       // blue-800
        },

        // -----------------------------------------------------------------
        // UPDATED: Entsättigte Palette (Roadmap Phase 5.5)
        // Weicher, weniger "Neon", mehr "Pastell/Modern"
        // -----------------------------------------------------------------
        success: {
          light: '#d1fae5',        // Pastell Grün (Emerald-100)
          DEFAULT: '#10b981',      // Smaragd (Emerald-500) - war vorher #16a34a
          dark: '#059669',         // Emerald-700
        },
        warning: {
          light: '#fef3c7',        // Pastell Gelb (Amber-100)
          DEFAULT: '#f59e0b',      // Bernstein (Amber-500) - war vorher #d97706
          dark: '#b45309',         // Amber-700
        },
        danger: {
          light: '#fee2e2',        // Pastell Rot (Red-100)
          DEFAULT: '#ef4444',      // Weiches Rot (Red-500) - war vorher #dc2626
          dark: '#b91c1c',         // Red-700
        },
        // -----------------------------------------------------------------

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
        // Glow effects angepasst auf die neuen Farben (automatische Transparenz)
        'glow-brand': '0 0 0 3px rgba(37, 99, 235, 0.15)',
        'glow-success': '0 0 0 3px rgba(16, 185, 129, 0.15)', // Updated to match Emerald-500
        'glow-danger': '0 0 0 3px rgba(239, 68, 68, 0.15)',   // Updated to match Red-500
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