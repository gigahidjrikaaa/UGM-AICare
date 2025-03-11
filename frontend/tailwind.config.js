module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ugm: {
          blue: {
            DEFAULT: '#001D58',
            dark: '#00134A',
            light: '#1C3C80'
          },
          gold: {
            DEFAULT: '#FFCA40',
            dark: '#FFAB00',
            light: '#FFE08C'
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}