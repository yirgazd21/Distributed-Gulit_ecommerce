/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Defining your brand colors based on the logo
        'gulit-green': '#2D6A4F', // Deep forest green
        'gulit-accent': '#FFB703', // The yellow/gold from the onion
        'gulit-red': '#BC4749',    // The tomato red
      },
      backgroundImage: {
        // Linking your traditional pattern image
        'tibeb-pattern': "url('/src/assets/image_899d06.png')",
      }
    },
  },
  plugins: [],
}
