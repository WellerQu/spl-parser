import { pipe } from '../../utils/pipe'
import { conditionExpr } from '../conditionExpr'
import { escape } from '../formatters'

export const reverseQuery: Reverser = ast => spl => {
  const [query] = ast
  if (!query) {
    return spl
  }

  return spl + conditionExpr(query, '=', pipe((field: ast.Field) => field.fieldName, escape))
}