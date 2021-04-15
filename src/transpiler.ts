import { pipe } from './utils/pipe'

const AGGR_MAX_SIZE = 10000

export function transpiler(ast: Ast): ESQuery {
  const resolve = pipe(
    resolveQuery(ast),
    resolveSort(ast),
    resolveAggr(ast),
    resolveSource(ast),
    resolveScriptFields(ast)
  )

  // ES DSL 默认结构
  return resolve({
    query: {
      'query_string': {
        query: '',
        default_field: '_message'
      }
    },
    from: 0,
    size: 10,
    '_source': []
  })
}

type Resolver = (ast: Ast) => (dsl: ESQuery) => ESQuery

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
 * @returns 解析器
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
 * @returns 解析器
 */
const resolveAggr: Resolver = ast => dsl => {
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
  const initialTerm: ast.StatisticTerm = {
    field: first.fieldName,
    size: AGGR_MAX_SIZE
  }
  const initialAggr: ast.StatisticAggr = {
    [first.alias ?? `${first.aggr}(${first.fieldName})`]: {
      [first.aggr === 'count' ? 'terms' : first.aggr]: initialTerm
    }
  }
  const aggs: ESQuery['aggs'] = (groupBy ?? []).reduceRight<ast.StatisticAggr>((aggs, item) => {
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
 * 解析出 sort 字段
 * @param ast 抽象语法树
 * @returns 解析器
 */
const resolveSort: Resolver = ast => dsl => {
  return dsl
}

/**
 * 解析出 _source 字段
 * @param ast 抽象语法树
 * @returns 解析器
 */
const resolveSource: Resolver = ast => dsl => {
  return dsl
}

/**
 * 解析出 script_field 字段
 * @param ast 抽象语法树
 * @returns 解析器
 */
const resolveScriptFields: Resolver = ast => dsl => {
  return dsl
}