import { pipe } from './utils/pipe'
import { format } from './utils/format'

type Resolver = (ast: Ast) => (dsl: elasticsearch.ESQuery) => elasticsearch.ESQuery

/**
 * 最大聚合范围
 */
const AGGR_MAX_SIZE = 10000

/**
 * 最大读取条数
 */
const RECORD_SIZE = 10000

/**
 * log事件时间字段名
 */
const EVENT_TIME = '_event_time'

/**
 * 查询语句条件错误
 */
export class ConditionError extends Error { }

/**
 * 操作错误
 */
export class OperationError extends Error { }

/**
 * 命令错误
 */
export class CommandError extends Error { }

/**
 * 转译函数
 * @param ast 抽象语法树
 * @returns ElasticSearch DSL
 */
export function transpiler(ast: Ast): elasticsearch.ESQuery {
  const resolve = pipe(
    resolveQuery(ast),
    resolveOperation(ast),
    resolveCommand(ast)
  )

  // ES DSL 默认结构
  return resolve({
    query: {
      'query_string': {
        query: '',
        'default_field': '_message'
      }
    },
    from: 0,
    size: 10,
    '_source': []
  })
}

/**
 * 条件组转字符串
 * @param query 抽象语法树的查询段
 * @returns 查询语句
 */
const groups2string = (query: Ast[0]): string =>
  query.groups.map(group => {
    return group.conditions.map(condition => {
      const result = condition.decorator.includes('NOT') ? ['NOT'] : []

      if (condition.type === 'SingleKeyword') {
        result.push(condition.value)
      } else if (condition.type === 'UnionKeywords') {
        result.push(`"${condition.value ?? ''}"`)
      } else if (condition.type === "KeyValue") {
        const { fieldType, fieldValue } = condition.value
        const fieldName = format(condition.value)

        if (fieldType === 'string')
          result.push(`${fieldName}:"${fieldValue ?? ''}"`)
        else if (fieldType === 'number')
          result.push(`${fieldName}:${fieldValue}`)
        else if (fieldType === 'regexp')
          result.push(`${fieldName}:/${fieldValue}/`)
        else if (fieldType === 'range')
          result.push(`${fieldName}:${fieldValue}`)
        else if (fieldType === 'time')
          throw new ConditionError('Not Implemented: field type is time')
      } else if (condition.type === "SubQuery") {
        result.push("(" + groups2string(condition.value) + ")")
      } else {
        throw new ConditionError(`尚未支持的查询条件 ${condition.type}`)
      }

      return result.join(' ')
    }).join(' AND ')
  }).join(' OR ')

/**
 * 解析出 query.query_string.query 字段
 * @param ast 抽象语法树
 * @returns ES DSL
 */
const resolveQuery: Resolver = ast => dsl => {
  const [query] = ast
  if (!query) {
    return dsl
  }

  dsl.query.query_string.query = groups2string(query)

  return dsl
}

/**
 * 解析出 aggr 字段
 * @param ast 抽象语法树
 * @returns ES DSL
 */
const resolveOperation: Resolver = ast => dsl => {
  const [, operations] = ast
  if (!operations) {
    return dsl
  }

  if (operations.length === 0) {
    return dsl
  }

  const [operation] = operations
  if (operation.type !== 'Statistic') {
    throw new OperationError('暂时不支持非统计操作')
  }

  const { fields, groupBy, } = operation.value
  const [first] = fields
  const initialTerm: elasticsearch.ESQueryStatisticTerm = {
    field: format(first)
  }

  if (first.aggr === 'count') {
    initialTerm.size = AGGR_MAX_SIZE
  }

  const initialAggr: elasticsearch.ESQueryStatisticAggr = {
    [first.alias ?? `${first.aggr}(${first.fieldName})`]: {
      [first.aggr === 'count' ? 'terms' : first.aggr]: initialTerm
    }
  }
  const aggs: elasticsearch.ESQuery['aggs'] = (groupBy ?? []).reduceRight<elasticsearch.ESQueryStatisticAggr>((aggs, item) => {
    const fieldName = format(item)

    return {
      [item.fieldName]: {
        terms: {
          field: fieldName,
          size: AGGR_MAX_SIZE
        },
        aggs
      }
    }
  }, initialAggr)

  dsl.aggs = aggs

  return dsl
}

