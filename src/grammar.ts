export const grammar = `
/**
 * 解释查询语句的语法定义, 更多信息参见:
 * [PEGJS](https://pegjs.org/)
 *
 * @Author: Qiuwei
 * @since: 2020年11月17日
 */

{
  // s -> s
  const toUpperCase = s => s.toUpperCase()
  // p -> [a,b] -> 'apb'
  const join = p => (...s) => s.join(p)
  
  // 组合参数列表
  const joinParams = join(',')
  // 组合表达式
  const joinExpr = join('')
  // 组合表达式调用
  const joinCall = (fn,...params) => joinExpr(fn, '(', joinParams(...params), ')')
  
  // 将多维数组降低 level 个维度
  // [a] -> a
  const flat = (level = 1) => s => s.flat(level)
  
  // 将多维数组降低一个维度
  const flatOne = flat(1)
  
  // 从数组 m 中提取特定 p 的列(索引从0开始)
  // p -> m -> m[p]
  const extract = p => m => m[p]
  
  // 丢弃的值
  const DISCARD_VALUE = undefined
  // 默认的字段
  const DEFAULT_FIELD = '_message'
  
  // 字段名索引
  const FIELD_NAME_INDEX = 0
  const FIELD_TYPE_INDEX = 1
  // 提取字段名
  const extractFieldNameAndType = t => [FIELD_NAME_INDEX, FIELD_TYPE_INDEX].map(f => extract(f)).map(f => f(t))
  
  // 判断是否是空值
  const isEmpty = s => s === undefined || s === null
  
  // 最大读取条数
  const MAX_RECORD = 10000
  
  // 字段类型
  const FIELD_TYPE = {
    number: 'number',
    string: 'string',
  }
  
  // 将 start 根语法产生的中间语言 intermediate 转换成 ES 的 Query DSL
  const toESQueryDSL = (intermediate) => {
    const [fields = [], process, commands] = intermediate
  	let dsl = {
      fields: fields
      	.filter(item => !!item)
      	.filter(item => item[0] !== '*'),
      query: {
        'query_string': {
          'query': '',
          'default_field': DEFAULT_FIELD
        },
      },
      _source: []
    }
    
    if (process.evaluation) {
      const evaluation = process.evaluation
      dsl = Object.assign({},
        dsl,
        {'script_fields': {
        	[evaluation.result + '_' + FIELD_TYPE.number]: {
              script: {
                lang: "painless", // ES 语法解析器, 用解析 script 字段的表达式
                source: evaluation.script
              }
            }
        }
      })
    }
    
    if (process.statistic) {
      const MAX_SIZE = 10000
      const statistic = process.statistic
      const fields = (statistic.groupBy || [])
      const aggs = fields.concat([[statistic.alias , statistic.field, statistic.fieldType, statistic.aggr]]).reduceRight((acc, [alias, field, fieldType, fn]) => {
        const terms = Object.assign(
          { field: field.indexOf('_') === 0 ? field : (joinExpr(field, '_', fieldType)) }, 
          fn === 'count' ? { size: MAX_SIZE } : {}
        )
        const name = fn === 'count' ? 'terms' : fn
        const node = alias || joinCall(fn, field)
        
      	const aggr = {
          [node]: {
            [name]: terms
          }
        }
        
        if (acc) {
          aggr[node].aggs = acc
          terms.size = MAX_SIZE
        }
        
        return aggr
      }, null)
      
      const aggregateField = [statistic.field, statistic.aggr === 'count' ? FIELD_TYPE.string : FIELD_TYPE.number]
      const groupByFields = fields.map(([,item]) => [item, FIELD_TYPE.string])
      
      dsl.fields.push(aggregateField, ...groupByFields)
      
      dsl = Object.assign({}, dsl, {aggs: aggs})
    }
    
    dsl = commands.reduce((acc, cmd) => {
      if (!isEmpty(cmd['limit'])) {
        const limit = cmd['limit']
        if (limit > MAX_RECORD) {
          // 最大值不能超过 MAX_RECORD
          throw new Error('limit max is 10000')
        }
        
        acc.from = 0
        acc.size = limit
      }
      if (!isEmpty(cmd['sortBy'])) {
        acc.sort = cmd['sortBy'].map(([field, order]) => ({
        	[field + '_' + FIELD_TYPE.string]: { order, unmapped_type: FIELD_TYPE.string }
        }))
      }
      if (!isEmpty(cmd['fields'])) {
        acc._source = cmd['fields']
      }
      return acc
    }, dsl)
    
    /*
    return intermediate
    //*/
    return dsl //intermediate
  }
}

// 入口根语法, 全文从这里开始
start
  // 形式: 查询语句 | 处理过程 | 算子命令 => 查询结果集
  = space query:(query)
    process:(space pipe space p:(statistic / evaluation) { return p })?
    command:(space pipe space c:command { return c })* space
    { 
      return toESQueryDSL([query, process || {}, command || []])
    }
    

// 联合查询
query
  = bracketStart space m:query space bracketEnd n:((requiredSpace connector)? requiredSpace q:query { return q })? { return n ? m.concat(n) : m }
  / m:keyValueSearch n:((requiredSpace connector)? requiredSpace q:query { return q })? { return n ? [m].concat(n) : [m] }
  / m:fullTextSearch n:((requiredSpace connector)? requiredSpace q:query { return q })? { return n ? [m].concat(n) : [m] } 
  

// 算子命令
command
  = limitCommand
  / sortCommand 
  / fieldCommand
  // 在此新增算子命令


// #region 定义语法
// 全文检索
fullTextSearch
  = k:identifier { return [k, 'keyword'] }
  / k:(doubleQuote k:$((space? identifier)+ space) doubleQuote { return k }) { return [k, 'keyword'] }
  
// 字段检索
fieldSearch
  = k:'_exists_' space '=' space doubleQuote [^"]* doubleQuote {return ([k, FIELD_TYPE.string])}
  / k:identifier space '=' space doubleQuote [^"]* doubleQuote { return [k, FIELD_TYPE.string] }
  / k:identifier space '=' space wildcard { return [k, FIELD_TYPE.string] }
  
  
// 模糊检索(暂时停用)
fuzzySearch
  = f:fieldSearch d:DLSFactor { return [...f, d] }

// 范围检索
rangeSearch
  = k:identifier '=' openIntervalStart f:numeric requiredSpace 'TO' requiredSpace t:numeric openIntervalEnd { return [k, FIELD_TYPE.number, f, t]}
  / k:identifier '=' closeIntervalStart f:numeric requiredSpace 'TO' requiredSpace t:numeric closeIntervalEnd { return [k, FIELD_TYPE.number, f, t]}
  / k:identifier '=' openIntervalStart f:numeric requiredSpace 'TO' requiredSpace t:numeric closeIntervalEnd { return [k, FIELD_TYPE.number, f, t]}
  / k:identifier '=' closeIntervalStart f:numeric requiredSpace 'TO' requiredSpace t:numeric openIntervalEnd { return [k, FIELD_TYPE.number, f, t]}

// key-value 检索
keyValueSearch
  // = f:fuzzySearch { return extractFieldNameAndType(f) } // 暂时停用模糊查询
  = f:rangeSearch { return extractFieldNameAndType(f) }
  / f:fieldSearch { return extractFieldNameAndType(f) }
  
// #endregion



// region 定义词法
// 标识符, 当做字段名处理
identifier
  = $([.0-9a-zA-Z\u4e00-\uffff_@]+)
  / '*'
  
// 通配符, 当做字段值处理
wildcard
  = $([0-9a-zA-Z\u4e00-\uffff._*?@-]+)

// 0和正数(包括浮点数)
numeric
  = $([0-9]+([.][0-9]+)?)
  
// 任意个数的空格
space
  = ' '*
  
// 至少一个空格
requiredSpace
  = ' '+

singleQuote
  = "'"

doubleQuote
  = '"'

openIntervalStart
  = "{"

openIntervalEnd
  = "}"

closeIntervalStart
  = "["

closeIntervalEnd
  = "]"
  
bracketStart
  = "("
  
bracketEnd
  = ")"

// 管道符
pipe
  = "|"

// 逻辑连接符
connector
  = c:'AND'i { return toUpperCase(c) }
  / c:'OR'i { return toUpperCase(c) }
  / c:'NOT'i { return toUpperCase(c) }
  
// Damerau-Levenshtein
DLSFactor
  = '~' dls:$([0-9]*) {return dls === '' ? '2' : dls} // 默认长度为2
  
// #endregion
  
// #region 统计
statistic
  // 关键词
  = 'stats' requiredSpace 
  // 聚合函数
  aggr:aggregateFunc space 
  // ( 字段名 )
  bracketStart space field:identifier space bracketEnd space
   // 别名
  alias:('as' requiredSpace a:identifier { return a })? space
  // 分组字段
  gbf:('by' space groupField:identifier rest:(',' space r:identifier {return r} )* { return { groupBy: [groupField, ...rest]} })? 
  {
    const groupBy = gbf ? gbf.groupBy : []
    return {
      statistic: {
        aggr,
        alias,
        field,
        fieldType: aggr === 'count' ? FIELD_TYPE.string : FIELD_TYPE.number,
        groupBy: groupBy.map(item => [item, item, FIELD_TYPE.string, 'terms']) // alias, fieldName, fieldType, fn
      }
    }
  }

aggregateFunc
  = 'count' / 'min' / 'max' / 'avg' / 'sum'
// #endregion

// #region evaluation
evaluation
  = 'eval' requiredSpace f:identifier space '=' space script:evaluationFuncCall space 
  {
    return {
      evaluation: {
      	result: f,
        script
      }
    }
  }
  
evaluationFuncCall
  = fn:('min'   { return 'Math.min' })     space bracketStart space p1:expression space ',' space p2:expression bracketEnd {
      return joinCall(fn, p1, p2)
    }
  / fn:('max'   { return 'Math.max' })     space bracketStart space p1:expression space ',' space p2:expression space bracketEnd {
      return joinCall(fn, p1 ,p2)
    }
  / fn:('abs'   { return 'Math.abs' })     space bracketStart space p1:expression space bracketEnd {
      return joinCall(fn, p1)
    }
  / fn:('ceil'  { return 'Math.ceil' })    space bracketStart space p1:expression space bracketEnd {
      return joinCall(fn, p1)
    }
  / fn:('floor' { return 'Math.floor' })   space bracketStart space p1:expression space bracketEnd {
      return joinCall(fn, p1)
    }
  
expression
  = head:term tail:(space f:("+" / "-") space g:term { return [f, g] })* {
      return tail.reduce((result, elements) => joinExpr(result, ...elements), head)
    }

term
  = head:factor tail:(space f:("*" / "/") space g:factor { return [f, g]})* {
      return tail.reduce((result, elements) => joinExpr(result, ...elements), head)
    }

factor
  = s:"(" space expr:expression space e:")" { return joinExpr(s,expr,e) }
  / $("-"? numeric)
  / f:"-"? g:identifier { return joinExpr(f || '', "doc['", g, "_", FIELD_TYPE.number, "'].value") }

  
// #endregion

// #region 算子
// 排序
sortCommand
  = 'sort by' requiredSpace field:sortable rest:(',' space f:sortable { return f})* {return { sortBy: [field, ...rest]} }

sortable
  = f:identifier s:('+' { return 'asc' } /'-' { return 'desc' })? { return [f, s || 'desc'] }
// 限制返回结果的条数
limitCommand
  = 'limit' requiredSpace n:numeric { return { limit: +n } }
  
// Fields 算子
fieldCommand
  = 'fields' requiredSpace 
      closeIntervalStart space 
      groupField:identifier rest:(',' space r:identifier {return r})*
      space closeIntervalEnd { 
        return {fields: [groupField, ...rest]}
      }
// #endregion
`