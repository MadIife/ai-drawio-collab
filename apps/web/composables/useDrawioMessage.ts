import { onMounted, onUnmounted, type Ref } from 'vue'
import type {
  EventLoadPayload,
  EventSavePayload,
  EventExitPayload,
  EventAutoSavePayload,
  EventExportPayload,
  EventTemplatePayload,
  DrawioErrorPayload,
  ExportFormat,
  ExportOptions,
} from '../components/drawio-canvas/types'

const VALID_ORIGIN = 'https://embed.diagrams.net'

const EXPORT_TIMEOUT_MS = 30_000

export interface DrawioMessageHandlers {
  onInit: () => void
  onLoad: (payload: EventLoadPayload) => void
  onSave: (payload: EventSavePayload) => void
  onExit: (payload: EventExitPayload) => void
  onAutosave?: (payload: EventAutoSavePayload) => void
  onExport: (payload: EventExportPayload) => void
  onError: (payload: DrawioErrorPayload) => void
  onTemplate?: (payload: EventTemplatePayload) => void
}

export function useDrawioMessage(
  iframeRef: Ref<HTMLIFrameElement | null>,
  handlers: DrawioMessageHandlers,
) {
  let pendingExportResolve: ((payload: EventExportPayload) => void) | null = null
  let pendingExportReject: ((reason: string) => void) | null = null
  let exportTimeoutId: ReturnType<typeof setTimeout> | null = null

  function cleanupPendingExport(cancelReason: string) {
    if (pendingExportReject) {
      pendingExportReject(cancelReason)
    }
    pendingExportResolve = null
    pendingExportReject = null
    if (exportTimeoutId !== null) {
      clearTimeout(exportTimeoutId)
      exportTimeoutId = null
    }
  }

  function handleMessage(event: MessageEvent) {
    if (event.origin !== VALID_ORIGIN) return

    if (event.source !== iframeRef.value?.contentWindow) return

    let data: Record<string, unknown>
    try {
      data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
    } catch {
      return
    }

    if (data.error) {
      handlers.onError(data as unknown as DrawioErrorPayload)
      return
    }

    const eventName = data.event as string | undefined

    switch (eventName) {
      case 'init':
        handlers.onInit()
        break
      case 'load':
        handlers.onLoad(data as unknown as EventLoadPayload)
        break
      case 'save':
        handlers.onSave(data as unknown as EventSavePayload)
        break
      case 'exit':
        handlers.onExit(data as unknown as EventExitPayload)
        break
      case 'autosave':
        handlers.onAutosave?.(data as unknown as EventAutoSavePayload)
        break
      case 'export':
        handlers.onExport(data as unknown as EventExportPayload)
        if (pendingExportResolve) {
          pendingExportResolve(data as unknown as EventExportPayload)
          cleanupPendingExport('')
        }
        break
      case 'template':
        handlers.onTemplate?.(data as unknown as EventTemplatePayload)
        break
    }
  }

  function sendAction(action: Record<string, unknown>) {
    iframeRef.value?.contentWindow?.postMessage(
      JSON.stringify(action),
      VALID_ORIGIN,
    )
  }

  function requestExport(
    format: ExportFormat,
    options?: ExportOptions,
  ): Promise<EventExportPayload> {
    if (pendingExportResolve || pendingExportReject) {
      cleanupPendingExport('EXPORT_CANCELLED')
    }

    return new Promise<EventExportPayload>((resolve, reject) => {
      pendingExportResolve = resolve
      pendingExportReject = reject

      sendAction({ action: 'export', format, ...options })

      exportTimeoutId = setTimeout(() => {
        cleanupPendingExport('MESSAGE_TIMEOUT')
      }, EXPORT_TIMEOUT_MS)
    })
  }

  function cleanup() {
    window.removeEventListener('message', handleMessage)
    cleanupPendingExport('COMPONENT_UNMOUNTED')
  }

  onMounted(() => {
    window.addEventListener('message', handleMessage)
  })

  onUnmounted(() => {
    cleanup()
  })

  return {
    sendAction,
    requestExport,
    cleanup,
  }
}