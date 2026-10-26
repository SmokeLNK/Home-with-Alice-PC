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
        yandex: {
          bg: 'var(--color-bg)',
          sidebar: 'var(--color-sidebar)',
          card: 'var(--color-card)',
          cardHover: 'var(--color-card-hover)',
          cardActive: 'var(--color-card-active)',
          accent: 'var(--color-accent)',
          accentHover: 'var(--color-accent-hover)',
          text: 'var(--color-text)',
          subtext: 'var(--color-subtext)',
        }
      }
    },
  },
  plugins: [],
}
