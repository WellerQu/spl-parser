import { docs } from './formatters'

/**
 * evaluation算术表达式转字符串
 * @param ast eval相关函数的运算式抽象语法树
 * @returns eval相关函数的运算式
 */
export const evaluationExpr = (ast: ast.EvaluationExprNode | ast.EvaluationExprNode[], format = docs, level = 1): string => {
  if (Array.isArray(ast)) {
    const expr = ast.map(item => evaluationExpr(item, format, level + 1)).join('')
    return level === 1 ? expr : `(${expr})`
  } else if (ast.type === 'field') {
    return format(ast.value)
  } else if (ast.type === 'operator' || ast.type === 'number') {
    return ast.value
  } else {
    return ''
  }
}