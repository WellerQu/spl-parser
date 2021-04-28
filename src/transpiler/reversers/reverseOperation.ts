import { OperationError } from '../../errors'

export const reverseOperation: Reverser = ast => spl => {
  const [,operations] = ast
  if (!operations) {
    return spl
  }

  if (operations.length === 0) {
    return spl
  }

  const [operation] = operations
  if (operation.type !== 'Statistic') {
    throw new OperationError('暂时不支持非统计操作')
  }

  const statistic = [spl + ' | stats']
  const { fields, groupBy, } = operation.value
  const [first] = fields

  statistic.push(`${first.aggr}(${first.fieldName})`)

  if (first.alias) {
    statistic.push(`as ${first.alias}`)
  }
  if (groupBy) {
    statistic.push(`by ${groupBy.map(item => item.fieldName).join(',')}`)
  }

  return statistic.join(' ')
}

