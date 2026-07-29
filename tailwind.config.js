/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './contexts/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './config/**/*.{ts,tsx}',
    './utils/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
    './schemas/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0D9488', // teal-600
        secondary: '#0F766E', // teal-700
        accent: '#F59E0B', // amber-500
      },
    },
  },
  plugins: [],
};
