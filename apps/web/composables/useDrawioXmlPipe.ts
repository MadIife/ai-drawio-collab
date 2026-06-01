const ROOT_CELLS = '<mxCell id="0"/><mxCell id="1" parent="0"/>'

const EMPTY_MXFILE = `<mxfile><diagram name="Page-1" id="page-1"><mxGraphModel><root>${ROOT_CELLS}</root></mxGraphModel></diagram></mxfile>`

const TRUNCATED_END_PATTERN = /\.\.\.\s*$/

const VALID_ENTITIES = new Set(['lt', 'gt', 'amp', 'quot', 'apos'])

const STRUCTURAL_ATTRS = ['edge', 'parent', 'source', 'target', 'vertex', 'connectable']

/**
 * 需要剥离的 AI 模型包装标签名集合（包括 opening 和 closing）。
 */
const AI_WRAPPER_NAMES = [
  'mxParameter',
  'invoke',
  'antml:parameter',
  'antml:invoke',
  'antml:error',
  'function_call',
  'FunctionCall',
  'tool_call',
  'ToolCall',
  'result',
  'Result',
]

/**
 * 构造匹配任意 AI wrapper 标签（opening 或 closing）的正则。
 */
function buildAiTagPattern(): RegExp {
  const names = AI_WRAPPER_NAMES.join('|')
  return new RegExp(`</?(?:${names})[^>]*>`, 'g')
}

/**
 * 构建匹配成对 AI wrapper 块的正则（含内部内容）。
 */
function buildAiBlockPatterns(): RegExp[] {
  return AI_WRAPPER_NAMES.map((name) => new RegExp(`<${name}[^>]*>[\\s\\S]*?<\\/${name}>`, 'g'))
}

/**
 * 剥离 AI 模型返回的 XML 中的函数调用包装标签及其内部内容。
 * 处理三种场景：
 * 1. 成对块：<invoke>...</invoke> → 整体移除
 * 2. 孤立 closing 标签及之间的文本：</mxParameter>foo</invoke> → 整体移除
 * 3. 单个孤立标签：</antml:error> → 移除
 */
function stripAiWrapperTags(xml: string): string {
  const blockPatterns = buildAiBlockPatterns()
  const tagPattern = buildAiTagPattern()

  let result = xml

  for (const pattern of blockPatterns) {
    result = result.replace(pattern, '')
  }

  result = result.replace(tagPattern, '')

  result = result.replace(/^[^<]+/, '')

  return result.trim()
}

/**
 * 检查 XML 是否完整（未被截断）。
 * 检测指标：末尾省略号、未闭合标签、缺失预期的闭合标签。
 */
function isMxCellXmlComplete(xml: string): boolean {
  if (!xml) return true

  if (TRUNCATED_END_PATTERN.test(xml)) return false

  const lastOpen = xml.lastIndexOf('<')
  const lastClose = xml.lastIndexOf('>')
  if (lastOpen > lastClose) return false

  if (xml.includes('<mxfile') && !xml.includes('</mxfile>')) return false
  if (xml.includes('<mxGraphModel') && !xml.includes('</mxGraphModel>')) return false
  if (xml.includes('<root>') && !xml.includes('</root>')) return false

  return true
}

/**
 * 清理孤立的 mxPoint 元素。
 * 删除无 `as` 属性且不在 `<Array as="points">` 内的 `<mxPoint/>`，
 * 否则 draw.io 会报 "Could not add object mxPoint" 错误。
 */
function cleanOrphanedMxPoints(xml: string): string {
  const arrays: string[] = []
  let counter = 0
  const PREFIX = '___POINTS_ARRAY_'

  const shielded = xml.replace(
    /<Array\s+as="points"[^>]*>[\s\S]*?<\/Array>/g,
    (match) => {
      const placeholder = `${PREFIX}${counter++}___`
      arrays.push(match)
      return placeholder
    },
  )

  const cleaned = shielded.replace(/<mxPoint\s+(?!as=)[^>]*\/?>/g, '')

  return cleaned.replace(new RegExp(`${PREFIX}\\d+___`, 'g'), () => arrays.shift() || '')
}

/**
 * 转义 XML 中非法的 & 字符。
 * 将不在合法实体引用（&lt; &gt; &amp; &quot; &apos; &#...;）中的 & 替换为 &amp;。
 */
function escapeIllegalAmpersands(xml: string): string {
  return xml.replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+);)/g, '&amp;')
}

/**
 * 将各种格式的输入 XML 规范化为完整的 mxfile 四级层级结构。
 *
 * 分支逻辑：
 * - 空字符串 → 返回完整空结构 mxfile
 * - 含 `<mxfile` → 原样返回
 * - 含 `<mxGraphModel` → 外层包裹 mxfile > diagram
 * - 含 `<root>` → 提取内部内容，移除 id="0"/"1" 的根细胞，拼接 ROOT_CELLS 后重新包装
 * - 其他（裸 mxCell）→ 注入 root 内自动添加根细胞
 */
