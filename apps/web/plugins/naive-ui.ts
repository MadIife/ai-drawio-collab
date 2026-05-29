import { setup } from '@css-render/vue3-ssr'
import { defineNuxtPlugin } from '#app'

export default defineNuxtPlugin((nuxtApp) => {
  if (process.client) {
    return
  }

  const { collect } = setup(nuxtApp.vueApp)
  const originalRender = nuxtApp.ssrContext?.render

  if (originalRender) {
    nuxtApp.ssrContext!.render = () => {
      const result = originalRender()
      const style = collect()

      if (typeof result === 'object' && 'html' in result) {
        return {
          ...result,
          html: result.html?.replace('</head>', `${style}</head>`),
        }
      }

      return result
    }
  }
})