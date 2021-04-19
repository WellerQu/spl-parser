/// <reference types="../typings" />

import { tryParse } from '../src/parser'

describe("语法建议", () => {
  it("预期一个Space", () => {
    const [, suggestions] = tryParse(`A OR`)
    expect(suggestions).toEqual([{ type: 'other', description: 'space' }])
  })
})