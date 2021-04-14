import peg, { PegjsError } from 'pegjs'
import { grammar } from './grammar'

export type ExpectedItem = peg.ExpectedItem

function isPEGSyntaxError(error: any): error is PegjsError {
  return error.name !== undefined
  && error.message !== undefined
  && error.location !== undefined
  && error.expected !== undefined
}

/**
 * 语法解析器
 */
const parser = peg.generate(grammar.replace(`[ \r\n\t]`,  `[ \\r\\n\\t]`))

export function tryParse(input: string): [Ast | undefined, ExpectedItem[]] | never {
  try {
    return [parse(input), []]
  } catch (error) {
    // 仅处理语法错误, 返回建议
    if (isPEGSyntaxError(error)) {
      return [undefined, error.expected ?? []]
    }

    throw error
  }
}

export function parse(input: string): Ast | never {
  return parser.parse(input)
}