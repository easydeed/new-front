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
  			brand: {
  				DEFAULT: '#2563EB',
  				blue: '#2563EB',
  				accent: '#F26B2B',
  				surface: '#F7F9FC'
  			},
  			'escrow-bg': '#F8F7F4',
  			'escrow-ink': '#0F2A3D',
  			'escrow-teal': '#0F766E',
  			'escrow-slate': '#334155',
  			'light-seafoam': '#F7F9FC',
  			'pale-slate': '#FFFFFF',
  			'deep-teal': '#2563EB',
  			'soft-cyan': '#93C5FD',
  			'gentle-indigo': '#3B82F6',
  			'dark-slate': '#1F2937',
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			'accent-soft': '#FFE9D6',
  			'slate-navy': '#37465B',
  			'charcoal-blue': '#212B38',
  			'soft-charcoal': '#2B3B4C',
  			'tropical-teal': '#08C6AB',
  			'aqua-mint': '#5AFFE7',
  			'electric-indigo': '#726EFF',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			tertiary: '#3B82F6',
  			background: 'hsl(var(--background))',
  			surface: '#FFFFFF',
  			text: {
  				primary: '#1A2A3A',
  				secondary: '#4A5DBF',
  				dark: '#1A2A3A',
  				light: '#FFFFFF'
  			},
  			tech: {
  				'light-seafoam': '#F7F9FC',
  				'pale-slate': '#FFFFFF',
  				'deep-teal': '#2563EB',
  				'soft-cyan': '#93C5FD',
  				'gentle-indigo': '#3B82F6'
  			},
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		fontFamily: {
  			inter: [
  				'Inter',
  				'Segoe UI',
  				'system-ui',
  				'sans-serif'
  			],
  			sans: [
  				'Inter',
  				'Segoe UI',
  				'system-ui',
  				'sans-serif'
  			]
  		},
  		animation: {
  			'fade-in': 'fadeIn 0.3s ease-out'
  		},
  		keyframes: {
  			fadeIn: {
  				'0%': {
  					opacity: '0'
  				},
  				'100%': {
  					opacity: '1'
  				}
  			}
  		},
  		backgroundImage: {},
  		backgroundSize: {},
  		boxShadow: {
  			elevated: '0 1px 2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.10)',
  			soft: '0 10px 30px rgba(2,6,23,0.08)',
  			glow: '0 10px 40px rgba(37, 99, 235, 0.25)'
  		},
  		blur: {
  			xs: '2px'
  		},
  		scale: {},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
  			xl: '16px',
  			'2xl': '24px'
  		}
  	}
  },
  darkMode: ['class', "class"],
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography")
  ],
} 