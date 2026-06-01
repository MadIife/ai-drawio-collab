<template>
  <div
    class="drawio-canvas-container"
    :style="{ height: props.height, width: props.width }"
  >
    <div v-if="isLoading" class="flex items-center justify-center h-full">
      <n-card>
        <n-spin />
      </n-card>
    </div>
    <div v-else-if="errorMessage" class="flex flex-col items-center justify-center h-full gap-4">
      <n-alert type="error" closable>
        {{ errorMessage }}
      </n-alert>
      <n-button @click="handleRetry">重试</n-button>
    </div>
    <iframe
      v-show="!isLoading && !errorMessage"
      ref="iframeRef"
      :src="embedUrl"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      title="draw.io Diagram Editor"
      class="w-full h-full border-0"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import type {
  DrawioCanvasEmits,
  DrawioUrlParams,
  ExportFormat,
  ExportOptions,
  DiagramOperation,
  EventExportPayload,
  DrawioErrorPayload,
} from './types'
import { normalizeXml } from '../../composables/useDrawioXmlPipe'
import { useDrawioMessage } from '../../composables/useDrawioMessage'
import { useDrawioOperations } from '../../composables/useDrawioOperations'

interface DrawioCanvasProps {
  initialXml?: string
  embedUrlParams?: DrawioUrlParams
  height?: string
  width?: string
  autosave?: boolean
  maxXmlSize?: number
}

const props = withDefaults(defineProps<DrawioCanvasProps>(), {
  initialXml: '',
  embedUrlParams: () => ({}),
  height: '100%',
  width: '100%',
  autosave: false,
  maxXmlSize: 1_000_000,
})

const emit = defineEmits<DrawioCanvasEmits>()

const iframeRef = ref<HTMLIFrameElement | null>(null)
const isLoading = ref(true)
const isReady = ref(false)
const errorMessage = ref<string | null>(null)

const embedUrl = computed(() => {
  const url = new URL('https://embed.diagrams.net/')
  url.searchParams.set('embed', '1')
  url.searchParams.set('proto', 'json')
  for (const [key, value] of Object.entries(props.embedUrlParams)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
})

const { sendAction, requestExport } = useDrawioMessage(iframeRef, {
  onInit: () => {
    const { result, error } = normalizeXml(props.initialXml, props.maxXmlSize)
    if (error) {
      isLoading.value = false
      errorMessage.value = error
      emit('error', { error, message: 'XML 初始化失败' })
      return
    }
    isReady.value = true
    isLoading.value = false
    emit('init')
    sendAction({ action: 'load', xml: result, autosave: props.autosave || undefined })
  },
  onLoad: (payload) => {
    isLoading.value = false
    emit('load', payload)
  },
  onSave: (payload) => {
    emit('save', payload)
  },
  onExit: (payload) => {
    emit('exit', payload)
  },
  onAutosave: (payload) => {
    emit('autosave', payload)
  },
  onExport: (payload) => {
    emit('export', payload)
  },
  onError: (payload) => {
    isLoading.value = false
    errorMessage.value = payload.message || payload.error
    emit('error', payload)
  },
  onTemplate: (payload) => {
    emit('template', payload)
  },
})

function handleRetry() {
  errorMessage.value = null
  isLoading.value = true
  if (iframeRef.value) {
    iframeRef.value.src = ''
  }
  nextTick(() => {
    if (iframeRef.value) {
      iframeRef.value.src = embedUrl.value
    }
  })
}

function loadXml(xml: string) {
  const { result, error } = normalizeXml(xml, props.maxXmlSize)
  if (error) {
    emit('error', { error, message: `XML 加载失败: ${error}` } as DrawioErrorPayload)
    return
  }
  sendAction({ action: 'load', xml: result })
}

function exportXml(format: ExportFormat, options?: ExportOptions): Promise<EventExportPayload> {
  return requestExport(format, options)
}

async function getCurrentXml(): Promise<string> {
  const payload = await requestExport('xml')
  return payload.xml
}

function mergeXml(xml: string) {
  sendAction({ action: 'merge', xml })
}

function triggerSave() {
  sendAction({ action: 'export', format: 'xml' })
}

function setEditorConfig(config: Record<string, unknown>) {
  sendAction({ action: 'configure', config })
}

async function applyOperations(ops: DiagramOperation[]) {
  const currentXml = await getCurrentXml()
  const { result: newXml, errors } = useDrawioOperations().applyOperations(currentXml, ops)
  for (const err of errors) {
    emit('error', {
      error: err.message,
      message: `操作失败: ${err.type} ${err.cellId}`,
    } as DrawioErrorPayload)
  }
  sendAction({ action: 'load', xml: newXml })
}

defineExpose({
  loadXml,
  exportXml,
  getCurrentXml,
  mergeXml,
  triggerSave,
  setEditorConfig,
  applyOperations,
})
</script>