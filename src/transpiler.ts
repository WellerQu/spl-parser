import { pipe } from './utils/pipe'

type Resolver = (ast: Ast) => (dsl: ESQuery) => ESQuery

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

export function transpiler(ast: Ast): ESQuery {
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
const groups2string = (query: Ast[0]): string => query.groups.map(group => {
  return group.conditions.map(condition => {
    const result = condition.decorator.includes('NOT') ? ['NOT'] : []

    if (condition.type === 'SingleKeyword') {
      result.push(condition.value)
    }
    if (condition.type === 'UnionKeywords') {
      result.push(`"${condition.value}"`)
    }
    if (condition.type === "KeyValue") {
      const { fieldName, fieldValue } = condition.value
      if (fieldValue.type === 'string')
        result.push(`${fieldName}="${fieldValue.value}"`)
      else if (fieldValue.type === 'number')
        result.push(`${fieldName}=${fieldValue.value}`)
      else if (fieldValue.type === 'regexp')
        result.push(`${fieldName}=/${fieldValue.value}/`)
      else if (fieldValue.type === 'range')
        result.push(`${fieldName}=${fieldValue.value}`)
    }
    if (condition.type === "Union") {
      result.push(groups2string(condition.value))
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
    return dsl
  }

  const { fields, groupBy, } = operation.value
  const [first] = fields
  const initialTerm: ESQueryStatisticTerm = {
    field: first.fieldName,
  }

  if (first.aggr === 'count') {
    initialTerm.size = AGGR_MAX_SIZE
  }

  const initialAggr: ESQueryStatisticAggr = {
    [first.alias ?? `${first.aggr}(${first.fieldName})`]: {
      [first.aggr === 'count' ? 'terms' : first.aggr]: initialTerm
    }
  }
  const aggs: ESQuery['aggs'] = (groupBy ?? []).reduceRight<ESQueryStatisticAggr>((aggs, item) => {
    return {
      [item.fieldName]: {
        terms: {
          field: item.fieldName,
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
      dsl._source = ["_message", "_event_time"].concat(cmd.value)
    } else if (cmd.type === 'head') {
      throw new Error('Not Implemented: head')
    } else if (cmd.type === 'limit') {
      dsl.size = +cmd.value
    } else if (cmd.type === 'rare') {
      throw new Error('Not Implemented: rare')
    } else if (cmd.type === 'sort') {
      const sort: ESQuerySort[] = cmd.value.map<ESQuerySort>(item => ({
        [item.fieldName]: {
          order: item.order ?? "desc",
          'unmapped_type': 'string'
        }
      }))
      dsl.sort = sort
    } else if (cmd.type === 'table') {
      throw new Error('Not Implemented: table')
    } else if (cmd.type === 'tail') {
      throw new Error('Not Implemented: tail')
    } else if (cmd.type === 'top') {
      throw new Error('Not Implemented: top')
    } else if (cmd.type === 'transaction') {
      throw new Error('Not Implemented: transaction')
    } 
  }

  // 提供默认排序字段与排序规则
  if (!dsl.sort || dsl.sort.length === 0) {
    dsl.sort = [{ [EVENT_TIME]: { order: 'desc', 'unmapped_type': 'long' } }]
  }
  // 提供对limit的最大最小约束
  if (dsl.size > RECORD_SIZE) {
    dsl.size = RECORD_SIZE
  }

  return dsl
}