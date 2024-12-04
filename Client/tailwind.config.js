module.exports = {
  content: [
    "./src/**/*.{html,js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        colors: {
          'customBlue': '#16689B',
          'customLightBlue': '#C5D6DC',
        },
        'xxs': '320px',  // Extra Extra Small screens
        'xs': '480px',   // Extra Small screens
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
  },
  plugins: [],
};
