/// <reference types="./ast" />
/// <reference types="./elasticsearch" />

type SuggestionMappings = {
  _exists_: '_exists_',
  Space: 'space',
  AND: 'and',
  OR: 'or',
  NOT: 'not',
  TO: 'to',
  Search: 'search',
  Count: 'count',
  MinS: 'minS',
  MaxS: 'maxS',
  MinE: 'minE',
  MaxE: 'maxE',
  Avg: 'avg',
  Sum: 'sum',
  DC: 'distinct_count',
  Ceil: 'ceil',
  Floor: 'floor',
  Abs: 'abs',
  Eval: 'evaluation',
  LimitN: 'limit',
  HeadN: 'head',
  TailN: 'tail',
  TopNF: 'top',
  RareNF: 'rare',
  FilterF: 'filter',
  FieldsF: 'fields',
  TableF: 'table',
  TransactionF: 'transaction',
  SortBy: 'sort_by',
  By: 'group_by',
  As: 'alias',
  Stats: 'stats',
  Pipe: 'pipe',
  Quote: 'quote',
  QuoteStr: 'quote_string',
  Slash: 'slash',
  Comma: 'comma',
  RegExpStr: 'regexp',
  'L_L_Bracket': 'L_L_Bracket',
  'R_L_Bracket': 'R_L_Bracket',
  'L_M_Bracket': 'L_M_Bracket',
  'R_M_Bracket': 'R_M_Bracket',
  'L_S_Bracket': 'L_S_Bracket',
  'R_S_Bracket': 'R_S_Bracket',
  Equal: 'equal',
  Gt: 'greater_than',
  Lt: 'less_than',
  Plus: 'plus',
  Minus: 'minus',
  Times: 'times',
  Num: 'number',
  Integer: 'integer',
  FieldName: 'fieldName',
  FieldValue: 'fieldValue',
  Identifier: 'identifier',
}

type SuggestionMapping = SuggestionMappings[keyof SuggestionMappings]

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
  tag: '关键词' | '符号' | '字段' | '字段值' | '函数' | '逻辑' | '算子' | '通用',
  /**
   * 与 PEGJS 中的词法映射
   */
  mapping: SuggestionMapping
  /**
   * 识别码
   */
  code: string,
  /**
   * 建议项描述
   */
  description?: string,
  /**
   * 语法
   */
  syntax?: string,
  /**
   * 建议项示例
   */
  example?: string,
  /**
   * 是否禁用, 如果禁用则不会出现在提示列表中
   */
  disabled?: boolean
}

/**
 * 抽象语法树中出现的字段
 */
interface Field extends ast.Field {
  location: 'condition' | 'statistic aggr' | 'statistic group' | 'command'
  formatName: string
}

/**
 * 抽象语法树中的关键词
 */
interface Keyword {
  location: 'condition',
  content: string
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
 * 解析器
 */
type Resolver = (ast: Ast) => (dsl: elasticsearch.ESQuery) => elasticsearch.ESQuery
/**
 * 逆向解析器
 */
type Reverser = (ast: Ast) => (SPL: string) => string

/**
 * 字段类型信息
 */
type TypeInfo = keyof typeof ast.FieldValueType