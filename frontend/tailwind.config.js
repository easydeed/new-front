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
        // Mercedes F1-Inspired Flat Tech Colors + Neon Green Accent
        primary: '#111827',        // Charcoal base (Mercedes black livery)
        secondary: '#2DD4BF',      // Teal (updated to user preference)
        tertiary: '#76FF03',       // Neon Green (Matrix/GitHub inspired accent)
        background: '#F3F4F6',     // Light gray (neutral slate)
        surface: '#FFFFFF',        // Pure white (cards, contact-wrapper)
        silver: '#C8CCCE',         // Silver highlights (Silver Arrows heritage)
        text: {
          primary: '#111827',      // Charcoal (main text)
          secondary: '#565F64',    // Dark gray (secondary text)
        },
        // Flat design only - no gradients
        flat: {
          charcoal: '#111827',
          teal: '#2DD4BF',
          neon: '#76FF03',
          gray: '#565F64',
          silver: '#C8CCCE',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
} 