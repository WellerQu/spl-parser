/// <reference types="../typings" />

import { getSuggestions, SUGGESTIONS } from '../src/suggestions'

describe('符号提示', () => {
  it('预期一个Space', () => {
    const suggestions = getSuggestions('A OR')
    expect(suggestions).toEqual([
      SUGGESTIONS['space']
    ])
  })
})

describe('字段名提示', () => {
  it('空输入', () => {
    const suggestions = getSuggestions('')
    expect(suggestions).toContain(SUGGESTIONS['fieldName'])
  })
})

describe('字段值提示', () => {
  it('F = ? 形式下提供字段值提示', () => {
    const suggestions = getSuggestions('a=')
    expect(suggestions).toContain(SUGGESTIONS['fieldValue'])
  })
})