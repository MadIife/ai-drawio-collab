import type { Config } from 'tailwindcss'

export default <Config>{
  content: [
    './app.vue',
    './components/**/*.{vue,ts}',
    './pages/**/*.vue',
    './plugins/**/*.ts',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}