// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{html,js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
       backgroundImage: {
        'hero-pattern': "url('/img/1.jpg')",
        'footer-texture': "url('/img/1.jpg')",
    },
  },
},
  plugins: [],
};
