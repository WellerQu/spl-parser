import peg, { PegjsError } from 'pegjs'
import { grammar } from './grammar'

export type ExpectedItem = peg.ExpectedItem

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

/**
 * 尝试将用户输入的SPL解析成抽象语法树, 若解析失败, 则根据语法规则返回对应的建议
 * @param input 用户输入的SPL
 * @returns 抽象语法树, 建议
 */
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

/**
 * 将用户输入的SPL解析成抽象语法树, 若解析失败, 则报语法错误
 * @param input 用户输入的SPL
 * @returns 抽象语法树
 */
export function parse(input: string): Ast | never {
  return parser.parse(input)
}