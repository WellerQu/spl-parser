export type TypeInfo = keyof typeof ast.FieldValueType

/**
 * 为抽象语法树中的字段进行类型检查, 若出现不符合预期的类型, 则类型错误
 * @param ast 抽象语法树
 * @returns 检查字段类型后的抽象语法树
 */
export const typeCheck = (mapping?: Map<string, TypeInfo[]>) => (ast: Ast): Ast => {
  if (!mapping)
    return ast

  // 遍历查询中的字段
  // 遍历操作中的字段
  // 遍历命令中的字段

  return ast
}

/**
 * 基于字段类型的映射关系为字段添加类型
 * @param field 字段
 * @param mapping 字段类型映射关系
 * @returns 字段
 */
function checkTypeBaseOnMapping(field: ast.Field, mapping: Map<string, TypeInfo[]>): ast.Field {
  // 系统字段不检查, 不改名
  if (field.fieldName.startsWith("_")) {
    return field
  }

  // 类型检查
  if (!mapping.has(field.fieldName)) {
    throw new Error(`字段 "${field.fieldName}" 不存在`)
  }

  const types = mapping.get(field.fieldName)
  if (!types) {
    throw new Error(`字段 "${field.fieldName}" 对应的类型信息不存在`)
  }

  if (!types.includes(field.fieldType)) {
    throw new Error(`字段 "${field.fieldName}" 的类型不支持此操作`)
  }

  // 自定义字段
  field.fieldName = `${field.fieldName}_${field.fieldType}`

  return field
} 