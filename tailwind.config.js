/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Noto Sans JP', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#14213d',
        panel: '#ffffff',
        line: '#d8dee9',
        mint: '#00a896',
        coral: '#f25f5c',
        gold: '#f7b801',
        sky: '#277da1',
      },
    },
  },
  plugins: [],
};
