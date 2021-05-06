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