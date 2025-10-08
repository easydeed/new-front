/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}", 
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Escrow-First Palette (Phase 9)
        'escrow-bg': '#F8F7F4',       // Paper background (warm beige)
        'escrow-ink': '#0F2A3D',      // Navy blue text
        'escrow-teal': '#0F766E',     // Seal teal CTA
        'escrow-slate': '#334155',    // Secondary text
        
        // Flatter, softer palette for improved readability and low visual noise
        'light-seafoam': '#F7F9FC',   // Very light, neutral page background
        'pale-slate': '#FFFFFF',      // Card/surface background
        'deep-teal': '#2563EB',       // Primary action (shifted to gentle blue)
        'soft-cyan': '#93C5FD',       // Hover/secondary accents (light blue)
        'gentle-indigo': '#3B82F6',   // Links/CTAs
        'dark-slate': '#1F2937',      // Primary text
        // Accent (subtle, elegant)
        'accent': '#F57C00',          // Orange accent
        'accent-soft': '#FFE9D6',     // Very light accent background
        
        // Keep original dark colors for dark mode support
        'slate-navy': '#37465B',      // Dark mode card backgrounds
        'charcoal-blue': '#212B38',   // Dark mode main background
        'soft-charcoal': '#2B3B4C',   // Dark mode softer backgrounds
        'tropical-teal': '#08C6AB',   // Dark mode primary accent
        'aqua-mint': '#5AFFE7',       // Dark mode highlights
        'electric-indigo': '#726EFF', // Dark mode CTAs
        
        // Legacy support for existing components (mapped to new flat palette)
        primary: '#2563EB',           // Primary blue
        secondary: '#93C5FD',         // Light blue
        tertiary: '#3B82F6',          // CTA/link blue
        background: '#F7F9FC',        // Page background
        surface: '#FFFFFF',           // Card/surface
        text: {
          primary: '#1A2A3A',         // Dark text for light backgrounds
          secondary: '#4A5DBF',       // Gentle indigo for highlights
          dark: '#1A2A3A',            // Dark text
          light: '#FFFFFF',           // White text for dark mode
        },
        // Updated tech palette
        tech: {
          'light-seafoam': '#F7F9FC',
          'pale-slate': '#FFFFFF',
          'deep-teal': '#2563EB',
          'soft-cyan': '#93C5FD',
          'gentle-indigo': '#3B82F6',
        }
      },
      fontFamily: {
        'inter': ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      // Keep animations defined, but we will reduce their usage in components
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      backgroundImage: {},
      backgroundSize: {},
      boxShadow: {
        // Subtle shadow only
        'elevated': '0 1px 2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.10)'
      },
      blur: {
        'xs': '2px',
      },
      scale: {},
    },
  },
  darkMode: 'class',
  plugins: [],
} 