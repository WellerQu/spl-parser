/// <reference types="../typings" />

import { SUGGESTIONS } from '../src/suggestions'
import { tryParse } from '../src/parser'

describe('符号提示', () => {
  it('预期一个Space', () => {
    const [, suggestions] = tryParse('A OR')
    expect(suggestions).toEqual([
      SUGGESTIONS['space']
    ])
  })

  it('双引号关键词', () => {
    const [, suggestions] = tryParse('"a')
    expect(suggestions).toEqual([
      SUGGESTIONS['double_quote']
    ])
  })

  it('单引号关键词', () => {
    const [, suggestions] = tryParse('\'a')
    expect(suggestions).toEqual([
      SUGGESTIONS['single_quote']
    ])
  })

  it('多个条件', () => {
    const [, suggestions] = tryParse('a ')
    expect(suggestions).toHaveLength(5)
  })

  it('非预期符号', () => {
    const [, , found] = tryParse('a = b AND NOT a=(2')
    expect(found).toBe('(')
  })
})

describe('字段名提示', () => {
  it('空输入', () => {
    const [, suggestions] = tryParse('')
    expect(suggestions).toContain(SUGGESTIONS['fieldName'])
  })
})

describe('字段值提示', () => {
  it('F = ? 形式下提供字段值提示', () => {
    const [, suggestions] = tryParse('a=')
    expect(suggestions).toContain(SUGGESTIONS['fieldValue'])
  })
})

describe('区分相同规则的词法', () => {
  it('* | stats ', () => {
    const [, suggestions] = tryParse('* | stats ')
    expect(suggestions).toContain(SUGGESTIONS['maxS'])
    expect(suggestions).toContain(SUGGESTIONS['minS'])
  })

  it('* | eval a=', () => {
    const [, suggestions] = tryParse('* | eval a=')
    expect(suggestions).toContain(SUGGESTIONS['maxE'])
    expect(suggestions).toContain(SUGGESTIONS['minE'])
  })
})