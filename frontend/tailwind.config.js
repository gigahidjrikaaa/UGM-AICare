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
          },
          aurora: {
            pink: '#FF75D1',   // Soft neon pink
            purple: '#C175FF', // Soft neon purple
            blue: '#75BFFF',   // Soft neon blue
            cyan: '#75FFEE',   // Soft neon cyan
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'border-spin': 'borderSpin 3s linear infinite', // Keep if used elsewhere
        'lightning-border': 'lightningKeyframes 1.2s infinite linear', // New lightning animation
        'aurora-flow': 'auroraKeyframes 15s ease infinite', // New aurora animation
      },
      keyframes: {
        borderSpin: {
          'to': {
            '--angle': '360deg',
          },
        },
        auroraKeyframes: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        lightningKeyframes: { // Renamed from cracklingBorder back to lightningKeyframes if you changed it
          '0%':   { '--angle': '0deg', opacity: 0.85 },
          '10%':  { '--angle': '36deg', opacity: 1 },    // Move
          '12%':  { '--angle': '33deg', opacity: 0.75 }, // Jitter back, dip opacity
          '15%':  { '--angle': '54deg', opacity: 0.95 }, // Move forward
          '25%':  { '--angle': '90deg', opacity: 1 },    // Move
          '27%':  { '--angle': '85deg', opacity: 0.8 },  // Jitter back
          '30%':  { '--angle': '108deg', opacity: 0.9 }, // Move forward
          '40%':  { '--angle': '144deg', opacity: 1 },   // Move
          '42%':  { '--angle': '140deg', opacity: 0.7 }, // Jitter back, dip
          '45%':  { '--angle': '162deg', opacity: 0.95 },// Move forward
          '55%':  { '--angle': '198deg', opacity: 1 },   // Move
          '57%':  { '--angle': '195deg', opacity: 0.85 },// Jitter back
          '60%':  { '--angle': '216deg', opacity: 0.9 }, // Move forward
          '70%':  { '--angle': '252deg', opacity: 1 },   // Move
          '72%':  { '--angle': '248deg', opacity: 0.75 },// Jitter back, dip
          '75%':  { '--angle': '270deg', opacity: 0.95 },// Move forward
          '85%':  { '--angle': '306deg', opacity: 1 },   // Move
          '87%':  { '--angle': '300deg', opacity: 0.8 }, // Jitter back
          '90%':  { '--angle': '324deg', opacity: 0.9 }, // Move forward
          '100%': { '--angle': '360deg', opacity: 0.85 },
        }
      },
    },
  },
  plugins: [],
}