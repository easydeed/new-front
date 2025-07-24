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
        // Mercedes F1-Inspired Flat Tech Colors
        primary: '#111827',        // Charcoal base (Mercedes black livery)
        accent: '#00A19B',         // Petronas teal (vibrant but professional)
        secondary: '#565F64',      // Dark gray (Mercedes details)
        background: '#F3F4F6',     // Light gray (neutral slate)
        surface: '#FFFFFF',        // Pure white (cards)
        silver: '#C8CCCE',         // Silver highlights (Silver Arrows heritage)
        text: {
          primary: '#111827',      // Charcoal (main text)
          secondary: '#565F64',    // Dark gray (secondary text)
        },
        // Remove gradient references - flat design only
        flat: {
          charcoal: '#111827',
          teal: '#00A19B',
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