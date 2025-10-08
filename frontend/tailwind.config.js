/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Base blue theme
        base: {
          50: '#E6F0FF',
          100: '#CCE0FF',
          200: '#99C2FF',
          300: '#66A3FF',
          400: '#3385FF',
          500: '#0052FF', // Base primary
          600: '#0042CC',
          700: '#003199',
          800: '#002166',
          900: '#001033',
        },
        // Arbitrum teal theme
        arbitrum: {
          50: '#E6F2F5',
          100: '#CCE5EB',
          200: '#99CBD7',
          300: '#66B1C3',
          400: '#3397AF',
          500: '#2D374B', // Arbitrum primary
          600: '#242C3C',
          700: '#1B212D',
          800: '#12161E',
          900: '#090B0F',
        },
        // Game tiles
        tile: {
          0: '#CDC1B4',
          2: '#EEE4DA',
          4: '#EDE0C8',
          8: '#F2B179',
          16: '#F59563',
          32: '#F67C5F',
          64: '#F65E3B',
          128: '#EDCF72',
          256: '#EDCC61',
          512: '#EDC850',
          1024: '#EDC53F',
          2048: '#EDC22E',
          4096: '#3C3A32',
        },
      },
      boxShadow: {
        glow: '0 0 20px rgba(0, 82, 255, 0.5)',
        'glow-arbitrum': '0 0 20px rgba(45, 55, 75, 0.5)',
        'glow-tile': '0 0 15px rgba(237, 194, 46, 0.6)',
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-in',
        'pop': 'pop 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'merge': 'merge 0.15s ease-out',
      },
      keyframes: {
        slideUp: {
          from: { opacity: 0, transform: 'translateY(10px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        pop: {
          '0%': { transform: 'scale(0)' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)' },
        },
        merge: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.2)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}

