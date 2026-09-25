/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    // Grading rules, not markup: their Python slices, such as [-4:-1], read as arbitrary-property classes
    // and made junk CSS (esbuild's "-4: -1" warning).
    "!./src/checks/**",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
