/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          900: '#111827',
          800: '#1f2937',
          700: '#374151',
          500: '#6b7280',
          400: '#9ca3af',
          100: '#f3f4f6',
        },
      },
    },
  },
  plugins: [],
}
