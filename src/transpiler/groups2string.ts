import { ConditionError } from '../errors'
import { format } from '../utils/format'

/**
 * 条件组转字符串
 * @param query 抽象语法树的查询段
 * @returns 查询语句
 */
export const groups2string = (query: Ast[0], separator: string, fieldNameFormat = format): string =>
  query.groups.map(group => {
    return group.conditions.map(condition => {
      const result = condition.decorator.includes('NOT') ? ['NOT'] : []

      if (condition.type === 'SingleKeyword') {
        result.push(condition.value)
      } else if (condition.type === 'UnionKeywords') {
        result.push(`"${condition.value ?? ''}"`)
      } else if (condition.type === 'KeyValue') {
        const { fieldType, fieldValue } = condition.value
        const fieldName = fieldNameFormat(condition.value)

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
        result.push('(' + groups2string(condition.value, separator, fieldNameFormat) + ')')
      } else {
        throw new ConditionError(`尚未支持的查询条件 ${condition.type}`)
      }

      return result.join(' ')
    }).join(' AND ')
  }).join(' OR ')