/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        'toast-slide-in': {
          from: { transform: 'translateX(calc(100% + 1rem))' },
          to: { transform: 'translateX(0)' },
        },
        'toast-slide-out': {
          from: { transform: 'translateX(0)', opacity: '1' },
          to: { transform: 'translateX(calc(100% + 1rem))', opacity: '0' },
        },
        'sync-chase': {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'toast-slide-in': 'toast-slide-in 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        'toast-slide-out': 'toast-slide-out 150ms ease-in',
        'sync-chase': 'sync-chase 0.85s linear infinite',
      },
    },
  },
  plugins: [],
};
