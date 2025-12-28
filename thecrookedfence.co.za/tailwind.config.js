export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brandGreen: "#3a5a3c",
        brandBeige: "#ebdbb6",
        brandCream: "#f7f4eb"
      },
      fontFamily: {
        sans: [
          "'Nunito Sans'",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "sans-serif"
        ]
      }
    }
  },
  plugins: []
};
