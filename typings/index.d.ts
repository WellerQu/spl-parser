interface ESQuerySort {
  [key: string]: { order: 'asc' | 'desc', 'unmapped_type': 'long' | 'string' }
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
  aggs?: ast.StatisticAggr,
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
    [ConditionType.KeyValue]: FieldNode,
    [ConditionType.SingleKeyword]: string,
    [ConditionType.UnionKeywords]: string,
    [ConditionType.Union]: Query,
  }

  type Condition = {
    [key in keyof typeof ConditionType]: ConditionNode<key>
  }[keyof typeof ConditionType]

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

  type Operation = {
    [key in keyof typeof OperationType]: OperationNode<key>
  }[keyof typeof OperationType]

  interface Command {

  }

  interface Query {
    groups: Group[]
  }

  interface Group {
    conditions: Condition[]
  }

  interface OperationNode<T> {
    type: T,
    value: OperationNodeType[T]
  }

  interface ConditionNode<T> {
    type: T,
    value: ConditionNodeType[T],
    decorator: ("NOT")[]
  }

  interface FieldNode {
    fieldName: string,
      fieldValue: {
      type: 'string' | 'number' | 'regexp' | 'range',
        value: unknown
    }
  }

  interface StatisticTerm {
    field: string,
    size: number
  }

  enum StatisticAggrType {
    terms = 'terms', // case when aggr is count
    max = 'max',
    min = 'min',
    sum = 'sum',
    avg = 'avg'
  }

  interface StatisticAggr {
    // 应该只有一个 key
    [key: string]: {
      [key: StatisticAggrType]: StatisticTerm,
      aggs?: StatisticAggr
    }
  }
}

type Ast = [
  ast.Query,
  ast.Operation[],
  ast.Command[]
]
