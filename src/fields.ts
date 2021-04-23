import { OperationError } from './errors'
import { format } from './utils/format'

/**
 * 从语法树中获取字段列表
 * @param ast 抽象语法树
 * @returns 字段列表
 */
export function getFields(ast: Ast): Field[] {
  const [query, operations,] = ast

  return [...getFieldsFromQuery(query), ...getFieldsFromOperation(operations)]
}

function getFieldsFromQuery(query: ast.Query): Field[] {
  return query.groups.reduce<Field[]>((fields, group) => {
    return group.conditions.reduce<Field[]>((fields, condition) => {
      if (condition.type === 'KeyValue') {
        fields.push({
          ...condition.value,
          location: 'query',
          formatName: format(condition.value)
        })
      }

      if (condition.type === 'SubQuery') {
        fields.push(...getFieldsFromQuery(condition.value))
      }

      return fields
    }, fields)
  }, [])
}

function getFieldsFromOperation(operations: ast.Operation[]): Field[] {
  const fields: Field[] = []

  if (!operations) {
    return fields
  }

  if (operations.length === 0) {
    return fields
  }

  const [operation] = operations
  if (operation.type !== 'Statistic') {
    throw new OperationError('暂时不支持非统计操作')
  }

  const { fields: aggrFields, groupBy = [], } = operation.value
  for (const item of aggrFields) {
    fields.push({
      fieldName: item.fieldName,
      fieldType: item.fieldType,
      formatName: format(item),
      location: 'statistic' 
    })
  }

  for (const item of groupBy) {
    fields.push({
      fieldName: item.fieldName,
      fieldType: item.fieldType,
      formatName: format(item),
      location: 'statistic group'
    })
  }

  return fields
}