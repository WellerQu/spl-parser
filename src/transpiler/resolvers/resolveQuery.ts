import { pipe } from '../../utils/pipe'
import { conditionExpr } from '../conditionExpr'
import { typing, escape } from '../formatters'

/**
 * 解析出 query.query_string.query 字段
 * @param ast 抽象语法树
 * @returns ES DSL
 */
export const resolveQuery: Resolver = ast => dsl => {
  const [query] = ast
  if (!query) {
    return dsl
  }

  dsl.query.query_string.query = conditionExpr(query, ':', pipe(typing, escape))

  return dsl
}
