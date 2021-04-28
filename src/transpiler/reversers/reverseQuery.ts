import { groups2string } from '../groups2string'

export const reverseQuery: Reverser = ast => spl => {
  const [query] = ast
  if (!query) {
    return spl
  }

  return spl + groups2string(query, '=', (field) => field.fieldName)
}