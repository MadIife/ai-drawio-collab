// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss'],

  css: ['~/assets/css/main.css'],

  tailwindcss: {
    configPath: 'tailwind.config.ts',
  },

  build: {
    transpile: ['naive-ui', 'vueuc', '@css-render/vue3-ssr'],
  },

  vite: {
    optimizeDeps: {
      include: ['vueuc'],
    },
  },

  compatibilityDate: '2026-05-28',
})