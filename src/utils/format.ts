/**
 * 格式化字段名称
 * @param field 字段
 * @returns 字段显示名称
 */
export function format(field: ast.Field):string {
  if (field.fieldName.startsWith("_")) {
    return field.fieldName
  }

  if (field.fieldType === 'number' || field.fieldType === 'range') {
    return `${field.fieldName}_number`
  } else {
    return `${field.fieldName}_string`
  }
}