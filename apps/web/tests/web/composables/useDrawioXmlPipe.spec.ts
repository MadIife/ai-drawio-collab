import { describe, expect, it } from 'vitest'
import { normalizeXml } from '../../../composables/useDrawioXmlPipe'

const EMPTY_MXFILE_PATTERN = /<mxfile>.*<mxCell id="0".*<mxCell id="1" parent="0".*<\/mxfile>/
const ROOT_CELLS_PATTERN = /<mxCell\s+id="0"\/?><mxCell\s+id="1"\s+parent="0"\/?>/

describe('normalizeXml', () => {
  it('空字符串输入应返回完整的空结构 mxfile XML', () => {
    const { result, error } = normalizeXml('', 1_000_000)
    expect(error).toBeNull()
    expect(result).toContain('<mxfile>')
    expect(result).toContain('</mxfile>')
    expect(result).toContain('<mxCell id="0"')
    expect(result).toContain('<mxCell id="1" parent="0"')
  })

  it('应剥离 AI 包装标签（mxParameter / invoke）', () => {
    const input = '</mxParameter>foo</invoke><mxCell id="2"/>'
    const { result, error } = normalizeXml(input, 1_000_000)
    expect(error).toBeNull()
    expect(result).not.toContain('</mxParameter>')
    expect(result).not.toContain('</invoke>')
    expect(result).not.toContain('foo')
  })

  it('应剥离 antml 命名空间的 AI 包装标签', () => {
    const input = '</antml:parameter></antml:invoke><mxCell id="2"/>'
    const { result, error } = normalizeXml(input, 1_000_000)
    expect(error).toBeNull()
    expect(result).not.toContain('antml:parameter')
    expect(result).not.toContain('antml:invoke')
  })

  it('wrapWithMxFile 对裸 mxCell 应输出包含 id="0" 和 id="1" 的完整层级', () => {
    const { result, error } = normalizeXml('<mxCell id="2"/>', 1_000_000)
    expect(error).toBeNull()
    expect(result).toMatch(ROOT_CELLS_PATTERN)
    expect(result).toContain('<mxCell id="2"')
    expect(result).toContain('<root>')
    expect(result).toContain('</root>')
    expect(result).toContain('<mxGraphModel>')
    expect(result).toContain('</mxGraphModel>')
  })

  it('wrapWithMxFile 对含 root 的输入应正确处理，移除重复根细胞', () => {
    const input = '<root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="2" value="A"/></root>'
    const { result, error } = normalizeXml(input, 1_000_000)
    expect(error).toBeNull()
    const id0Matches = result.match(/<mxCell\s+id="0"/g)
    expect(id0Matches).toHaveLength(1)
    expect(result).toContain('<mxCell id="2" value="A"/>')
  })

  it('cleanOrphanedMxPoints 应删除无 as 属性且不在 Array as="points" 内的 mxPoint', () => {
    const input = '<root><mxCell id="2"><mxGeometry><mxPoint x="1" y="2"/></mxGeometry></mxCell><Array as="points"><mxPoint x="3" y="4"/></Array></root>'
    const { result, error } = normalizeXml(input, 1_000_000)
    expect(error).toBeNull()
    expect(result).toContain('<Array as="points">')
    expect(result).toContain('<mxPoint x="3" y="4"')
    expect(result).not.toContain('<mxPoint x="1" y="2"')
  })

  it('escapeIllegalAmpersands 应将 A & B 转换为 A &amp; B，但保留 &lt;', () => {
    const input = '<root><mxCell id="2" value="A & B &lt; C"/></root>'
    const { result, error } = normalizeXml(input, 1_000_000)
    expect(error).toBeNull()
    expect(result).toContain('A &amp; B')
    expect(result).toContain('&lt;')
    expect(result).not.toContain('A & B')
  })

  it('validateMxCellStructure 对重复 ID 应返回 XML_VALIDATION_FAILED', () => {
    const input = '<root><mxCell id="2"/><mxCell id="2"/></root>'
    const { result, error } = normalizeXml(input, 1_000_000)
    expect(error).toBe('XML_VALIDATION_FAILED')
  })

  it('对超过 maxSize 的 XML 应返回 XML_SIZE_EXCEEDED', () => {
    const { result, error } = normalizeXml('<mxCell id="2"/>', 5)
    expect(error).toBe('XML_SIZE_EXCEEDED')
  })

  it('对截断的 XML 应返回 TRUNCATED_XML', () => {
    const { result, error } = normalizeXml('<root><mxCell id="2"', 1_000_000)
    expect(error).toBe('TRUNCATED_XML')
  })

  it('wrapWithMxFile 对已包含 mxfile 的输入应原样返回（不做二次包装）', () => {
    const input = '<mxfile><diagram><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="2"/></root></mxGraphModel></diagram></mxfile>'
    const { result, error } = normalizeXml(input, 1_000_000)
    expect(error).toBeNull()
    expect(result).toBe(input)
  })

  it('wrapWithMxFile 对含 mxGraphModel 的输入应包裹 mxfile > diagram', () => {
    const input = '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="2"/></root></mxGraphModel>'
    const { result, error } = normalizeXml(input, 1_000_000)
    expect(error).toBeNull()
    expect(result).toMatch(/^<mxfile><diagram name="Page-1" id="page-1">/)
    expect(result).toMatch(/<\/diagram><\/mxfile>$/)
  })

  it('validateMxCellStructure 对嵌套 mxCell（非 valueLabel/geometry）应返回错误', () => {
    const input = '<root><mxCell id="2"><mxCell id="3"/></mxCell></root>'
    const { result, error } = normalizeXml(input, 1_000_000)
    expect(error).toBe('XML_VALIDATION_FAILED')
  })

  it('validateMxCellStructure 应允许 as="valueLabel" 的嵌套 mxCell', () => {
    const input = '<root><mxCell id="2" value="label"><mxCell as="valueLabel" id="3" value="Label"/></mxCell></root>'
    const { result, error } = normalizeXml(input, 1_000_000)
    expect(error).toBeNull()
  })

  it('validateMxCellStructure 对重复的结构属性应返回错误', () => {
    const input = '<root><mxCell id="2" edge="1" edge="0"/></root>'
    const { result, error } = normalizeXml(input, 1_000_000)
    expect(error).toBe('XML_VALIDATION_FAILED')
  })

  it('validateMxCellStructure 对非法实体引用应返回错误', () => {
    const input = '<root><mxCell id="2" value="hello &world;"/></root>'
    const { result, error } = normalizeXml(input, 1_000_000)
    expect(error).toBe('XML_VALIDATION_FAILED')
  })
})