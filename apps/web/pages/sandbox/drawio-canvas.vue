<template>
  <div class="min-h-screen bg-gray-50 p-4">
    <n-h1>Sandbox: DrawioCanvas 组件集成测试</n-h1>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2">
        <n-card title="DrawioCanvas 组件" size="small">
          <DrawioCanvas ref="canvasRef" :initial-xml="SAMPLE_XML" height="600px" :autosave="true"
            :embed-url-params="{ spin: '1', libraries: true }" @init="onInit" @load="onLoad" @save="onSave"
            @exit="onExit" @autosave="onAutosave" @export="onExport" @error="onError" @template="onTemplate" />
        </n-card>
      </div>

      <div class="space-y-4">
        <n-card title="控制面板" size="small">
          <div class="space-y-2">
            <n-button type="primary" block :loading="isExporting" @click="handleExportXml">
              导出 XML
            </n-button>
            <n-button type="info" block :loading="isGettingXml" @click="handleGetCurrentXml">
              获取当前 XML
            </n-button>
            <n-button type="success" block @click="handleMergeXml">
              合并 XML（追加节点）
            </n-button>
            <n-button type="warning" block @click="handleTriggerSave">
              触发保存
            </n-button>
            <n-button block @click="handleSetConfig">
              设置编辑器配置
            </n-button>
            <n-button type="error" block @click="handleApplyOperations">
              应用图解操作（添加节点）
            </n-button>
          </div>
        </n-card>

        <n-card title="XML 预览" size="small">
          <n-input v-model:value="xmlPreview" type="textarea" :rows="6" placeholder="点击按钮查看 XML 内容" readonly />
        </n-card>

        <n-card title="事件日志" size="small">
          <template #header-extra>
            <n-button size="tiny" @click="eventLogs = []">清空</n-button>
          </template>
          <div class="max-h-96 overflow-y-auto text-xs font-mono space-y-1">
            <div v-if="eventLogs.length === 0" class="text-gray-400">暂无事件</div>
            <div v-for="(log, index) in eventLogs" :key="index" class="p-1 rounded"
              :class="log.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'">
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
import { ref } from 'vue'
import { NH1, NCard, NButton, NInput } from 'naive-ui'
import type {
  EventLoadPayload,
  EventSavePayload,
  EventExitPayload,
  EventAutoSavePayload,
  EventExportPayload,
  EventTemplatePayload,
  DrawioErrorPayload,
  DiagramOperation,
} from '../../components/drawio-canvas/types'
import type DrawioCanvas from '../../components/drawio-canvas/drawio-canvas.vue'

const SAMPLE_XML = `<mxCell id="2" value="Hello World" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="1"><mxGeometry x="40" y="40" width="120" height="60" as="geometry"/></mxCell>`

const MERGE_XML = `<mxCell id="3" value="Merged Node" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="1"><mxGeometry x="200" y="40" width="120" height="60" as="geometry"/></mxCell>`

const canvasRef = ref<InstanceType<typeof DrawioCanvas> | null>(null)
const isExporting = ref(false)
const isGettingXml = ref(false)
const xmlPreview = ref('')
const eventLogs = ref<Array<{ time: string; msg: string; type: string }>>([])

function addLog(msg: string, type = 'info') {
  const now = new Date()
  const time = now.toLocaleTimeString('zh-CN', { hour12: false })
  eventLogs.value.push({ time, msg, type })
}

function onInit() {
  addLog('draw.io 编辑器初始化完成 (init)')
}

function onLoad(payload: EventLoadPayload) {
  addLog(`图谱加载完成 (load), XML 长度: ${payload.xml.length}`)
}

function onSave(payload: EventSavePayload) {
  addLog(`用户保存 (save), 标题: ${payload.title || '未命名'}`)
}

function onExit(payload: EventExitPayload) {
  addLog(`用户退出 (exit), XML 长度: ${payload.xml.length}`)
}

function onAutosave(payload: EventAutoSavePayload) {
  addLog(`自动保存 (autosave), XML 长度: ${payload.xml.length}`)
}

function onExport(payload: EventExportPayload) {
  addLog(`导出完成 (export), 格式: ${payload.format || 'xml'}`)
}

function onError(payload: DrawioErrorPayload) {
  addLog(`错误: ${payload.error}${payload.message ? ` - ${payload.message}` : ''}`, 'error')
}

function onTemplate(payload: EventTemplatePayload) {
  addLog(`模板选择 (template), 标题: ${payload.title || '未命名'}`)
}

async function handleExportXml() {
  isExporting.value = true
  addLog('发起 Export 请求 (format: xml)...')
  try {
    const payload = await canvasRef.value?.exportXml('xml')
    if (payload) {
      xmlPreview.value = payload.xml
      addLog(`Export 成功, XML 长度: ${payload.xml.length}`)
      console.log('[Sandbox] Export XML:', payload.xml)
    }
  } catch (err) {
    addLog(`Export 失败: ${err}`, 'error')
  } finally {
    isExporting.value = false
  }
}

async function handleGetCurrentXml() {
  isGettingXml.value = true
  addLog('获取当前 XML...')
  try {
    const xml = await canvasRef.value?.getCurrentXml()
    if (xml) {
      xmlPreview.value = xml
      addLog(`获取 XML 成功, 长度: ${xml.length}`)
      console.log('[Sandbox] Current XML:', xml)
    }
  } catch (err) {
    addLog(`获取 XML 失败: ${err}`, 'error')
  } finally {
    isGettingXml.value = false
  }
}

function handleMergeXml() {
  addLog('发起 Merge XML...')
  canvasRef.value?.mergeXml(MERGE_XML)
  addLog('Merge action 已发送')
}

function handleTriggerSave() {
  addLog('触发保存 (triggerSave)')
  canvasRef.value?.triggerSave()
}

function handleSetConfig() {
  addLog('设置编辑器配置 (setEditorConfig)')
  canvasRef.value?.setEditorConfig({
    defaultEdgeStyle: { rounded: '1', strokeColor: '#FF0000' },
    defaultVertexStyle: { rounded: '1', fillColor: '#E8F5E9' },
  })
  addLog('配置已发送')
}

function handleApplyOperations() {
  addLog('应用图解操作 (applyOperations)...')
  const ops: DiagramOperation[] = [
    {
      type: 'add',
      cell_id: '10',
      new_xml: '<mxCell id="10" value="AI Added" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="1"><mxGeometry x="400" y="40" width="120" height="60" as="geometry"/></mxCell>',
    },
  ]
  canvasRef.value?.applyOperations(ops).then(() => {
    addLog('图解操作执行完成')
  })
}
</script>