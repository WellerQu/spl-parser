import { ConditionError } from '../errors'
import { typing } from './formatters'

/**
 * 条件组转字符串
 * @param query 抽象语法树的查询段
 * @returns 查询语句
 */
export const conditionExpr = (query: Ast[0], separator: string, format = typing): string =>
  query.groups.map(group => {
    return group.conditions.map(condition => {
      const result = condition.decorator.includes('NOT') ? ['NOT'] : []

      if (condition.type === 'SingleKeyword') {
        result.push(condition.value)
      } else if (condition.type === 'UnionKeywords') {
        result.push(`"${condition.value ?? ''}"`)
      } else if (condition.type === 'KeyValue') {
        const { fieldType, fieldValue } = condition.value
        const fieldName = format(condition.value)

        if (fieldType === 'string')
          result.push(`${fieldName}${separator}"${fieldValue ?? ''}"`)
        else if (fieldType === 'number')
          result.push(`${fieldName}${separator}${fieldValue}`)
        else if (fieldType === 'regexp')
          result.push(`${fieldName}${separator}/${fieldValue}/`)
        else if (fieldType === 'range')
          result.push(`${fieldName}${separator}${fieldValue}`)
        else if (fieldType === 'time')
          throw new ConditionError('Not Implemented: field type is time')
      } else if (condition.type === 'SubQuery') {
        result.push('(' + conditionExpr(condition.value, separator, format) + ')')
      } else {
        throw new ConditionError(`尚未支持的查询条件 ${condition.type}`)
      }

      return result.join(' ')
    }).join(' AND ')
  }).join(' OR ')