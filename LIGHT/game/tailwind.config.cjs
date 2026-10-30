// (10) Tailwind bundled at build time (was cdn.tailwindcss.com) so the game runs fully offline / on itch.
module.exports = {
  content: ['./index.html', './App.tsx', './index.tsx', './components/**/*.{ts,tsx}', './hooks/**/*.ts', './*.ts'],
  theme: { extend: {} },
  plugins: [],
};
