/**
 * 从语法树中获取关键词列表
 * @param ast 抽象语法树
 * @returns 关键词列表
 */
export function getKeywords(ast: Ast): Keyword[] {
  const [query,] = ast

  return getFieldsFromQuery(query)
}

function getFieldsFromQuery(query: ast.Query): Keyword[] {
  return query.groups.reduce<Keyword[]>((keywords, group) => {
    return group.conditions.reduce<Keyword[]>((keywords, condition) => {
      if (condition.type === 'SingleKeyword' || condition.type === 'UnionKeywords') {
        keywords.push({
          location: 'condition',
          content: condition.value
        })
      }

      if (condition.type === 'SubQuery') {
        keywords.push(...getFieldsFromQuery(condition.value))
      }

      return keywords
    }, keywords)
  }, [])
}