/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        healthcare: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          350: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          550: '#0d9488',
          600: '#0f766e',
          700: '#115e59',
          800: '#134e4a',
          900: '#1e3a3a',
          950: '#0f1f1f',
        }
      }
    },
  },
  plugins: [],
}
