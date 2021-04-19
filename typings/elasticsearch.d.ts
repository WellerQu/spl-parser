declare namespace elasticsearch {
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
    from?: number
    size?: number
    _source?: string[]
    aggs?: ESQueryStatisticAggr,
    sort?: ESQuerySort[] | undefined
    'script_fields'?: unknown
  }
}