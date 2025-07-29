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
        // Tech-Forward Startup-Slick Color Palette
        'slate-navy': '#37465B',      // Base/card backgrounds
        'charcoal-blue': '#212B38',   // Dark backgrounds
        'tropical-teal': '#08C6AB',   // Primary accent
        'aqua-mint': '#5AFFE7',       // Highlights/CTA hovers
        'electric-indigo': '#726EFF', // CTAs/links
        
        // Legacy support and additional colors
        primary: '#212B38',           // Main background
        secondary: '#08C6AB',         // Primary buttons
        tertiary: '#726EFF',          // CTAs/links
        background: '#212B38',        // Dark background
        surface: '#37465B',           // Card surfaces
        text: {
          primary: '#FFFFFF',         // White text for dark backgrounds
          secondary: '#5AFFE7',       // Aqua mint for highlights
          dark: '#212B38',            // Dark text for light backgrounds
        },
        // New tech palette
        tech: {
          'slate-navy': '#37465B',
          'charcoal-blue': '#212B38',
          'tropical-teal': '#08C6AB',
          'aqua-mint': '#5AFFE7',
          'electric-indigo': '#726EFF',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
} 