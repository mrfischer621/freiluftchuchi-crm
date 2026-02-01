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
      // Swiss Spatial 2026 Design System - "Freiluftchuchi Sage"
      // Organic Modernism • Micro-Depth • Color-Tinted Shadows
      // ==========================================
      colors: {
        // Legacy support
        'freiluft': '#5c888f',

        // -----------------------------------------------------------------
        // SAGE PALETTE: Organic, desaturated green with warm undertones
        // Fresh but professional - the signature Freiluftchuchi identity
        // -----------------------------------------------------------------
        sage: {
          50: '#f4f6f3',           // Whisper - barely-there sage tint
          100: '#e6ebe3',          // Mist - soft background
          200: '#ced9c7',          // Dew - subtle accent
          300: '#aec2a3',          // Herb - gentle highlight
          400: '#8aa67c',          // Meadow - secondary actions
          500: '#6b8a5e',          // Core Sage - primary brand
          600: '#547047',          // Forest - hover state
          700: '#435839',          // Deep - pressed state
          800: '#38472f',          // Shadow - dark accents
          900: '#2f3a28',          // Night - darkest tone
        },

        // Swiss Spatial: Sidebar (Dark with subtle sage undertone)
        sidebar: {
          bg: '#1a1f1c',           // Sage-tinted dark
          hover: '#252b26',        // Subtle lift
          text: '#9ca3a0',         // Sage-gray
          'text-active': '#ffffff',
          border: '#252b26',
        },

        // Swiss Spatial: Surface System
        surface: {
          base: '#f7f8f6',         // Warm off-white (app background)
          card: '#ffffff',         // Pure white cards
          floating: 'rgba(255, 255, 255, 0.95)', // Translucent floating panels
          inset: '#f0f2ee',        // Recessed areas
          border: '#e2e5df',       // Sage-tinted borders
          'dark': '#252b26',       // Dark mode surface
        },

        // Swiss Spatial: App Background (maps to surface.base)
        app: {
          bg: '#f7f8f6',           // Warm off-white
          'bg-dark': '#1a1f1c',    // Dark mode background
        },

        // Swiss Spatial: Brand (References Sage Palette)
        brand: {
          light: '#e6ebe3',        // sage-100
          DEFAULT: '#6b8a5e',      // sage-500 - Core brand
          dark: '#547047',         // sage-600 - Hover
          darker: '#435839',       // sage-700 - Pressed
        },

        // -----------------------------------------------------------------
        // SEMANTIC COLORS: Harmonized with Sage palette
        // -----------------------------------------------------------------
        success: {
          light: '#ecf5e8',        // Sage-tinted mint
          DEFAULT: '#4ade80',      // Fresh green (green-400)
          dark: '#166534',         // Deep forest (green-800)
        },
        warning: {
          light: '#fef9e7',        // Warm cream
          DEFAULT: '#facc15',      // Golden yellow (yellow-400)
          dark: '#854d0e',         // Amber brown (yellow-800)
        },
        danger: {
          light: '#fef1f1',        // Soft rose
          DEFAULT: '#f87171',      // Coral red (red-400)
          dark: '#991b1b',         // Deep crimson (red-800)
        },

        // Swiss Spatial: Content Text
        content: {
          heading: '#1a1f1c',      // Darkest sage for titles
          body: '#374038',         // Readable body text
          secondary: '#5c665e',    // Muted secondary
          tertiary: '#8a948c',     // Hints and placeholders
          inverse: '#f7f8f6',      // For dark backgrounds
        },

        // Legacy text mapping (for compatibility)
        text: {
          primary: '#1a1f1c',
          secondary: '#5c665e',
          tertiary: '#8a948c',
          inverse: '#f7f8f6',
        },
      },

      // -----------------------------------------------------------------
      // SPATIAL SHADOWS: Color-tinted for depth and sophistication
      // Uses sage undertones instead of pure gray/black
      // -----------------------------------------------------------------
      boxShadow: {
        // Resting state - minimal lift
        'rest': '0 1px 3px 0 rgba(47, 58, 40, 0.06), 0 1px 2px 0 rgba(47, 58, 40, 0.04)',
        // Hover state - subtle elevation
        'hover': '0 4px 8px -2px rgba(47, 58, 40, 0.08), 0 2px 4px -1px rgba(47, 58, 40, 0.04)',
        // Elevated panels - clear separation
        'elevated': '0 12px 20px -4px rgba(47, 58, 40, 0.10), 0 4px 8px -2px rgba(47, 58, 40, 0.05)',
        // Floating elements - prominent lift
        'floating': '0 24px 32px -8px rgba(47, 58, 40, 0.12), 0 12px 16px -4px rgba(47, 58, 40, 0.06)',

        // Spatial UI Shadows (2026 Trend: Color-Tinted Micro-Depth)
        'spatial-1': '0 2px 8px -2px rgba(107, 138, 94, 0.15), 0 1px 3px 0 rgba(47, 58, 40, 0.06)',
        'spatial-2': '0 8px 24px -4px rgba(107, 138, 94, 0.18), 0 4px 8px -2px rgba(47, 58, 40, 0.08)',

        // Glow effects with sage brand tint
        'glow-brand': '0 0 0 3px rgba(107, 138, 94, 0.15)',
        'glow-success': '0 0 0 3px rgba(74, 222, 128, 0.15)',
        'glow-danger': '0 0 0 3px rgba(248, 113, 113, 0.15)',
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