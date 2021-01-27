# SPL Input

提供 X-Bizseer 项目日志模块中将 SPL 转译为 ES DSL 的功能

## 用法

```typescript
// # typescript

import { toDSL } from 'spl-parser'

const dsl: ESQuery = toDSL('* | stats count(_application) as cnt')

/*
export interface ESQuery {
  fields: [string, FieldValueType][] | undefined
  // 查询语句
  query: {
    // NOTE: ES DSL 要求的命名风格
    'query_string': {
      query: string,
    },
  },
  aggs: unknown
  sort: Sort[] | undefined,
  from: number | undefined,
  size: number | undefined,
  _source: string[] | undefined
}
*/
```
