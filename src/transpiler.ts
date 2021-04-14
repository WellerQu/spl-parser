import { pipe } from './utils/pipe'

const AGGR_MAX_SIZE = 10000

export function transpiler(ast: Ast): ESQuery {
  const resolve = pipe(
    resolveQuery(ast),
    resolveAggr(ast),
    resolveSource(ast),
    ResolveScriptFields(ast)
  )

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

type Resolver = (dsl: ESQuery) => ESQuery

/**
 * 解析出 query.query_string.query 字段
 * @param ast 抽象语法树
 * @returns 解析器
 */
function resolveQuery(ast: Ast): Resolver {

  const groups = (query: Ast[0]): string => query.groups.map(group => {
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
        result.push(groups(condition.value))
      }

      return result.join(' ')
    }).join(' AND ')
  }).join(' OR ')

  return dsl => {
    const [query] = ast
    if (!query) {
      return dsl
    }

    dsl.query.query_string.query = groups(query)

    return dsl
  }
}

/**
 * 解析出 aggr 字段
 * @param ast 抽象语法树
 * @returns 解析器
 */
function resolveAggr(ast: Ast): Resolver {
  return dsl => {
    const [,operations] = ast
    if (!operations) {
      return dsl
    }

    operations.map(operation => {
      if (operation.type === 'Statistic') {
        const { fields, groupBy, filters } = operation.value
      }
    })

    return dsl
  }
}

/**
 * 解析出 _source 字段
 * @param ast 抽象语法树
 * @returns 解析器
 */
function resolveSource(ast: Ast): Resolver {
  return dsl => dsl
}

/**
 * 解析出 script_field 字段
 * @param ast 抽象语法树
 * @returns 解析器
 */
function ResolveScriptFields(ast: Ast): Resolver {
  return dsl => dsl
}