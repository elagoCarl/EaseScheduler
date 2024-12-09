module.exports = {
  content: [
    "./src/**/*.{html,js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'xxs': '320px',  // Extra Extra Small screens
        'xs': '480px',   // Extra Small screens
      },
      colors: {
        'customBlue1': '#044D7A',
        'customRed': '#B92C2C',
        'customGray': '#EFECEC',
        'customLightBlue2': '#D6F0F9',
        'customWhite': '#EFECEC'
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
