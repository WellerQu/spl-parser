
declare namespace ast {
  /**
   * 字段值类型枚举
   */
  enum FieldValueType {
    number = "number",
    string = "string",
    time = "time",
    regexp = "regexp",
    range = "range"
  }

  /**
   * 字段
   */
  interface Field {
    fieldName: string,
    fieldType: keyof typeof FieldValueType
    fieldValue?: unknown
  }

  /**
   * 聚合字段, 字段的一种
   */
  type AggrField = Pick<Field, 'fieldName' | 'fieldType'> & {
    aggr: 'count' | 'max' | 'min' | 'sum' | 'avg',
    filter?: Required<Field>,
    alias?: string
  }

  /**
   * 分组字段, 字段的一种
   */
  type GroupField = Pick<Field, 'fieldName' | 'fieldType'> & {
    sortLimits: {
      fn: string, // 指标函数的别名
      sn: number, // 限制分桶数据输出的数量, 不限时请输入0
    } | null
  }

  /**
   * 过滤字段, 字段的一种
   */
  type FilterField = Required<Field> & { operator: string }

  /**
   * 排序字段, 字段的一种
   */
  type SortField = Pick<Field, 'fieldName' | 'fieldType'> & { order?: "asc" | "desc" }

  /**
   * 筛选字段, 字段的一种
   */
  type SourceField = Pick<Field, 'fieldName' | 'fieldType'>


  /**
   * 加减乘除运算语法树
   */
  type OperatorAst = {
    type: 'fieldName' | 'number' | 'operator'
    value: string
  }

  /**
   * eval字段
   */
  type EvalField = {
    [propName: string]: string
    fn: 'ceil' | 'floor' | 'max' | 'min'
    params: OperatorAst[]
  }

  /**
   * 条件类型枚举
   */
  enum ConditionType {
    SingleKeyword = "SingleKeyword",
    UnionKeywords = "UnionKeywords",
    KeyValue = "KeyValue",
    SubQuery = "SubQuery",
    SubSearch = "SubSearch"
  }

  /**
   * 条件抽象语法树节点数据类型映射
   */
  type ConditionNodeType = {
    [ConditionType.KeyValue]: Field,
    [ConditionType.SingleKeyword]: string,
    [ConditionType.UnionKeywords]: string,
    [ConditionType.SubQuery]: Query,
    [ConditionType.SubSearch]: unknown
  }

  /**
   * 操作类型枚举
   */
  enum OperationType {
    Statistic = "Statistic",
  }

  /**
   * 操作抽象语法树节点数据类型映射
   */
  type OperationNodeType = {
    [OperationType.Statistic]: {
      fields: AggrField[]
      groupBy?: GroupField[]
      filters?: FilterField[]
    },
  }

  /**
   * 命令类型映射
   */
  enum CommandType {
    sort = "sort",
    limit = "limit",
    head = "head",
    tail = "tail",
    top = "top",
    rare = "rare",
    fields = "fields",
    table = "table",
    transaction = "transaction",
    eval = "eval"
  }

  /**
   * 命令抽象语法树节点数据类型映射
   */
  type CommandNodeType = {
    [CommandType.sort]: SortField[]
    [CommandType.limit]: string
    [CommandType.head]: unknown
    [CommandType.tail]: unknown
    [CommandType.top]: unknown
    [CommandType.rare]: unknown
    [CommandType.fields]: SourceField[]
    [CommandType.table]: unknown
    [CommandType.transaction]: unknown
    [CommandType.eval]: evalField
  }

  type Operation = ({
    [key in keyof typeof OperationType]: Node<key, OperationNodeType>
  })[keyof typeof OperationType]

  type Command = ({
    [key in keyof typeof CommandType]: Node<key, CommandNodeType>
  })[keyof typeof CommandType]

  type Condition = ({
    [key in keyof typeof ConditionType]: ConditionNode<key>
  })[keyof typeof ConditionType]

  /**
   * 查询语句
   */
  interface Query {
    groups: Group[]
  }

  /**
   * 查询语句中条件分组, 组与组之间使用 "OR" 连接
   */
  interface Group {
    conditions: Condition[]
  }

  /**
   * 抽象语法树节点
   */
  interface Node<T, P = unknown> {
    type: T,
    value: P[T]
  }

  /**
   * 抽象语法树条件节点, 抽象语法树节点的一种
   */
  interface ConditionNode<T> extends Node<T, ConditionNodeType> {
    decorator: ("NOT")[]
  }
}
