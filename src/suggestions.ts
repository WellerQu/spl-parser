import { tryParse } from './parser'

/**
 * 建议项详情, 与 PEGJS 语法文件 grammar.ts 中的词法器部分呈一一对应关系
 * 
 * 例如:
 * _exists_ "_exists_" = "_exists_"
 * <词法>    <MAPPING>  = <RULE>
 */
export const SUGGESTIONS: Record<SuggestionMapping, SuggestionItem | undefined> = {
  '_exists_': {
    label: '_exists_',
    tag: '关键词',
    mapping: '_exists_',
    code: '_exists_',
    description: '查找拥有<字段名>的日志原文',
    syntax: '_exists_=<字段名>',
    example: '_exists_=fieldName'
  },
  'space': {
    label: '空格',
    tag: '符号',
    mapping: 'space',
    code: ' ',
    description: '一个空格字符',
  },
  'and': {
    label: '并且',
    tag: '逻辑',
    mapping: 'and',
    code: 'AND',
    description: '查询条件的逻辑连接符, 左右的条件须同时成立, 优先级比 OR 高',
    syntax: '<条件1> AND <条件2>',
    example: 'localhost=10.16.12.44 AND domain=*.bizseer.com'
  },
  'or': {
    label: '或者',
    tag: '逻辑',
    mapping: 'or',
    code: 'OR',
    description: '查询条件的逻辑连接符, 左右的条件至少须一个成立, 优先级比 AND 低',
    syntax: '<条件1> OR <条件2>',
    example: 'localhost=10.16.12.44 OR domain=*.bizseer.com'
  },
  'not': {
    label: '否定',
    tag: '逻辑',
    mapping: 'not',
    code: 'NOT',
    description: '查询条件的逻辑否定修饰符, 条件的逆命题',
    syntax: 'NOT <条件>',
    example: 'NOT host'
  },
  'to': {
    label: '范围描述',
    tag: '关键词',
    mapping: 'to',
    code: 'TO',
    description: '字段查询时设置字段值的查询范围, "[" 表示大于等于, "]" 表示小于等于, "{" 表示大于, "}" 表示小于',
    syntax: '<字段名>=[<范围开始> TO <范围结束>] 或者 <字段名>={<范围开始>, <范围结束>]',
    example: 'APP_CODE=[1992 TO 2001]'
  },
  'search': {
    label: '子查询',
    tag: '关键词',
    mapping: 'search',
    code: 'search',
    description: '作为条件的查询语句',
    syntax: '<条件> <AND/OR> (search <子条件>)',
    example: 'host=localhost AND (search domain=*.bizseer.com)'
  },
  'count': {
    label: 'count 函数',
    tag: '函数',
    mapping: 'count',
    code: 'count',
    description: '求参数所有值的出现的次数',
    syntax: '* | stats count(<字段名>) [as <别名>] [by <排序字段1>[,<排序字段2>...]]',
    example: '* | stats count(app_code)'
  },
  'min': {
    label: 'min 函数',
    tag: '函数',
    mapping: 'min',
    code: 'min',
    description: '求参数所有值中的最小值',
    syntax: '* | stats min(<字段名>) [as <别名>] [by <排序字段1>[,<排序字段2>...]]',
    example: '* | stats min(amount)'
  },
  'max': {
    label: 'max: 函数',
    tag: '函数',
    mapping: 'max',
    code: 'max',
    description: '求参数所有值中的最大值',
    syntax: '* | stats max(<字段名>) [as <别名>] [by <排序字段1>[,<排序字段2>...]]',
    example: '* | stats max(amount)'
  },
  'avg': {
    label: 'avg 函数',
    tag: '函数',
    mapping: 'avg',
    code: 'avg',
    description: '求参数所有值的平均值',
    syntax: '* | stats avg(<字段名>) [as <别名>] [by <排序字段1>[,<排序字段2>...]]',
    example: '* | stats avg(amount)'
  },
  'sum': {
    label: 'sum 函数',
    tag: '函数',
    mapping: 'sum',
    code: 'sum',
    description: '求参数所有值的总和',
    syntax: '* | stats sum(<字段名>) [as <别名>] [by <排序字段1>[,<排序字段2>...]]',
    example: '* | stats sum(amount)'
  },
  'distinct_count': {
    label: 'dc 函数',
    tag: '函数',
    mapping: 'distinct_count',
    code: 'dc',
    description: '求参数所有值的去重后出现的次数',
    syntax: '* | stats dc(<字段名>) [as <别名>] [by <排序字段1>[,<排序字段2>...]]',
    example: '* | stats dc(app_code)',
    disabled: true
  },
  'ceil': {
    label: 'ceil 函数',
    tag: '函数',
    mapping: 'ceil',
    code: 'ceil',
    description: '求参数向上取整后的值',
    syntax: '* | eval <计算列名称>=ceil(<表达式>)',
    example: '* | eval computed_amount=ceil(amount + 100)'
  },
  'floor': {
    label: 'floor 函数',
    tag: '函数',
    mapping: 'floor',
    code: 'floor',
    description: '求参数向下取整后的值',
    syntax: '* | eval <计算列名称>=floor(<表达式>)',
    example: '* | eval computed_amount=floor(amount / 2)'
  },
  'abs': {
    label: 'abs 函数',
    tag: '函数',
    mapping: 'abs',
    code: 'abs',
    description: '求参数的绝对值',
    syntax: '* | eval <计算列名称>=abs(<表达式>)',
    example: '* | eval computed_amount=abs(amount - 100)'
  },
  'evaluation': {
    label: 'eval 命令',
    tag: '算子',
    mapping: 'evaluation',
    code: 'eval',
    description: '计算组合值',
    syntax: '* | eval <计算列名称>=<函数>(<表达式>)',
    example: '* | eval new_name=abs(amount - 100)'
  },
  'limit': {
    label: 'limit 命令',
    tag: '算子',
    mapping: 'limit',
    code: 'limit',
    description: '限制查询结果的最大条数',
    syntax: '* | limit <正正数>',
    example: '* | limit 10'
  },
  'head': {
    label: 'head 命令',
    tag: '算子',
    mapping: 'head',
    code: 'head',
    description: '取查询结果的前 N 条数据, 与 limit 命令相同',
    syntax: '* | head <正正数>',
    example: '* | head 10',
    disabled: true
  },
  'tail': {
    label: 'tail 命令',
    tag: '算子',
    mapping: 'tail',
    code: 'tail',
    description: '取查询结果的后 N 条数据',
    syntax: '* | tail <正正数>',
    example: '* | tail 10',
    disabled: true
  },
  'top': {
    label: 'top 命令',
    tag: '算子',
    mapping: 'top',
    code: 'top',
    description: '统计field的数量, 并取前 N 条记录, 与 rare 命令相同',
    syntax: '* | top <正整数> <字段名>',
    example: '* | top 5 lastName',
    disabled: true
  },
  'rare': {
    label: 'rare 命令',
    tag: '算子',
    mapping: 'rare',
    code: 'rare',
    description: '统计field的数量, 并取前 N 条记录, 与 top 命令相同',
    syntax: '* | rare <正整数> <字段名>',
    example: '* | rare 5 lastName',
    disabled: true
  },
  'filter': {
    label: 'filter 命令',
    tag: '算子',
    mapping: 'filter',
    code: 'filter',
    description: '在统计操作时设置过滤条件',
    syntax: '* | stats <函数名>(<字段名>[filter <字段名>=<值>]) 或 * | stats <函数名>(<字段名>) | filter <字段名> <比较运算符> <值>',
    example: '* | stats max(timestamp[filter logType=res]) 或 * | stats max(timestamp) | filter cc > 20',
    disabled: true
  },
  'fields': {
    label: 'fields 命令',
    tag: '算子',
    mapping: 'fields',
    code: 'fields',
    description: '指定输出字段名',
    syntax: '* | fields [<字段名1> [,<字段名2>...]]',
    example: '* | fields state,city,firstName'
  },
  'table': {
    label: 'table 命令',
    tag: '算子',
    mapping: 'table',
    code: 'table',
    description: '指定输出字段名, 并在可视化中以表格的方式呈现',
    syntax: '* | table [<字段名1> [,<字段名2>...]]',
    example: '* | fields state,city,firstName',
    disabled: true
  },
  'transaction': {
    label: 'transaction 命令',
    tag: '算子',
    mapping: 'transaction',
    code: 'transaction',
    description: '将一组相关日志组合成一个"组", 并在单个组内进行事务耗时统计及分组',
    syntax: '* | transaction <字段名1>[,<字段名2>...] [options]',
    example: '* | transaction a,b maxspan=5s',
    disabled: true
  },
  'sort_by': {
    label: 'sort by 命令',
    tag: '算子',
    mapping: 'sort_by',
    code: 'sort by',
    description: '将查询结果按指定字段与排序规则进行排序',
    syntax: '* | sort by <字段名1>[+/-][,<字段名2>[+/-]...] 其中"+"表示升序, "-"表示降序, 排序规则缺省时默认降序排列',
    example: '* | sort by _event_time'
  },
  'group_by': {
    label: '按指定字段分组',
    tag: '关键词',
    mapping: 'group_by',
    code: 'by',
    description: '在进行统计聚合时, 指定分组字段',
    syntax: '* | stats <函数名>(<字段名1>) [by <字段名2>[,<字段名3>...]]',
    example: '* | stats count(amount) by year'
  },
  'alias': {
    label: '指定别名',
    tag: '关键词',
    mapping: 'alias',
    code: 'as',
    description: '在进行统计聚合时, 指定聚合字段的别名',
    syntax: '* | stats <函数名>(<字段名>) [as <自定义名称>]',
    example: '* | stats count(amount) as amt'
  },
  'stats': {
    label: '聚合统计操作',
    tag: '关键词',
    mapping: 'stats',
    code: 'stats',
    description: '将查询结果进行聚合统计',
    syntax: '* | stats <函数名>(<字段名1>)[ as <自定义名称>][ by <字段名2>[,<字段名3>...]]',
    example: '* | stats count(amount) as amt by year'
  },
  'pipe': {
    label: '管道符',
    tag: '符号',
    mapping: 'pipe',
    code: '|',
    description: '连接数据操作',
    syntax: '*[|<操作1>...]',
    example: '* | stats count(amount) as amt | fields amt'
  },
  'quote': {
    label: '双引号',
    tag: '符号',
    mapping: 'quote',
    code: '"',
    description: '包裹词组的符号',
    syntax: '"<关键词1> <关键词2>[ <关键词3>...]"',
    example: '"local host"'
  },
  'quote_string': {
    label: '字符串界定符',
    tag: '符号',
    mapping: 'quote_string',
    code: '',
  },
  'slash': {
    label: '正则界定符 或 除法算术运算符',
    tag: '符号',
    mapping: 'slash',
    code: '/',
  },
  'comma': {
    label: '逗号',
    tag: '符号',
    mapping: 'comma',
    code: ','
  },
  'regexp': {
    label: '正则表达式',
    tag: '符号',
    mapping: 'regexp',
    code: ''
  },
  'L_L_Bracket': {
    label: '左大括号',
    tag: '符号',
    mapping: 'L_L_Bracket',
    code: '{',
    description: '可用作左开区间'
  },
  'R_L_Bracket': {
    label: '右大括号',
    tag: '符号',
    mapping: 'R_L_Bracket',
    code: '}',
    description: '可用作右开区间'
  },
  'L_M_Bracket': {
    label: '左中括号',
    tag: '符号',
    mapping: 'L_M_Bracket',
    code: '[',
    description: '可用作左闭区间'
  },
  'R_M_Bracket': {
    label: '右中括号',
    tag: '符号',
    mapping: 'R_M_Bracket',
    code: ']',
    description: '可用作右闭区间'
  },
  'L_S_Bracket': {
    label: '左小括号',
    tag: '符号',
    mapping: 'L_S_Bracket',
    code: '(',
    description: '可用作提升条件优先级或函数调用'
  },
  'R_S_Bracket': {
    label: '右小括号',
    tag: '符号',
    mapping: 'R_S_Bracket',
    code: ')',
    description: '可用作提升条件优先级或函数调用'
  },
  'equal': {
    label: '等于号',
    tag: '符号',
    mapping: 'equal',
    code: '=',
  },
  'greater_than': {
    label: '大于号',
    tag: '符号',
    mapping: 'greater_than',
    code: '>'
  },
  'less_than': {
    label: '小于号',
    tag: '符号',
    mapping: 'less_than',
    code: '<'
  },
  'plus': {
    label: '加法算术运算符',
    tag: '符号',
    mapping: 'plus',
    code: '+',
  },
  'minus': {
    label: '减法算术运算符',
    tag: '符号',
    mapping: 'minus',
    code: '-'
  },
  'times': {
    label: '乘法算术运算符',
    tag: '符号',
    mapping: 'times',
    code: '*'
  },
  'number': {
    label: '数字',
    tag: '符号',
    mapping: 'number',
    code: '',
    description: '所有的自然数'
  },
  'integer': {
    label: '整数',
    tag: '符号',
    mapping: 'integer',
    code: '',
    description: '所有的整数'
  },
  'fieldName': {
    label: '可选字段',
    tag: '字段',
    mapping: 'fieldName',
    code: '',
  },
  'fieldValue': {
    label: '可选字段值',
    tag: '通用',
    mapping: 'fieldValue',
    code: ''
  }, 
  'identifier': {
    label: '通用标识符',
    tag: '通用',
    mapping: 'identifier',
    code: ''
  }
}

/**
 * 根据用户的输入, 提供接下来的输入建议
 * @param input 用户输入 SPL
 * @returns 建议列表
 */
export function getSuggestions(input: string): [SuggestionItem[], string | undefined] {
  const items: SuggestionItem[] = []

  const [, suggestionMetadata, found] = tryParse(input)
  for (const meta of suggestionMetadata) {
    const suggestion = SUGGESTIONS[meta as SuggestionMapping]
    if (!suggestion) {
      continue
    }

    items.push(suggestion)
  }

  return [items, found]
}