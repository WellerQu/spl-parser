import { pipe } from '../utils/pipe'
import { EVENT_TIME } from '../constants'

import { resolveQuery } from './resolvers/resolveQuery'
import { resolveOperation } from './resolvers/resolveOperation'
import { resolveCommand } from './resolvers/resolveCommand'
import { reverseQuery } from './reversers/reverseQuery'
import { reverseOperation } from './reversers/reverseOperation'
import { reverseCommand } from './reversers/reverseCommand'

/**
 * 转译函数
 * @param ast 抽象语法树
 * @returns ElasticSearch DSL
 */
export function resolve(ast: Ast): elasticsearch.ESQuery {
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
 * 将抽象语法树逆向解析为 SPL 字符串
 * @param ast 抽象语法树
 * @returns SPL 查询语句
 */
export function reverse(ast: Ast): string {
  const reverse = pipe(
    reverseQuery(ast),
    reverseOperation(ast),
    reverseCommand(ast)
  )

  return reverse('')
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

/**
 * 在 DSL 语句的查询段中追加时间范围
 * @param placeholders 时间范围占位符
 * @returns 
 */
export const DSLTimeRangePlaceholder = (placeholders: [string, string]) => (dsl: elasticsearch.ESQuery): elasticsearch.ESQuery => {
  const origin = dsl.query['query_string'].query
  dsl.query['query_string'].query = `(${origin}) AND (${EVENT_TIME}:[${placeholders[0]} TO ${placeholders[1]}})`

  return dsl
}

/**
 * 在 DSL 语句的查询段中追加时间范围
 * @param range 时间范围
 */
export const DSLTimeRange = (range: [number, number]) => (dsl: elasticsearch.ESQuery): elasticsearch.ESQuery => {
  const hasRange = range[0] !== 0 && range[1] !== 0
  const start = hasRange ? (range[0] / 1000 / 60 >> 0) * 1000 * 60 : 0
  const end = hasRange ? (range[1] / 1000 / 60 >> 0) * 1000 * 60 : 0

  if (!hasRange) {
    return dsl
  }

  return DSLTimeRangePlaceholder([start.toString(), end.toString()])(dsl)
}
