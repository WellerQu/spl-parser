
import { format } from '../utils/format'
import { pipe } from '../utils/pipe'

/**
 * 格式化Evaluation表达式中的字段名.
 * 将 aaa 输出为 doc['aaa_string'].value 的形式
 */
const formatDocFieldName = pipe(format, (name: string) => `doc['${name}'].value`)

/**
 * 解析出 eval 命令中的表达式
 * @param ast eval相关函数的运算式抽象语法树
 * @returns eval相关函数的运算式
 */
export const evaluationExpr = (ast: ast.EvaluationExprNode | ast.EvaluationExprNode[], format = formatDocFieldName, level = 1): string => {
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