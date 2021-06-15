import { pipe } from '../utils/pipe'

/**
 * 将字符串中的特殊字符 `[]` 转义为 `\\[\\]`
 * @param str 字符串
 * @returns 
 */
export function escape(str: string): string {
  return str
    .replace('[', '\\[')
    .replace(']', '\\]')
}

/**
 * 格式化查询条件中的字段名.
 * 将 aaa 输出为 aaa_string 形式
 * @param field 字段
 * @returns 字段显示名称
 */
export function typing(field: ast.Field):string {
  if (field.fieldName.startsWith('_')) {
    return field.fieldName
  }

  if (field.fieldType === 'number' || field.fieldType === 'range') {
    return `${field.fieldName}_number`
  } else {
    return `${field.fieldName}_string`
  }
}

/**
 * 格式化Evaluation表达式中的字段名.
 * 将 aaa 输出为 doc['aaa_string'].value 的形式
 * @param field 字段
 * @returns 字段显示名称
 */
export const docs = pipe(typing, escape, (name: string) => `doc['${name}'].value`)

/**
 * 取出字段的原名称
 * @param field 抽象语法树的字段节点
 * @returns 字段的名称
 */
export const raw = (field: ast.Field): string => field.fieldName

/**
 * 取出字段名
 * @param field 抽象语法树中的排序字段
 * @returns 带有排序规则标识的字段名
 */
export const order = (field: ast.SortField): string => field.fieldName + (
  field.order === 'asc'
    ? '+'
    : field.order === 'desc'
      ? '-'
      : ''
)
