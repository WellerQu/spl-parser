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
  aggs?: unknown,
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
        aggr: string
        fieldName: string,
        filter?: {
          fieldName: string,
          fieldValue: unknown
        },
        alias?: string
      }[]
      groupBy?: string
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
}

type Ast = [
  ast.Query,
  ast.Operation[],
  ast.Command[]
]
