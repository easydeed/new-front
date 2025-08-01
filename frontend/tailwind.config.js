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
        'soft-charcoal': '#2B3B4C',   // Softer card backgrounds
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
        'inter': ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'fade-in-up': 'fadeInUp 0.6s ease-out',
        'float': 'float 3s ease-in-out infinite',
        'scale-up': 'scaleUp 0.2s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'slide-in-left': 'slideInLeft 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.5s ease-out',
        'bounce-subtle': 'bounceSubtle 1s ease-in-out infinite',
        'rotate-slow': 'rotateSlow 10s linear infinite',
        'gradient-shift': 'gradientShift 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        scaleUp: {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.05)' },
        },
        pulseGlow: {
          '0%, 100%': { 
            boxShadow: '0 0 20px rgba(8, 198, 171, 0.3)' 
          },
          '50%': { 
            boxShadow: '0 0 30px rgba(8, 198, 171, 0.6), 0 0 40px rgba(90, 255, 231, 0.3)' 
          },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        bounceSubtle: {
          '0%, 20%, 50%, 80%, 100%': { transform: 'translateY(0)' },
          '40%': { transform: 'translateY(-5px)' },
          '60%': { transform: 'translateY(-3px)' },
        },
        rotateSlow: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      backgroundImage: {
        'gradient-teal': 'linear-gradient(135deg, #08C6AB 0%, #5AFFE7 100%)',
        'gradient-indigo': 'linear-gradient(135deg, #726EFF 0%, #5AFFE7 100%)',
        'gradient-dark': 'linear-gradient(135deg, #212B38 0%, #37465B 100%)',
        'gradient-animated': 'linear-gradient(-45deg, #08C6AB, #5AFFE7, #726EFF, #08C6AB)',
        'tech-mesh': 'radial-gradient(circle at 20% 50%, rgba(8, 198, 171, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(114, 110, 255, 0.1) 0%, transparent 50%), radial-gradient(circle at 40% 80%, rgba(90, 255, 231, 0.1) 0%, transparent 50%)',
      },
      backgroundSize: {
        'gradient-animated': '400% 400%',
      },
      boxShadow: {
        'glow-teal': '0 0 20px rgba(8, 198, 171, 0.4)',
        'glow-indigo': '0 0 20px rgba(114, 110, 255, 0.4)',
        'glow-mint': '0 0 20px rgba(90, 255, 231, 0.4)',
        'inner-glow': 'inset 0 2px 4px 0 rgba(8, 198, 171, 0.1)',
        'elevated': '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
      },
      blur: {
        'xs': '2px',
      },
      scale: {
        '102': '1.02',
        '103': '1.03',
      },
    },
  },
  darkMode: 'class',
  plugins: [],
} 