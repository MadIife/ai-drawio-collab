<template>
  <div class="min-h-screen bg-gray-50 p-4">
    <n-h1>Sandbox: iframe 通信测试</n-h1>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2">
        <n-card title="Draw.io Editor" size="small">
          <iframe
            ref="iframeRef"
            :src="embedUrl"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            title="draw.io Diagram Editor"
            class="w-full border rounded"
            style="height: 600px"
          />
        </n-card>
      </div>

      <div class="space-y-4">
        <n-card title="控制面板" size="small">
          <div class="space-y-2">
            <n-button type="primary" block :loading="isExporting" @click="handleExport">
              触发 Export
            </n-button>
            <n-button type="info" block @click="handleLoad">
              发送 Load（加载示例图）
            </n-button>
            <n-button type="warning" block @click="handleStatus">
              发送 Status 消息
            </n-button>
          </div>
        </n-card>

        <n-card title="事件日志" size="small">
          <template #header-extra>
            <n-button size="tiny" @click="eventLogs = []">清空</n-button>
          </template>
          <div class="max-h-96 overflow-y-auto text-xs font-mono space-y-1">
            <div v-if="eventLogs.length === 0" class="text-gray-400">暂无事件</div>
            <div
              v-for="(log, index) in eventLogs"
              :key="index"
              class="p-1 rounded"
              :class="log.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'"
            >
              <span class="font-bold">[{{ log.time }}]</span>
              <span class="ml-1">{{ log.msg }}</span>
            </div>
          </div>
        </n-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NH1, NCard, NButton } from 'naive-ui'
import { useDrawioMessage } from '../../composables/useDrawioMessage'
import type { EventExportPayload, DrawioErrorPayload } from '../../components/drawio-canvas/types'

const SAMPLE_XML = `<mxCell id="2" value="Hello World" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="1"><mxGeometry x="40" y="40" width="120" height="60" as="geometry"/></mxCell>`

const embedUrl = computed(() => {
  const url = new URL('https://embed.diagrams.net/')
  url.searchParams.set('embed', '1')
  url.searchParams.set('proto', 'json')
  url.searchParams.set('spin', '1')
  return url.toString()
})

const iframeRef = ref<HTMLIFrameElement | null>(null)
const isExporting = ref(false)
const eventLogs = ref<Array<{ time: string; msg: string; type: string }>>([])

function addLog(msg: string, type = 'info') {
  const now = new Date()
  const time = now.toLocaleTimeString('zh-CN', { hour12: false })
  eventLogs.value.push({ time, msg, type })
}

const { sendAction, requestExport } = useDrawioMessage(iframeRef, {
  onInit: () => {
    addLog('draw.io 初始化完成 (init)')
  },
  onLoad: (payload) => {
    addLog(`图谱加载完成 (load), XML 长度: ${payload.xml.length}`)
  },
  onSave: (payload) => {
    addLog(`用户保存 (save), 标题: ${payload.title || '未命名'}`)
  },
  onExit: (payload) => {
    addLog(`用户退出 (exit), XML 长度: ${payload.xml.length}`)
  },
  onAutosave: (payload) => {
    addLog(`自动保存 (autosave), XML 长度: ${payload.xml.length}`)
  },
  onExport: (payload) => {
    addLog(`导出完成 (export), 格式: ${payload.format || 'xml'}`)
  },
  onError: (payload: DrawioErrorPayload) => {
    addLog(`错误: ${payload.error}${payload.message ? ` - ${payload.message}` : ''}`, 'error')
  },
  onTemplate: (payload) => {
    addLog(`模板选择 (template), 标题: ${payload.title || '未命名'}`)
  },
})

async function handleExport() {
  isExporting.value = true
  addLog('发起 Export 请求...')
  try {
    const payload = await requestExport('xml')
    addLog(`Export 成功, XML 长度: ${payload.xml.length}`)
    console.log('[Sandbox] Export XML:', payload.xml)
  } catch (err) {
    addLog(`Export 失败: ${err}`, 'error')
  } finally {
    isExporting.value = false
  }
}

function handleLoad() {
  addLog('发送 Load action...')
  sendAction({ action: 'load', xml: SAMPLE_XML, autosave: true })
}

function handleStatus() {
  addLog('发送 Status action...')
  sendAction({ action: 'status', message: 'Hello from Sandbox!' })
}
</script>