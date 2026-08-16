/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'void-black': '#000000',
        'edu-gray':   '#A0A0A0',
        'edu-border': '#1A1A1A',
      },
      fontFamily: {
        'orbitron':     ['Orbitron', 'monospace'],
        'space-grotesk':['Space Grotesk', 'sans-serif'],
        'space-mono':   ['Space Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
