/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "selector",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#ecfeff",
          100: "#cffafe",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
        },
      },
    },
  },
  plugins: [],
};
