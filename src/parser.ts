import peg from 'pegjs'
import { grammar } from './grammar'

/**
 * 语法解析器
 */
const parser = peg.generate(grammar.replace(`[ \r\n\t]`,  `[ \\r\\n\\t]`))

export function tryParse(input: string): Ast | undefined {
  try {
    return parse(input)
  } catch (error) {
    return undefined
  }
}

export function parse(input: string): Ast | never {
  return parser.parse(input)
}