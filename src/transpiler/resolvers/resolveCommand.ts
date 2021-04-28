import { EVENT_TIME } from '../../constants'
import { CommandError } from '../../errors'
import { evaluationExpr } from '../evaluationExpr'

/**
 * 最大读取条数
 */
const RECORD_SIZE = 10000


/**
 * 
 * @param ast 抽象语法树
 * @returns ES DSL
 */
export const resolveCommand: Resolver = ast => dsl => {
  const [, , commands] = ast
  if (!commands) {
    return dsl
  }

  // 解析命令
  for (const cmd of commands) {
    if (cmd.type === 'fields') {
      dsl._source = ['_message', '_event_time'].concat(cmd.value.map(item => item.fieldName))
    } else if (cmd.type === 'limit') {
      dsl.size = +cmd.value
    } else if (cmd.type === 'sort') {
      const sort: elasticsearch.ESQuerySort[] = cmd.value.map<elasticsearch.ESQuerySort>(item => ({
        [item.fieldName]: {
          order: item.order ?? 'desc',
          'unmapped_type': 'string'
        }
      }))
      dsl.sort = sort
    } else if (cmd.type === 'eval') {

      const operator = cmd.value.params.n2 ? `${evaluationExpr(cmd.value.params.n1)}, ${evaluationExpr(cmd.value.params.n2)}` :
        evaluationExpr(cmd.value.params.n1)

      const scriptFields: elasticsearch.ScriptFields = {
        [cmd.value.newFieldName]: {
          'script': {
            'lang': 'painless',
            'source': `Math.${cmd.value.fn}(${operator})`
          }
        }
      }
      dsl['script_fields'] = scriptFields
    } else {
      throw new CommandError(`未支持翻译的命令: ${cmd.type}`)
    }
  }

  // 提供默认排序字段与排序规则
  if (!dsl.sort || dsl.sort.length === 0) {
    dsl.sort = [{ [EVENT_TIME]: { order: 'desc', 'unmapped_type': 'long' } }]
  }
  // 提供对limit的最大最小约束
  if (dsl.size && dsl.size > RECORD_SIZE) {
    dsl.size = RECORD_SIZE
  }

  return dsl
}