/**
 * 建议项
 */
interface SuggestionItem {
  /**
   * 人类可读名称
   */
  label: string,
  /**
   * 建议项的类型
   */
  tag: '关键词' | '符号' | '字段' | '函数' | '逻辑' | '算子',
  /**
   * 与 PEGJS 中的词法映射码
   */
  code: string,
  /**
   * 建议项描述
   */
  description: string,
  /**
   * 建议项示例
   */
  example: string
}

/**
 * 抽象语法树
 */
type Ast = [
  /**
   * 查询语句段
   */
  ast.Query,
  /**
   * 查询结果操作段
   */
  ast.Operation[],
  /**
   * 查询结果命令段
   */
  ast.Command[]
]

/**
 * 字段类型信息
 */
type TypeInfo = keyof typeof ast.FieldValueType