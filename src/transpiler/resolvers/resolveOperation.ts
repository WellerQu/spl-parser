import { OperationError } from '../../errors'
import { format } from '../../utils/format'

/**
 * 最大聚合范围
 */
const AGGR_MAX_SIZE = 10000

/**
 * 解析出 aggr 字段
 * @param ast 抽象语法树
 * @returns ES DSL
 */
export const resolveOperation: Resolver = ast => dsl => {
  const [, operations] = ast
  if (!operations) {
    return dsl
  }

  if (operations.length === 0) {
    return dsl
  }

  const [operation] = operations
  if (operation.type !== 'Statistic') {
    throw new OperationError('暂时不支持非统计操作')
  }

  const { fields, groupBy, } = operation.value
  const [first] = fields
  const initialTerm: elasticsearch.ESQueryStatisticTerm = {
    field: format(first)
  }

  if (first.aggr === 'count') {
    initialTerm.size = AGGR_MAX_SIZE
  }

  const initialAggr: elasticsearch.ESQueryStatisticAggr = {
    [first.alias ?? `${first.aggr}(${first.fieldName})`]: {
      [first.aggr === 'count' ? 'terms' : first.aggr]: initialTerm
    }
  }
  const aggs: elasticsearch.ESQuery['aggs'] = (groupBy ?? []).reduceRight<elasticsearch.ESQueryStatisticAggr>((aggs, item) => {
    const fieldName = format(item)

    return {
      [item.fieldName]: {
        terms: {
          field: fieldName,
          size: AGGR_MAX_SIZE
        },
        aggs
      }
    }
  }, initialAggr)

  dsl.aggs = aggs

  return dsl
}