# SPL Input

提供 X-Bizseer 项目日志模块中带有语法提示的 SPL文本输入框

需要注意的是, 语法提示不对查询语句的正确性做任何保证, 仅根据静态语法规则提供联想.

## 用法

```typescript
// # typescript

import * as React from 'react'
import * as ReactDOM from 'react-dom'

// 导入 spl-input 包
import { FieldValueType, QueryInput } from 'spl-input'
import { DistinctField } from 'spl-input/hooks/useSyntaxSuggestions'

// 导入 css 文件
import 'spl-input/spl-input.css'

const fields: DistinctField[] = [{
  name: 'application',
  valueType: FieldValueType.str,
}, {
  name: 'service',
  valueType: FieldValueType.str,
}, {
  name: 'host',
  valueType: FieldValueType.str,
}, {
  name: 'level',
  valueType: FieldValueType.num,
}]

ReactDOM.render(
  <div style={ { padding: 24 } }>
    {/* QueryInput 即带有语法提示的文本框 */}
    <QueryInput fieldOptionItems={fields} />
  </div>,
  document.getElementById('root'),
)
```

## QueryInput 属性介绍

| 属性名 | 是否可选  | 数据类型 | 描述 |
| -- | -- | -- | -- |
| fieldOptionItems | 必填 | DistinctField[] | 提示时可选的字段列表 |
| value | 可选 | string | 输入框中的字符串 |
| loading | 可选 | boolean | 输入框目前是否处于正在加载数据的状态 |
| onQueryChange | 可选 | (query: string) => void | 输入框内容变化事件, 选择推荐条目或键入字符均会触发 |
| onQueryEnter | 可选 | () => void | 回车按下事件, 按下Enter时触发 |
