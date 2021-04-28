import { parse } from './parser'
import { reverse } from './transpiler'

/**
 * 向 SPL 语句中追加查询条件
 * @param spl 用户输入的 SPL 语句
 * @param condition 需要追加的查询条件
 * @returns 加入条件后的 SPL 语句
 */
export function append(spl: string, appendCondition: ast.Condition): string {
  const ast = parse(spl)
  const [query] = ast
  const condition: ast.Condition = {
    type: 'SubQuery',
    value: query,
    decorator: []
  }

  // 以 AND 的形式与之前的所有条件并列
  ast[0] = {
    groups: [{
      conditions: [condition, appendCondition]
    }]
  }

  return reverse(ast)
}