import { parse } from './parser'
import { reverse } from './transpiler'

/**
 * 向 SPL 语句中追加查询条件
 * @param spl 用户输入的 SPL 语句
 * @param condition 需要追加的查询条件
 * @param conditionLinker 条件之间的连接方式, AND 或者 OR
 * @returns 加入条件后的 SPL 语句
 */
export function append(spl: string, appendCondition: ast.Condition, conditionLinker: ast.ConditionLinker = 'AND'): string {
  // 如果 SPL 语句本身没有内容, 那么追加的条件就是唯一的条件
  if (!spl || spl.trim().length === 0) {
    return reverse([
      {
        groups: [{
          conditions: [appendCondition]
        }]
      },
      [],
      []
    ])
  }

  const ast = parse(spl)
  const [query] = ast
  const condition: ast.Condition = {
    type: 'SubQuery',
    value: query,
    decorator: []
  }

  // 以 AND 的形式与之前的所有条件并列
  if (conditionLinker === 'AND') {
    ast[0] = {
      groups: [{
        conditions: [condition, appendCondition]
      }]
    }
  } 
  // 以 OR 的形式与之前的所有条件并列
  else if (conditionLinker === 'OR') {
    ast[0] = {
      groups: [{
        conditions: [condition]
      }, {
        conditions: [appendCondition]
      }]
    }
  }

  return reverse(ast)
}