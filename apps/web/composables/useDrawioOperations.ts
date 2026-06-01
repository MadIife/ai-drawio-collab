import type { DiagramOperation, ApplyOperationsResult, OperationError } from '../components/drawio-canvas/types'

function parseMxCellFromXml(xml: string): { element: Element | null; error: string | null } {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'text/xml')
    const parseError = doc.querySelector('parsererror')
    if (parseError) {
      return { element: null, error: 'new_xml 包含非法 XML' }
    }

    const mxCell = doc.querySelector('mxCell')
    if (!mxCell) {
      return { element: null, error: 'new_xml 中未找到 mxCell 元素' }
    }

    return { element: mxCell, error: null }
  } catch {
    return { element: null, error: 'new_xml 解析异常' }
  }
}

function extractRefEdges(root: Element, cellId: string): Element[] {
  const selector = `mxCell[source="${cellId}"], mxCell[target="${cellId}"]`
  return Array.from(root.querySelectorAll(selector))
}

export function useDrawioOperations() {
  function applyOperations(
    xmlContent: string,
    operations: DiagramOperation[],
  ): ApplyOperationsResult {
    const errors: OperationError[] = []

    let doc: Document
    try {
      const parser = new DOMParser()
      doc = parser.parseFromString(xmlContent, 'text/xml')
      const parseError = doc.querySelector('parsererror')
      if (parseError) {
        return { result: xmlContent, errors: [{ type: 'update', cellId: '', message: '输入 XML 存在语法错误' }] }
      }
    } catch {
      return { result: xmlContent, errors: [{ type: 'update', cellId: '', message: '输入 XML 解析异常' }] }
    }

    const root = doc.querySelector('root')
    if (!root) {
      return { result: xmlContent, errors: [{ type: 'update', cellId: '', message: '未找到 root 元素' }] }
    }

    const cells = root.querySelectorAll('mxCell')
    const cellMap = new Map<string, Element>()
    for (const cell of Array.from(cells)) {
      const id = cell.getAttribute('id')
      if (id) {
        cellMap.set(id, cell)
      }
    }

    for (const op of operations) {
      switch (op.type) {
        case 'update': {
          const existingCell = cellMap.get(op.cell_id)
          if (!existingCell) {
            errors.push({ type: 'update', cellId: op.cell_id, message: `细胞 ${op.cell_id} 不存在` })
            continue
          }

          if (!op.new_xml) {
            errors.push({ type: 'update', cellId: op.cell_id, message: 'new_xml 为空' })
            continue
          }

          const { element: newCell, error: parseErr } = parseMxCellFromXml(op.new_xml)
          if (!newCell || parseErr) {
            errors.push({ type: 'update', cellId: op.cell_id, message: parseErr || '无法解析 new_xml' })
            continue
          }

          const newId = newCell.getAttribute('id')
          if (newId !== op.cell_id) {
            errors.push({ type: 'update', cellId: op.cell_id, message: `new_xml 的 id (${newId}) 与目标 id (${op.cell_id}) 不匹配` })
            continue
          }

          const imported = doc.importNode(newCell, true)
          existingCell.parentNode?.replaceChild(imported, existingCell)
          cellMap.set(op.cell_id, imported)
          break
        }

        case 'add': {
          if (cellMap.has(op.cell_id)) {
            errors.push({ type: 'add', cellId: op.cell_id, message: `细胞 ${op.cell_id} 已存在` })
            continue
          }

          if (!op.new_xml) {
            errors.push({ type: 'add', cellId: op.cell_id, message: 'new_xml 为空' })
            continue
          }

          const { element: newCell, error: parseErr } = parseMxCellFromXml(op.new_xml)
          if (!newCell || parseErr) {
            errors.push({ type: 'add', cellId: op.cell_id, message: parseErr || '无法解析 new_xml' })
            continue
          }

          const newId = newCell.getAttribute('id')
          if (newId !== op.cell_id) {
            errors.push({ type: 'add', cellId: op.cell_id, message: `new_xml 的 id (${newId}) 与目标 id (${op.cell_id}) 不匹配` })
            continue
          }

          const imported = doc.importNode(newCell, true)
          root.appendChild(imported)
          cellMap.set(op.cell_id, imported)
          break
        }

        case 'delete': {
          const existingCell = cellMap.get(op.cell_id)
          if (!existingCell) {
            errors.push({ type: 'delete', cellId: op.cell_id, message: `细胞 ${op.cell_id} 不存在` })
            continue
          }

          const refEdges = extractRefEdges(root, op.cell_id)
          if (refEdges.length > 0) {
            console.warn(`[useDrawioOperations] 删除细胞 ${op.cell_id} 被 ${refEdges.length} 条边引用`, refEdges.map((e) => e.getAttribute('id')))
          }

          existingCell.parentNode?.removeChild(existingCell)
          cellMap.delete(op.cell_id)
          break
        }
      }
    }

    const serializer = new XMLSerializer()
    const result = serializer.serializeToString(doc)

    return { result, errors }
  }

  return { applyOperations }
}