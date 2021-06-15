import { conditionExpr } from '../conditionExpr'

export const reverseQuery: Reverser = ast => spl => {
  const [query] = ast
  if (!query) {
    return spl
  }

  return spl + conditionExpr(query, '=', (field: ast.Field) => field.fieldName)
}