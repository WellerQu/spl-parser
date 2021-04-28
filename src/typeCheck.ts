import { FieldTypeError, AstError } from './errors'
import { identity } from './utils/identity'
import { pipe } from './utils/pipe'

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
 * 基于字段类型的映射关系检查字段是否支持当前操作
 * @param field 字段
 * @param mapping 字段类型映射关系
 */
function checkTypeBaseOnMapping(field: ast.Field, mapping: Map<string, TypeInfo[]>): void {

  // // 字段不存在
  if (!mapping.has(field.fieldName)) {
    throw new FieldTypeError(`字段 "${field.fieldName}" 不存在`)
  }

  // // 系统字段不检查
  // if (field.fieldName.startsWith('_')) {
  //   return
  // }

  // 字段不支持任何类型, 一般不太可能出现, 触发开发者写错了.
  const types = mapping.get(field.fieldName)
  if (!types || types.length === 0) {
    throw new FieldTypeError(`字段 "${field.fieldName}" 对应的类型信息不存在`)
  }

  // 字段当前的操作不被支持
  if (!types.includes(field.fieldType)) {
    throw new FieldTypeError(`字段 "${field.fieldName}" 的类型 "[${types.join(',')}]" 不支持此操作`)
  }
}

/**
 * 检查器
 * 注意, 检查器不会也不应该对抽象语法树做出任何改动
 */
type Checker = (mapping: Map<string, TypeInfo[]>) => (ast: Ast) => Ast

/**
 * 检查查询语句中的字段
 * 检查不通过会触发 FieldTypeError
 * @param ast 抽象语法树
 * @param mapping 字段类型关系映射
 * @returns 抽象语法树
 */
const checkQuery: Checker = mapping => ast => {
  const [query] = ast
  if (!query) {
    throw new AstError('抽象语法树缺少查询语句')
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
 * @returns 抽象语法树
 */
const checkOperation: Checker = mapping => ast => {
  const [, operations] = ast
  if (!operations) {
    return ast
  }

  // 循环检查所有的操作
  for (const operation of operations) {
    if (operation.type !== 'Statistic') {
      throw new AstError('暂时不支持非统计操作')
    }

    // 暂时只有一种操作类型, 就是统计
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
 * @returns 抽象语法树
 */
const checkCommands: Checker = mapping => ast => {
  const [, , commands] = ast
  if (!commands) {
    return ast
  }

  // 循环检查所有的命令
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
    } else if (command.type === 'eval') {
      const params = command.value.params
      ergodic(params.n2 ? [params.n1, params.n2] : [params.n1], mapping)
    } else {
      throw new AstError(`未支持检查的命令: ${command.type}`)
    }
  }

  return ast
}

/**
 * 递归检查运算表达式字段
* */
function ergodic(arr: ast.EvaluationExprNode[] | ast.EvaluationExprNode[][], mapping: Map<string, TypeInfo[]>) {
  arr.forEach((item: ast.EvaluationExprNode | ast.EvaluationExprNode[]) => {
    if (Array.isArray(item)) {
      ergodic(item, mapping)
    } else if (!Array.isArray(item) && item.type === 'field') {
      checkTypeBaseOnMapping(item.value, mapping)
    }
  })
}