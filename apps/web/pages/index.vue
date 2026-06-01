<template>
  <div class="h-screen flex flex-col bg-gray-50">
    <header class="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3 shrink-0">
      <h1 class="text-lg font-bold text-gray-800">AI Draw.io Collab</h1>
      <div class="flex-1" />
      <n-button size="small" @click="handleSave">保存</n-button>
      <n-button size="small" @click="handleExport">导出 XML</n-button>
      <n-tag v-if="isDirty" type="warning" size="small">未保存</n-tag>
      <n-tag v-else type="success" size="small">已保存</n-tag>
    </header>

    <div class="flex-1 p-4 min-h-0">
      <DrawioCanvas ref="canvasRef" height="100%" :autosave="true" :embed-url-params="{ spin: '1', libraries: true }"
        @init="onInit" @load="onLoad" @save="onSave" @exit="onExit" @autosave="onAutosave" @export="onExport"
        @error="onError" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NButton, NTag } from 'naive-ui'
import type {
  EventSavePayload,
  EventExitPayload,
  DrawioErrorPayload,
  EventExportPayload,
  EventAutoSavePayload,
} from '../components/drawio-canvas/types'
import type DrawioCanvas from '../components/drawio-canvas/drawio-canvas.vue'

const canvasRef = ref<InstanceType<typeof DrawioCanvas> | null>(null)
const isDirty = ref(false)

function onInit() {
  console.log('[index] draw.io 编辑器初始化完成')
}

function onLoad() {
  console.log('[index] 图谱加载完成')
  isDirty.value = false
}

function onSave(payload: EventSavePayload) {
  console.log('[index] 用户保存图谱', payload.xml.length)
  isDirty.value = false
}

function onExit(payload: EventExitPayload) {
  console.log('[index] 用户退出编辑器', payload.xml.length)
}

function onAutosave(payload: EventAutoSavePayload) {
  console.log('[index] 自动保存, XML 长度:', payload.xml.length)
}

function onExport(payload: EventExportPayload) {
  console.log('[index] 导出完成, 格式:', payload.format)
}

function onError(payload: DrawioErrorPayload) {
  console.error('[index] 错误:', payload.error, payload.message)
}

async function handleSave() {
  canvasRef.value?.triggerSave()
  console.log('[index] 触发保存')
}

async function handleExport() {
  try {
    const payload = await canvasRef.value?.exportXml('xml')
    if (payload) {
      console.log('[index] 导出 XML 成功, 长度:', payload.xml.length)
    }
  } catch (err) {
    console.error('[index] 导出失败:', err)
  }
}
</script>