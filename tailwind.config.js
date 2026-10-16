import defaultColors from 'tailwindcss/colors';

// Colores como variables CSS (canales RGB) para que el modo oscuro tenga su propia paleta
// sin tocar componentes. Valores en index.css: :root = modo claro (idéntico al original),
// html.dark = paleta oscura.
const v = (name) => `rgb(var(${name}) / <alpha-value>)`;

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
      fontFamily: {
        sans: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: v('--c-primary'),     // claro: teal-600 #0D9488
        secondary: v('--c-secondary'), // claro: teal-700 #0F766E
        accent: '#F59E0B', // amber-500
        // Solo los tonos oscuros (fondos/bordes del modo oscuro) son variables; el resto, Tailwind.
        neutral: {
          ...defaultColors.neutral,
          600: v('--n-600'),
          700: v('--n-700'),
          800: v('--n-800'),
          900: v('--n-900'),
          950: v('--n-950'),
        },
      },
    },
  },
  plugins: [],
};
