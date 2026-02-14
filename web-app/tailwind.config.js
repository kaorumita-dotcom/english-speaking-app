/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3B82F6',
        },
        foreground: {
          DEFAULT: '#18181B',
        },
        background: {
          DEFAULT: '#FFFFFF',
        },
        surface: {
          DEFAULT: '#F4F4F5',
        },
        muted: {
          DEFAULT: '#71717A',
        },
        border: {
          DEFAULT: '#E4E4E7',
        },
        error: {
          DEFAULT: '#EF4444',
        },
      },
    },
  },
  plugins: [],
}
