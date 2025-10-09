/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink:  '#0F2A3D',
        slate:'#334155',
        paper:'#F8F7F4',
        teal: '#0F766E',
        ok:   '#16A34A',
        warn: '#B45309'
      },
      fontFamily: {
        heading: ['Inter','ui-sans-serif','system-ui'],
        body:    ['Source Sans 3','ui-sans-serif','system-ui'],
        mono:    ['IBM Plex Mono','ui-monospace','SFMono-Regular']
      }
    },
  },
  plugins: [],
}