/**
 * 
 * @param eval相关函数的运算式抽象语法树
 * @returns string eval相关函数的运算式
 */

interface operatorAst {
  type: 'fieldName' | 'number' | 'operator'
  value: string
}

const parseOperator = (ast: operatorAst[] | operatorAst): string => {

  let operator = ''
  function loop(arr: operatorAst[], end = '') {

    arr.forEach((item: operatorAst, index: number) => {

      let cur = ''
      if (Array.isArray(item) && item.length) {

        const firstItem = item[0].type
        const secItem = item[1]

        if (firstItem === 'number' && ['+', '-'].includes(secItem.value)) {
          operator += '('
          loop(item, ')')
        } else {
          loop(item)
        }
      }

      if (item.type === 'fieldName') {
        cur = `doc['${item.value}_number'].value`
        operator += cur

      } else if (['operator', 'number'].includes(item.type)) {
        cur = item.value
        operator += cur
      }
    })
    operator += end
    return operator
  }

  if (Array.isArray(ast)) {
    loop(ast)
  } else {
    if (ast.type === 'fieldName') {
      operator += `doc['${ast.value}_number'].value`

    } else if (['operator', 'number'].includes(ast.type)) {
      operator += ast.value
    }
  }

  return operator
}

/**
 * 
 * @param ast 抽象语法树
 * @returns ES DSL
 */
const resolveCommand: Resolver = ast => dsl => {
  const [, , commands] = ast
  if (!commands) {
    return dsl
  }

  // 解析命令
  for (const cmd of commands) {
    if (cmd.type === 'fields') {
      dsl._source = ["_message", "_event_time"].concat(cmd.value.map(item => item.fieldName))
    } else if (cmd.type === 'limit') {
      dsl.size = +cmd.value
    } else if (cmd.type === 'sort') {
      const sort: elasticsearch.ESQuerySort[] = cmd.value.map<elasticsearch.ESQuerySort>(item => ({
        [item.fieldName]: {
          order: item.order ?? "desc",
          'unmapped_type': 'string'
        }
      }))
      dsl.sort = sort
    } else if (cmd.type === 'eval') {

      const operator = cmd.value.params[1] ? `${parseOperator(cmd.value.params[0])}, ${parseOperator(cmd.value.params[1])}` : parseOperator(cmd.value.params[0])
      const script_fields = {
        [cmd.value?.newFieldName]: {
          "script": {
            "lang": "painless",
            "source": `Math.${cmd.value?.fn}(${operator})`
          }
        }
      }
      dsl.script_fields = script_fields
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

/**
 * 从DSL中移除 limit 相关字段(from, size)
 * @param dsl 待加工的 DSL 语句
 */
export const DSLRemovePagination = (dsl: elasticsearch.ESQuery): elasticsearch.ESQuery => {
  dsl.from = undefined
  dsl.size = undefined

  return dsl
}

/**
 * 从DSL语句中移除 _source 字段 
 * @param dsl 待加工的 DSL 语句
 */
export const DSLRemoveSource = (dsl: elasticsearch.ESQuery): elasticsearch.ESQuery => {
  dsl._source = undefined

  return dsl
}

/**
 * 从DSL语句中移除 aggs 字段
 * @param dsl 待加工的 DSL 语句
 */
export const DSLRemoveAggs = (dsl: elasticsearch.ESQuery): elasticsearch.ESQuery => {
  dsl.aggs = undefined

  return dsl
}

/**
 * 从DSL语句中移除sort字段
 * @param dsl 代加工的 DSL 语句
 */
export const DSLRemoveSort = (dsl: elasticsearch.ESQuery): elasticsearch.ESQuery => {
  dsl.sort = undefined

  return dsl
}

/**
 * 从DSL语句中移除script_fields字段
 * @param dsl 待加工的 DSL 语句
 */
export const DSLRemoveScriptField = (dsl: elasticsearch.ESQuery): elasticsearch.ESQuery => {
  dsl['script_fields'] = undefined

  return dsl
}