function wrapWithMxFile(xml: string): string {
  if (!xml) return EMPTY_MXFILE

  if (xml.includes('<mxfile')) return xml

  if (xml.includes('<mxGraphModel')) {
    return `<mxfile><diagram name="Page-1" id="page-1">${xml}</diagram></mxfile>`
  }

  if (xml.includes('<root>')) {
    const rootMatch = xml.match(/<root>([\s\S]*)<\/root>/)
    const innerContent = rootMatch ? rootMatch[1] : xml
    const cleaned = innerContent.replace(/<mxCell\s+id="[01]"[^>]*\/?>/g, '')
    return `<mxfile><diagram name="Page-1" id="page-1"><mxGraphModel><root>${ROOT_CELLS}${cleaned}</root></mxGraphModel></diagram></mxfile>`
  }

  return `<mxfile><diagram name="Page-1" id="page-1"><mxGraphModel><root>${ROOT_CELLS}${xml}</root></mxGraphModel></diagram></mxfile>`
}

/**
 * 在字符串级别检测单个 mxCell 标签内是否存在重复的结构属性。
 * 使用正则而非 DOM 解析，避免 XML 解析器对重复属性的去重行为。
 */
function hasDuplicateAttributes(xml: string): boolean {
  const cellRegex = /<mxCell\s[^>]*>/g
  let cellMatch: RegExpExecArray | null
  while ((cellMatch = cellRegex.exec(xml)) !== null) {
    const tagContent = cellMatch[0]
    const counts = new Map<string, number>()
    const attrRegex = new RegExp(`\\b(${STRUCTURAL_ATTRS.join('|')})\\s*=`, 'g')
    let aMatch: RegExpExecArray | null
    while ((aMatch = attrRegex.exec(tagContent)) !== null) {
      const name = aMatch[1]
      counts.set(name, (counts.get(name) || 0) + 1)
    }
    for (const [, count] of counts) {
      if (count > 1) return true
    }
  }
  return false
}

/**
 * 校验 mxCell XML 的结构合法性。
 * 包含 5 项检查：XML 语法、重复 ID、嵌套 mxCell、重复结构属性、非法实体引用。
 * @returns 校验失败时返回错误描述字符串，通过时返回 null
 */
function validateMxCellStructure(xml: string): string | null {
  let doc: Document

  try {
    const parser = new DOMParser()
    doc = parser.parseFromString(xml, 'text/xml')
    const parseError = doc.querySelector('parsererror')
    if (parseError) return 'XML_PARSE_ERROR'
  } catch {
    return 'XML_PARSE_ERROR'
  }

  const idRegex = /\bid\s*=\s*["']([^"']+)["']/g
  const idSet = new Set<string>()
  let idMatch: RegExpExecArray | null
  while ((idMatch = idRegex.exec(xml)) !== null) {
    if (idSet.has(idMatch[1])) return 'DUPLICATE_IDS_FOUND'
    idSet.add(idMatch[1])
  }

  const allMxCells = doc.querySelectorAll('mxCell')
  for (const cell of Array.from(allMxCells)) {
    const parent = cell.parentElement
    if (parent && parent.tagName === 'mxCell') {
      const asAttr = cell.getAttribute('as')
      if (asAttr !== 'valueLabel' && asAttr !== 'geometry') {
        return 'NESTED_MXCELL_FOUND'
      }
    }
  }

  if (hasDuplicateAttributes(xml)) return 'DUPLICATE_ATTRIBUTES_FOUND'

  const entityRegex = /&(\w+);/g
  let entityMatch: RegExpExecArray | null
  while ((entityMatch = entityRegex.exec(xml)) !== null) {
    if (!VALID_ENTITIES.has(entityMatch[1])) return 'ILLEGAL_ENTITY_REFERENCE'
  }

  return null
}

/**
 * XML 规范化管线：将任意格式的外部 XML 处理为完整的、合法的 draw.io mxfile 结构。
 *
 * 管线执行顺序：
 *   0. 检查 xml.length > maxSize → 返回 XML_SIZE_EXCEEDED
 *   1. stripAiWrapperTags → 继续执行
 *   2. isMxCellXmlComplete → 失败返回 TRUNCATED_XML
 *   3. cleanOrphanedMxPoints → 继续执行
 *   4. escapeIllegalAmpersands → 继续执行
 *   5. wrapWithMxFile → 继续执行
 *   6. validateMxCellStructure → 失败返回 XML_VALIDATION_FAILED
 */
export function normalizeXml(xml: string, maxSize: number): { result: string; error: string | null } {
  if (xml.length > maxSize) {
    return { result: xml, error: 'XML_SIZE_EXCEEDED' }
  }

  let result = stripAiWrapperTags(xml)

  if (!isMxCellXmlComplete(result)) {
    return { result, error: 'TRUNCATED_XML' }
  }

  result = cleanOrphanedMxPoints(result)

  const entityRegex = /&(\w+);/g
  let entityMatch: RegExpExecArray | null
  while ((entityMatch = entityRegex.exec(result)) !== null) {
    if (!VALID_ENTITIES.has(entityMatch[1])) {
      return { result, error: 'XML_VALIDATION_FAILED' }
    }
  }

  result = escapeIllegalAmpersands(result)
  result = wrapWithMxFile(result)

  const validationError = validateMxCellStructure(result)
  if (validationError !== null) {
    return { result, error: 'XML_VALIDATION_FAILED' }
  }

  return { result, error: null }
}