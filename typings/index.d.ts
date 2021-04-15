interface ESQuerySort {
  [key: string]: { order: 'asc' | 'desc', 'unmapped_type': 'long' | 'string' }
}

interface ESQueryStatisticTerm {
  field: string,
  size?: number
}

enum ESQueryStatisticAggrType {
  terms = 'terms', // case when aggr is count
  max = 'max',
  min = 'min',
  sum = 'sum',
  avg = 'avg'
}

interface ESQueryStatisticAggr {
  // 应该只有一个 key
  [key: string]: {
    [key: ESQueryStatisticAggrType]: ESQueryStatisticTerm,
    aggs?: ESQueryStatisticAggr
  }
}

interface ESQuery {
  // NOTE: ES DSL 要求的命名风格
  query: {
    'query_string': {
      query: string,
      'default_field': '_message'
    }
  },
  from: number
  size: number
  _source: string[]
  aggs?: ESQueryStatisticAggr,
  sort?: ESQuerySort[] | undefined
  'script_fields'?: unknown
}

interface SuggestionItem {
  label: string,
  code: string,
  description: string,
  example: string
}

declare namespace ast {
  enum ConditionType {
    SingleKeyword = "SingleKeyword",
    UnionKeywords = "UnionKeywords",
    KeyValue = "KeyValue",
    Union = "Union"
  }

  type ConditionNodeType = {
    [ConditionType.KeyValue]: Field,
    [ConditionType.SingleKeyword]: string,
    [ConditionType.UnionKeywords]: string,
    [ConditionType.Union]: Query,
  }

  enum OperationType {
    Statistic = "Statistic",
  }

  type OperationNodeType = {
    [OperationType.Statistic]: {
      fields: {
        aggr: 'count' | 'max' | 'min' | 'sum' | 'avg',
        fieldName: string,
        filter?: {
          fieldName: string,
          fieldValue: unknown
        },
        alias?: string
      }[]
      groupBy?: {
        fieldName: string,
        sortLimits: {
          fn: string, // 指标函数的别名
          sn: number, // 限制分桶数据输出的数量, 不限时请输入0
        } | null
      }[]
      filters?: string[]
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

  type CommandNodeType = {
    [CommandType.sort]: {
      fieldName: string,
      order?: "asc" | "desc"
    }[]
    [CommandType.limit]: string
    [CommandType.head]: unknown
    [CommandType.tail]: unknown
    [CommandType.top]: unknown
    [CommandType.rare]: unknown
    [CommandType.fields]: string[]
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

  interface Field {
    fieldName: string,
    fieldValue: {
      type: 'string' | 'number' | 'regexp' | 'range',
      value: unknown
    }
  }

}

type Ast = [
  ast.Query,
  ast.Operation[],
  ast.Command[]
]
