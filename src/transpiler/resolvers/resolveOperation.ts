import { OperationError } from '../../errors'
import { typing } from '../formatters'

/**
 * 最大聚合范围
 */
const AGGR_MAX_SIZE = 10000

/**
 * 移除 ES 不允许的字段名
 * @param fieldName 字段名
 * @returns 
 */
const removeNotAllowChars = (fieldName: string): string => {
  return fieldName.replace(/[[\]>]/igm, '')
}

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
    field: typing(first)
  }

  if (first.aggr === 'count') {
    initialTerm.size = AGGR_MAX_SIZE
  }

  const initialAggr: elasticsearch.ESQueryStatisticAggr = {
    [first.alias ?? `${first.aggr}(${removeNotAllowChars(first.fieldName)})`]: {
      [first.aggr === 'count' ? 'terms' : first.aggr]: initialTerm
    }
  }
  const aggs: elasticsearch.ESQuery['aggs'] = (groupBy ?? []).reduceRight<elasticsearch.ESQueryStatisticAggr>((aggs, item) => {
    const typedFieldName = typing(item)

    return {
      [removeNotAllowChars(item.fieldName)]: {
        terms: {
          field: typedFieldName,
          size: AGGR_MAX_SIZE
        },
        aggs
      }
    }
  }, initialAggr)

  dsl.aggs = aggs

  return dsl
}