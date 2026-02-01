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

        // Swiss Modern: Brand/Accent (Professional Grey-Blue)
        brand: {
          light: '#eff6ff',        // blue-50 (sanfter)
          DEFAULT: '#3b82f6',      // blue-500 (weicher als blue-600)
          dark: '#2563eb',         // blue-600
          darker: '#1d4ed8',       // blue-700
        },

        // -----------------------------------------------------------------
        // UPDATED: Entsättigte Palette (Roadmap Phase 5.5)
        // Professional Grey-Blue Töne, weich und dezent
        // -----------------------------------------------------------------
        success: {
          light: '#ecfdf5',        // Sehr helles Mint (Emerald-50)
          DEFAULT: '#34d399',      // Sanftes Mint-Grün (Emerald-400)
          dark: '#047857',         // Gedämpftes Dunkelgrün (Emerald-700)
        },
        warning: {
          light: '#fffbeb',        // Sehr helles Creme (Amber-50)
          DEFAULT: '#fbbf24',      // Weiches Gold (Amber-400)
          dark: '#92400e',         // Gedämpftes Braun-Orange (Amber-800)
        },
        danger: {
          light: '#fef2f2',        // Sehr helles Rosa (Red-50)
          DEFAULT: '#f87171',      // Weiches Korall-Rot (Red-400)
          dark: '#991b1b',         // Gedämpftes Dunkelrot (Red-800)
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
        // Glow effects angepasst auf die neuen Farben (dezenter)
        'glow-brand': '0 0 0 3px rgba(37, 99, 235, 0.12)',
        'glow-success': '0 0 0 3px rgba(52, 211, 153, 0.12)', // Updated to match Emerald-400
        'glow-danger': '0 0 0 3px rgba(248, 113, 113, 0.12)', // Updated to match Red-400
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