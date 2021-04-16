
declare namespace ast {
  enum FieldValueType {
    number = "number",
    string = "string",
    time = "time",
    regexp = "regexp",
    range = "range"
  }

  interface Field {
    fieldName: string,
    fieldType: keyof typeof FieldValueType
    fieldValue?: unknown
  }

  enum ConditionType {
    SingleKeyword = "SingleKeyword",
    UnionKeywords = "UnionKeywords",
    KeyValue = "KeyValue",
    SubQuery = "SubQuery",
    SubSearch = "SubSearch"
  }

  type ConditionNodeType = {
    [ConditionType.KeyValue]: Field,
    [ConditionType.SingleKeyword]: string,
    [ConditionType.UnionKeywords]: string,
    [ConditionType.SubQuery]: Query,
    [ConditionType.SubSearch]: unknown
  }

  enum OperationType {
    Statistic = "Statistic",
  }


  type AggrField = Pick<Field, 'fieldName' | 'fieldType'> & {
    aggr: 'count' | 'max' | 'min' | 'sum' | 'avg',
    filter?: Required<Field>,
    alias?: string
  }
  type GroupField = Pick<Field, 'fieldName' | 'fieldType'> & {
    sortLimits: {
      fn: string, // 指标函数的别名
      sn: number, // 限制分桶数据输出的数量, 不限时请输入0
    } | null
  }
  type FilterField = Required<Field> & { operator: string }
  type OperationNodeType = {
    [OperationType.Statistic]: {
      fields: AggrField[]
      groupBy?: GroupField[]
      filters?: FilterField[]
    },
  }

  enum CommandType {
    sort = "sort",
    limit = "limit",
    head = "head",
    tail = "tail",
    top = "top",
    rare = "rare",
    fields = "fields",
    table = "table",
    transaction = "transaction"
  }

  type SortField = Pick<Field, 'fieldName' | 'fieldType'> & {
    order?: "asc" | "desc"
  }
  type SourceField = Pick<Field, 'fieldName' | 'fieldType'>
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

  interface Query {
    groups: Group[]
  }

  interface Group {
    conditions: Condition[]
  }

  interface Node<T, P = unknown> {
    type: T,
    value: P[T]
  }

  interface ConditionNode<T> extends Node<T, ConditionNodeType> {
    decorator: ("NOT")[]
  }
}
