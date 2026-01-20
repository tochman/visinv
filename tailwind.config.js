/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  darkMode: 'selector', // Enable class-based dark mode (Tailwind 4.x uses 'selector', v3 uses 'class')
  theme: {
    extend: {},
  },
  plugins: [],
}
