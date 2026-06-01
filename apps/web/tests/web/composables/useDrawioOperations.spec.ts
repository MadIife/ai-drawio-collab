import { describe, expect, it, vi } from 'vitest'
import { useDrawioOperations } from '../../../composables/useDrawioOperations'

const BASE_XML = [
  '<mxfile>',
  '<diagram name="Page-1" id="page-1">',
  '<mxGraphModel>',
  '<root>',
  '<mxCell id="0"/>',
  '<mxCell id="1" parent="0"/>',
  '<mxCell id="2" value="A" vertex="1" parent="1"><mxGeometry x="10" y="10" width="50" height="50" as="geometry"/></mxCell>',
  '<mxCell id="3" value="B" vertex="1" parent="1"><mxGeometry x="100" y="10" width="50" height="50" as="geometry"/></mxCell>',
  '<mxCell id="4" value="A-&gt;B" edge="1" source="2" target="3" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>',
  '</root>',
  '</mxGraphModel>',
  '</diagram>',
  '</mxfile>',
].join('')

const { applyOperations } = useDrawioOperations()

describe('useDrawioOperations', () => {
  it('对不存在的 cell_id 的 update 操作应返回 error，不修改 XML', () => {
    const { result, errors } = applyOperations(BASE_XML, [
      { type: 'update', cell_id: 'non-existent', new_xml: '<mxCell id="non-existent" value="X"/>' },
    ])

    expect(errors).toHaveLength(1)
    expect(errors[0].type).toBe('update')
    expect(errors[0].cellId).toBe('non-existent')
    expect(errors[0].message).toContain('不存在')
    expect(result).toBe(BASE_XML)
  })

  it('对已存在 cell_id 的 add 操作应返回 error，不修改 XML', () => {
    const { result, errors } = applyOperations(BASE_XML, [
      { type: 'add', cell_id: '2', new_xml: '<mxCell id="2" value="Duplicate"/>' },
    ])

    expect(errors).toHaveLength(1)
    expect(errors[0].type).toBe('add')
    expect(errors[0].cellId).toBe('2')
    expect(errors[0].message).toContain('已存在')
    expect(result).toBe(BASE_XML)
  })

  it('对合法的 add 操作应正确追加 mxCell', () => {
    const { result, errors } = applyOperations(BASE_XML, [
      { type: 'add', cell_id: '5', new_xml: '<mxCell id="5" value="C" vertex="1" parent="1"><mxGeometry x="200" y="10" width="50" height="50" as="geometry"/></mxCell>' },
    ])

    expect(errors).toHaveLength(0)
    expect(result).toContain('<mxCell id="5"')
    expect(result).toContain('value="C"')
  })

  it('对合法的 delete 操作应正确移除 mxCell', () => {
    const { result, errors } = applyOperations(BASE_XML, [
      { type: 'delete', cell_id: '3' },
    ])

    expect(errors).toHaveLength(0)
    expect(result).not.toContain('<mxCell id="3"')
    expect(result).not.toContain('value="B"')
  })

  it('delete 操作应移除细胞及其子元素', () => {
    const xmlWithChild = [
      '<mxfile><diagram id="d"><mxGraphModel><root>',
      '<mxCell id="0"/><mxCell id="1" parent="0"/>',
      '<mxCell id="2" vertex="1" parent="1"><mxGeometry x="10" y="10" width="50" height="50" as="geometry"/></mxCell>',
      '</root></mxGraphModel></diagram></mxfile>',
    ].join('')

    const { result, errors } = applyOperations(xmlWithChild, [
      { type: 'delete', cell_id: '2' },
    ])

    expect(errors).toHaveLength(0)
    expect(result).not.toContain('<mxCell id="2"')
    expect(result).not.toContain('<mxGeometry')
  })

  it('对引用被删细胞的 edge 应输出 console.warn（不影响删除）', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { result, errors } = applyOperations(BASE_XML, [
      { type: 'delete', cell_id: '2' },
    ])

    expect(errors).toHaveLength(0)
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy.mock.calls[0][0]).toContain('引用')

    expect(result).not.toContain('<mxCell id="2"')
    expect(result).toContain('<mxCell id="4"')

    warnSpy.mockRestore()
  })

  it('对非法 XML 输入应返回 error 而非抛异常', () => {
    const { result, errors } = applyOperations('不是合法 XML', [
      { type: 'update', cell_id: '2', new_xml: '<mxCell id="2"/>' },
    ])

    expect(errors).toHaveLength(1)
    expect(errors[0].message).toMatch(/语法错误|解析异常/)
    expect(result).toBe('不是合法 XML')
  })

  it('对缺失 root 元素的 XML 应返回 error', () => {
    const xmlNoRoot = '<mxfile><diagram id="d"><mxGraphModel></mxGraphModel></diagram></mxfile>'

    const { result, errors } = applyOperations(xmlNoRoot, [
      { type: 'update', cell_id: '2', new_xml: '<mxCell id="2"/>' },
    ])

    expect(errors).toHaveLength(1)
    expect(errors[0].message).toContain('root')
  })

  it('对合法的 update 操作应正确替换 mxCell', () => {
    const newXml = '<mxCell id="2" value="Updated A" vertex="1" parent="1"><mxGeometry x="20" y="20" width="100" height="80" as="geometry"/></mxCell>'
    const { result, errors } = applyOperations(BASE_XML, [
      { type: 'update', cell_id: '2', new_xml: newXml },
    ])

    expect(errors).toHaveLength(0)
    expect(result).toContain('<mxCell id="2"')
    expect(result).toContain('value="Updated A"')
    expect(result).toContain('width="100"')
    expect(result).not.toContain('value="A"')
  })

  it('new_xml 不含 mxCell 时应返回 error', () => {
    const { result, errors } = applyOperations(BASE_XML, [
      { type: 'update', cell_id: '2', new_xml: '<notMxCell id="2"/>' },
    ])

    expect(errors).toHaveLength(1)
    expect(errors[0].message).toContain('未找到 mxCell')
    expect(result).toBe(BASE_XML)
  })

  it('new_xml 的 id 与目标 id 不匹配时应返回 error', () => {
    const { result, errors } = applyOperations(BASE_XML, [
      { type: 'update', cell_id: '2', new_xml: '<mxCell id="99" value="Wrong ID"/>' },
    ])

    expect(errors).toHaveLength(1)
    expect(errors[0].message).toContain('不匹配')
    expect(result).toBe(BASE_XML)
  })

  it('混合操作：部分失败不影响其他成功操作', () => {
    const { result, errors } = applyOperations(BASE_XML, [
      { type: 'update', cell_id: 'non-existent', new_xml: '<mxCell id="non-existent" value="X"/>' },
      { type: 'add', cell_id: '10', new_xml: '<mxCell id="10" value="New Node" vertex="1" parent="1"><mxGeometry x="300" y="10" width="50" height="50" as="geometry"/></mxCell>' },
      { type: 'delete', cell_id: '3' },
    ])

    expect(errors).toHaveLength(1)
    expect(errors[0].type).toBe('update')
    expect(errors[0].cellId).toBe('non-existent')

    expect(result).toContain('<mxCell id="10"')
    expect(result).not.toContain('<mxCell id="3"')
    expect(result).not.toContain('value="B"')
  })

  it('delete 操作对不存在的 cell_id 应返回 error', () => {
    const { result, errors } = applyOperations(BASE_XML, [
      { type: 'delete', cell_id: 'non-existent' },
    ])

    expect(errors).toHaveLength(1)
    expect(errors[0].type).toBe('delete')
    expect(errors[0].message).toContain('不存在')
    expect(result).toBe(BASE_XML)
  })
})