import { groups2string } from '../groups2string'


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

  dsl.query.query_string.query = groups2string(query, ':')

  return dsl
}
