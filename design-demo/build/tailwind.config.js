module.exports = {
  content: ["../template.html"],
  theme: {
    extend: {
      colors: {
        slate: Object.fromEntries([50,100,200,300,400,500,600,700,800,900].map((n) => [n, `rgb(var(--s${n}) / <alpha-value>)`])),
        brand: Object.fromEntries([50,100,600,700,900].map((n) => [n, `rgb(var(--b${n}) / <alpha-value>)`])),
        accent: "rgb(var(--acc) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Unbounded", "Manrope", "sans-serif"],
      },
    },
  },
};
