/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          500: "#7c3aed",
          600: "#6d28d9",
          300: "#c4b5fd",
        },
      },
      boxShadow: {
        soft: "0 8px 28px rgba(2,6,23,0.06)",
        "soft-dark": "0 10px 30px rgba(0,0,0,0.5)",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
