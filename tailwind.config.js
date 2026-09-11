/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#eef2f8', 100: '#d7e0ee', 200: '#b0c1dd', 300: '#88a2cb',
          400: '#5c7fb3', 500: '#3d5f95', 600: '#2c4a78', 700: '#1f3760',
          800: '#162648', 900: '#0d1830', 950: '#080f1e',
        },
        govblue: {
          50: '#eef4fb', 100: '#d7e6f5', 200: '#b0cdec', 300: '#82afdf',
          400: '#548fd0', 500: '#3572bd', 600: '#265aa0', 700: '#1e4680',
          800: '#193a68', 900: '#152f54',
        },
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(15, 23, 42, 0.06), 0 1px 3px 0 rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
