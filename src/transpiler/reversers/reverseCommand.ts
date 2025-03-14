import { CommandError } from '../../errors'
import { evaluationExpr } from '../evaluationExpr'
import { order, raw } from '../formatters'

/**
 * 将抽象语法树反向解析为 SPL 字符串
 * @param ast 抽象语法树
 * @returns SPL 字符串
 */
export const reverseCommand: Reverser = ast => spl => {
  const [, , commands] = ast
  if (!commands) {
    return spl
  }
  if (commands.length === 0) {
    return spl
  }

  const result = [spl + ' |']
  // 逆向解析命令
  for (const cmd of commands) {
    if (cmd.type === 'fields') {
      result.push(`${cmd.type} ${cmd.value.map(raw).join(',')}`)
    } else if (cmd.type === 'limit') {
      result.push(`${cmd.type} ${cmd.value}`)
    } else if (cmd.type === 'sort') {
      result.push(`sort by ${cmd.value.map(order).join(',')}`)
    } else if (cmd.type === 'eval') {
      const params = cmd.value.params.n2
        ? `${evaluationExpr(cmd.value.params.n1, raw)},${evaluationExpr(cmd.value.params.n2, raw)}`
        : evaluationExpr(cmd.value.params.n1, raw)
      result.push(`eval ${cmd.value.newFieldName}=${cmd.value.fn}(${params})`)
    } else {
      throw new CommandError(`未支持翻译的命令: ${cmd.type}`)
    }
  }

  return result.join(' ')
}
