import { identity } from './utils/identity'
import { pipe } from './utils/pipe'


export class FieldTypeError extends Error {}

export class AstError extends Error {}

/**
 * 为抽象语法树中的字段进行类型检查, 若出现不符合预期的类型, 则类型错误
 * @param ast 抽象语法树
 * @param mapping 字段类型关系映射
 * @returns 检查字段类型后的抽象语法树
 */
export const typeCheck = (mapping?: Map<string, TypeInfo[]>): (ast: Ast) => Ast => {
  if (!mapping) {
    return identity
  }

  return pipe(
    checkQuery(mapping),
    checkOperation(mapping),
    checkCommands(mapping)
  )
}

/**
 * 基于字段类型的映射关系为字段添加类型
 * @param field 字段
 * @param mapping 字段类型映射关系
 * @returns 字段
 */
function checkTypeBaseOnMapping(field: ast.Field, mapping: Map<string, TypeInfo[]>): void {
  // 类型检查
  if (!mapping.has(field.fieldName)) {
    throw new FieldTypeError(`字段 "${field.fieldName}" 不存在`)
  }

  // 系统字段不检查, 不改名
  if (field.fieldName.startsWith("_")) {
    return
  }

  const types = mapping.get(field.fieldName)
  if (!types) {
    throw new FieldTypeError(`字段 "${field.fieldName}" 对应的类型信息不存在`)
  }

  if (!types.includes(field.fieldType)) {
    throw new FieldTypeError(`字段 "${field.fieldName}" 的类型 "[${types.join(',')}]" 不支持此操作`)
  }
}

type Checker = (mapping: Map<string, TypeInfo[]>) => (ast: Ast) => Ast

/**
 * 检查查询语句中的字段
 * 检查不通过会触发 FieldTypeError
 * @param ast 抽象语法树
 * @param mapping 字段类型关系映射
 * @returns 
 */
const checkQuery: Checker = mapping => ast => {
  const [query] = ast
  if (!query) {
    throw new AstError("抽象语法树缺少查询语句")
  }

  // 递归检查, 不用担心递归调用栈爆栈的问题, 这个世界上不存在写十几层括号还没把自己绕进去的人
  for (const group of query.groups) {
    for (const condition of group.conditions) {
      if (condition.type !== 'KeyValue') {
        continue
      }

      // 检查键值对中字段的类型
      checkTypeBaseOnMapping(condition.value, mapping)
    }
  }

  return ast
}

/**
 * 检查操作中的字段
 * 检查不通过会触发 FieldTypeError
 * @param ast 抽象语法树
 * @param mapping 字段类型关系映射
 * @returns 
 */
const checkOperation: Checker = mapping => ast => {
  const [, operations] = ast
  if (!operations) {
    return ast
  }

  // 循环检查
  for (const operation of operations) {
    if (operation.type !== 'Statistic') {
      throw new AstError('暂时不支持非统计操作')
    }
    const statistic = operation.value

    for (const field of statistic.fields) {
      checkTypeBaseOnMapping(field, mapping)
    }

    for (const field of statistic.groupBy ?? []) {
      checkTypeBaseOnMapping(field, mapping)
    }

    for (const field of statistic.filters ?? []) {
      checkTypeBaseOnMapping(field, mapping)
    }
  }

  return ast
}

/**
 * 检查命令中的字段
 * 检查不通过会触发 FieldTypeError
 * @param ast 抽象语法树
 * @param mapping 字段类型关系映射
 * @returns 
 */
const checkCommands: Checker = mapping => ast => {
  const [, , commands] = ast
  if (!commands) {
    return ast
  }

  // 循环检查
  for (const command of commands) {
    if (command.type === 'limit') {
      continue
    }

    if (command.type === 'fields') {
      for (const field of command.value) {
        checkTypeBaseOnMapping(field, mapping)
      }
    } else if (command.type === 'sort') {
      for (const field of command.value) {
        checkTypeBaseOnMapping(field, mapping)
      }
    } else {
      throw new AstError(`未支持检查的命令: ${command.type}`)
    }
  }

  return ast
}