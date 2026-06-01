/** draw.io iframe URL 查询参数，控制编辑器 UI 显隐与行为 */
export interface DrawioUrlParams {
  /** 是否显示加载动画 */
  spin?: boolean | string
  /** 手动控制"已修改"状态 */
  modified?: boolean | number | string
  /** 是否保持修改状态标记 */
  keepmodified?: boolean
  /** 是否启用左侧形状库面板 */
  libraries?: boolean
  /** 隐藏"保存"按钮，改为"保存并退出" */
  noSaveBtn?: boolean
  /** 显示额外的"保存并退出"按钮 */
  saveAndExit?: boolean
  /** 隐藏"退出"按钮 */
  noExitBtn?: boolean
  /** 加载完成后返回边界信息 */
  returnbounds?: boolean
  /** 自定义 ready 消息值（非 JSON 协议时使用） */
  ready?: string
}

/** 矩形边界信息 */
export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

/** draw.io 图谱加载完成事件的负载 */
export interface EventLoadPayload {
  /** 加载后的 XML 图谱数据 */
  xml: string
  /** 画布边界信息（仅当 URL 参数 returnbounds=true 时返回） */
  bounds?: Bounds
}

/** 用户点击"保存"或"保存并退出"时的负载 */
export interface EventSavePayload {
  /** 当前图谱的 XML 数据 */
  xml: string
  /** 当前图谱的文件名 */
  title?: string
}

/** 自动保存触发时的负载（仅在 autosave=true 时启用） */
export interface EventAutoSavePayload {
  /** 当前图谱的 XML 数据 */
  xml: string
}

/** 用户点击"退出"时的负载 */
export interface EventExitPayload {
  /** 退出时的 XML 图谱数据 */
  xml: string
}

/** 导出操作完成时的负载 */
export interface EventExportPayload {
  /** 导出的 XML 图谱数据 */
  xml: string
  /** 导出格式 */
  format?: ExportFormat
  /** 导出文件的 base64 数据（某些格式如 png） */
  data?: string
}

/** 模板选择结果事件的负载 */
export interface EventTemplatePayload {
  /** 模板的 XML 图谱数据 */
  xml: string
  /** 模板标题 */
  title?: string
  /** 是否为模板选择事件 */
  template?: boolean
}

/** draw.io 编辑器返回的错误信息 */
export interface DrawioErrorPayload {
  /** 错误码 */
  error: string
  /** 错误描述信息 */
  message?: string
}

/** 编辑器配置更新事件 */
export interface EventConfigure {
  /** 完整的编辑器配置对象 */
  configure: Record<string, unknown>
}

/** 图谱合并事件负载 */
export interface EventMergePayload {
  /** 待合并的 XML 数据 */
  xml: string
}

/** 弹出输入框事件的负载 */
export interface EventPromptPayload {
  /** 提示文本 */
  prompt: string
  /** 用户输入的结果 */
  result?: string
}

/** 草稿事件的负载 */
export interface EventDraftPayload {
  /** 草稿内容 */
  draft: string
}

/** 打开链接事件的负载 */
export interface EventOpenLinkPayload {
  /** 要打开的链接地址 */
  link: string
}

/** 文本内容事件的负载 */
export interface EventTextContentPayload {
  /** 文本内容 */
  text: string
}

/** DrawioCanvas 组件对外发射的所有事件签名 */
export interface DrawioCanvasEmits {
  /** draw.io 编辑器初始化完成 */
  (e: 'init'): void
  /** 图谱数据加载完成 */
  (e: 'load', payload: EventLoadPayload): void
  /** 用户点击"保存"或"保存并退出" */
  (e: 'save', payload: EventSavePayload): void
  /** 自动保存触发（仅在 autosave=true 时） */
  (e: 'autosave', payload: EventAutoSavePayload): void
  /** 用户点击"退出" */
  (e: 'exit', payload: EventExitPayload): void
  /** 导出操作完成 */
  (e: 'export', payload: EventExportPayload): void
  /** 发生错误（通信异常、XML 校验失败或 draw.io 返回的 error） */
  (e: 'error', payload: DrawioErrorPayload): void
  /** iframe DOM 加载完成 */
  (e: 'iframe-ready'): void
  /** 模板选择结果 */
  (e: 'template', payload: EventTemplatePayload): void
}

/** loadXml 方法的可选参数 */
export interface LoadOptions {
  /** 是否启用自动保存 */
  autosave?: boolean
  /** 手动控制"已修改"状态 */
  modified?: boolean | number | string
  /** 显示"保存并退出"按钮 */
  saveAndExit?: boolean
  /** 隐藏"保存"按钮 */
  noSaveBtn?: boolean
  /** 隐藏"退出"按钮 */
  noExitBtn?: boolean
  /** 设置画布标题 */
  title?: string
  /** 加载指定形状库 */
  libs?: string[]
  /** 是否使用暗色主题 */
  dark?: boolean
  /** 主题名称 */
  theme?: string
}

/** draw.io 支持的导出格式 */
export type ExportFormat = 'svg' | 'xmlsvg' | 'png' | 'xmlpng' | 'html' | 'html2' | 'xml'

