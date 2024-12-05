/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
<<<<<<< Updated upstream
    extend: {},
=======
    extend: {
      screens: {
        'xxs': '320px',  // Extra Extra Small screens
        'xs': '480px',   // Extra Small screens
      },
      colors: {
          'customBlue': '#16689B',
          'customLightBlue': '#92B6C3',
        },
      spacing: {
        ...Array.from({ length: 1000 }, (_, i) => i + 1).reduce(
          (acc, val) => ({
            ...acc,
            [val]: `${val}px`, // e.g., '1': '1px', '200': '200px'
          }),
          {} // Initial accumulator value for reduce
        ),
      },
    },
>>>>>>> Stashed changes
  },
  plugins: [],
};