/** exportXml 方法的可选参数 */
export interface ExportOptions {
  /** 导出缩放比例 */
  scale?: number
  /** 导出边框宽度 */
  border?: number
  /** 导出背景色 */
  background?: string
  /** 是否使用透明背景 */
  transparent?: boolean
  /** 导出图片宽度（仅 PNG/XMLPNG 有效） */
  width?: number
  /** 是否嵌入图片（仅 SVG/XMLSVG 有效） */
  embedImages?: boolean
}

/** 单次图解操作：以 cell_id 为唯一标识符进行 DOM 级操作，而非文本匹配 */
export interface DiagramOperation {
  /** 操作类型：update 更新、add 新增、delete 删除 */
  type: 'update' | 'add' | 'delete'
  /** 目标细胞的 id */
  cell_id: string
  /** 新 XML 内容（update 和 add 操作必填，delete 忽略） */
  new_xml?: string
}

/** 图解操作执行过程中的单条错误记录 */
export interface OperationError {
  /** 失败的操作类型 */
  type: 'update' | 'add' | 'delete'
  /** 失败的目标细胞 id */
  cellId: string
  /** 错误描述 */
  message: string
}

/** 批量图解操作的执行结果 */
export interface ApplyOperationsResult {
  /** 操作后的完整 mxfile XML */
  result: string
  /** 操作过程中产生的错误列表（部分失败时不中断整体流程） */
  errors: OperationError[]
}

/** 向 draw.io 发送 load action 的消息体 */
export interface LoadAction {
  action: 'load'
  /** 要加载的 XML 图谱数据 */
  xml: string
  /** 是否启用自动保存 */
  autosave?: boolean
  /** 手动控制"已修改"状态 */
  modified?: boolean | number | string
  /** 显示"保存并退出"按钮 */
  saveAndExit?: boolean
  /** 设置画布标题 */
  title?: string
  /** 加载指定形状库 */
  libs?: string[]
  /** 是否使用暗色主题 */
  dark?: boolean
  /** 主题名称 */
  theme?: string
}

/** 向 draw.io 发送 export action 的消息体 */
export interface ExportAction {
  action: 'export'
  /** 导出格式 */
  format: ExportFormat
  /** 导出缩放比例 */
  scale?: number
  /** 导出边框宽度 */
  border?: number
  /** 导出背景色 */
  background?: string
  /** 是否使用透明背景 */
  transparent?: boolean
  /** 导出图片宽度（仅 PNG/XMLPNG 有效） */
  width?: number
  /** 是否嵌入图片（仅 SVG/XMLSVG 有效） */
  embedImages?: boolean
}

/** 向 draw.io 发送 merge action 的消息体 */
export interface MergeAction {
  action: 'merge'
  /** 要合并的 XML 数据 */
  xml: string
}

/** 向 draw.io 发送 dialog action 的消息体（弹出对话框） */
export interface DialogAction {
  action: 'dialog'
  /** 对话框标题 */
  title: string
  /** 对话框消息内容 */
  message: string
  /** 按钮文本数组 */
  buttons?: string[]
}

/** 向 draw.io 发送 prompt action 的消息体（弹出输入框） */
export interface PromptAction {
  action: 'prompt'
  /** 输入框标题 */
  title: string
  /** 输入框提示信息 */
  message: string
  /** 默认值 */
  defaultValue?: string
  /** 确认按钮文本 */
  ok?: string
  /** 取消按钮文本 */
  cancel?: string
}

/** 向 draw.io 发送模板选择 action 的消息体 */
export interface TemplateAction {
  action: 'template'
  /** 模板宽度 */
  width: number
  /** 模板高度 */
  height: number
}

/** 向 draw.io 发送布局 action 的消息体 */
export interface LayoutAction {
  action: 'layout'
  /** 布局算法名称 */
  layout: string
}

/** 向 draw.io 发送草稿 action 的消息体 */
export interface DraftAction {
  action: 'draft'
  /** 草稿内容 */
  draft: string
}

/** 向 draw.io 发送状态栏消息 action 的消息体 */
export interface StatusAction {
  action: 'status'
  /** 状态消息文本 */
  message: string
  /** 是否标记为已修改 */
  modified?: boolean
}

/** 向 draw.io 发送加载指示器 action 的消息体 */
export interface SpinnerAction {
  action: 'spinner'
  /** 加载提示文本 */
  message: string
  /** 是否显示加载指示器 */
  show: boolean
}

/** 向 draw.io 发送编辑器配置 action 的消息体 */
export interface ConfigureAction {
  action: 'configure'
  /** 完整的编辑器配置对象 */
  config: Record<string, unknown>
}

/** 向 draw.io 发送视口跳转 action 的消息体 */
export interface ViewportAction {
  action: 'viewport'
  /** 跳转的目标边界区域 */
  bounds: Bounds
}

/** 向 draw.io 发送文本内容 action 的消息体 */
export interface TextContentAction {
  action: 'textContent'
  /** 文本内容 */
  text: string
}