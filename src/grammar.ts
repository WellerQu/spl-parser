export const grammar = `
/**
 * 解释查询语句的语法定义, 更多信息参见:
 * [PEGJS](https://pegjs.org/)
 *
 * @Author: Qiuwei
 * @since: 2020年11月17日
 */

/**
 * 生成Ast的辅助函数
 */
{
const conditionNode = (type, value, decorator) => ({ type, value, decorator })
const statsNode = (type, value) => ({ type, value })
const evalNode = (type, value) => ({ type, value })
const cmdNode = (type, value) => ({ type, value })
const fieldNode = (name, type, value) => ({ fieldName: name, fieldType: type, fieldValue: value })
}

/*
1. 语句中正确部分的SPL转译为DSL
2. 将错误输入转换为提示
4. 语句中的字段添加类型映射
5. 识别出语句中的关键词和基于操作符的数据类型 (当前版本未实现)
3. 将可能输入转换为提示
    - 符号提示
    - 字段提示
    - 字段值提示(当前版本未实现)
*/

/**
 * SPL 主要语法结构
 */
SPL = Query Operation* UniversalCommands*

/**
 * 对查询结果进行特殊操作
 */
Operation = Space* Pipe Space* operation:(Statistic) { return operation }

/**
 * 对查询结果进行通用操作
 */
UniversalCommands = Space* Pipe Space* command:(Sort/Top/Rare/Head/Tail/Limit/Fields/Table/Transaction/Evaluation) { return command }

// -------------------------------------- 查询开始 --------------------------------------
/**
 * 查询
 * 查询由多个条件组构成, 组之间以OR连接
 */
Query =
  group:ConditionGroup moreGroups:(Space+ OR Space+ next:ConditionGroup { return next })* { return { groups: [group, ...moreGroups] } }

/**
 * 条件组
 * 条件组由多个条件构成, 条件间以AND连接
 */
ConditionGroup =
  condition:Condition moreConditions:(Space+ AND Space+ next:Condition { return next })*  { return { conditions: [condition, ...moreConditions] } }

/**
 * 条件
 * 条件的形式有: 联合条件, 键值对, 关键词(全文检索)
 */
Condition = decorator:(not:NOT Space+ { return not })? node:(
  Union
  / _Exist_
  / KeyValue
  / Keyword
) { return {...node, decorator: decorator ? [...node.decorator, decorator] : node.decorator } }

/**
 * 关键词
 */
Keyword =
  singleKeyword:Identifier { return conditionNode('SingleKeyword', singleKeyword, []) }
  / Quote unionKeyword:QuoteStr? Quote { return conditionNode('UnionKeywords', unionKeyword, []) }

/**
 * 键值对
 */
KeyValue =
  fieldName:FieldName
  Space* Equal Space*
  field:(
    Quote value:QuoteStr? Quote { return fieldNode(fieldName, "string", value) }
    / Slash value:RegExpStr Slash { return fieldNode(fieldName, "regexp", value) }
    / value:RangeValue { return fieldNode(fieldName, "range", value) }
    / value:FieldValue { return fieldNode(fieldName, isNaN(value) ? "string" : "number", isNaN(value) ? value : +value) }
  ) { return conditionNode('KeyValue', field, []) }

/**
 * 数字范围描述
 */
RangeValue =
  left:(L_M_Bracket/L_L_Bracket) Space*
  value1:Num
  Space+ TO Space+
  value2:Num Space*
  right:(R_M_Bracket/R_L_Bracket) { return left + value1 + " TO " + value2 + right }

/**
 * 特殊键值对
 */
_Exist_ =
  _exists_ Space* Equal Space*
  field:(
    Quote str:QuoteStr? Quote { return fieldNode("_exists_", "string", str) }
    / str:Identifier { return fieldNode("_exists_", "string", str) }
  ) { return conditionNode('KeyValue', field, []) }

/**
 * 联合多个条件作为一个条件, 可以嵌套
 */
Union =
  L_S_Bracket Space* query:(
    subSearch:SubSearch { return conditionNode('SubSearch', subSearch, []) }
    / subQuery:Query { return conditionNode('SubQuery', subQuery, []) }
  ) Space* R_S_Bracket { return query }

/**
 * 子查询
 */
SubSearch =
  Search Space* SPL:SPL { return SPL }
// -------------------------------------- 查询结束 --------------------------------------

// -------------------------------------- 统计开始 --------------------------------------
/**
 * 统计主体
 */
Statistic =
  Stats Space+ field:StatsField moreFields:(Space* Comma Space* next:StatsField)*
  groupBy:StatsBy?
  afterFilters:StatsAfterFilter? { return statsNode("Statistic", {fields: [field, ...moreFields], groupBy, filters: afterFilters}) }

/**
 * 统计的聚合字段
 */
StatsField =
  aggr:(Count/Min/Max/Sum/Avg/DC)
  Space* L_S_Bracket Space*
  field:FieldName
  filter:StatsBeforeFilter?
  Space* R_S_Bracket
  alias:StatsAs?
  { return { aggr, ...fieldNode(field, aggr === 'count'? 'string': 'number'), alias, filter } }

/**
 * 统计聚合字段的别名
 */
StatsAs =
  Space+ As Space+
  name:FieldName { return name }

/**
 * 统计的维度字段
 */
StatsBy =
  Space+ By Space+
  field:StatsBucketSortLimit
  moreFields:(Space* Comma Space* next:StatsBucketSortLimit { return next })* { return [field, ...moreFields] }

StatsBucketSortLimit =
  field:FieldName
  sortLimits:(
    Space* L_M_Bracket Space* SortBy Space+ fn:Identifier Space* Comma Space* sn:Integer Space* R_M_Bracket { return {fn, sn} }
  )? { return{ ...fieldNode(field, 'string'), sortLimits} }

StatsBeforeFilter =
  L_M_Bracket Space* FilterF Space+ expr:MetricFuncExpr Space* R_M_Bracket { return expr }

StatsAfterFilter =
  Space* Pipe Space* FilterF Space+ expr:MetricFuncExpr moreExprs:(Space* Comma Space* next:MetricFuncExpr { return next })* { return [expr, ...moreExprs] }

MetricFuncExpr =
  field:FieldName Space* operator:(Equal/Gt/Lt) Space* value:Num { return { ...fieldNode(field, 'number', value), operator} }
// -------------------------------------- 统计结束 --------------------------------------

// -------------------------------------- 命令开始 --------------------------------------
/**
 * 排序命令
 */
Sort =
  SortBy Space+
  field:SortField
  moreFields:(Space* Comma Space* next:SortField { return next })* { return cmdNode("sort", [field, ...moreFields]) }

SortField =
  field:StringField
  order:(Minus { return "desc" } /Plus { return "asc" } )? { return order ? { ...field, order } : field }

/**
 * 限制返回数据条数命令
 */
Limit =
  LimitN Space+ n:Integer { return cmdNode("limit", n) }

Head =
  HeadN Space+ n:Integer { return cmdNode("head", n) }

Tail =
  TailN Space+ n:Integer { return cmdNode("tail", n) }

Top =
  TopNF Space+ n:Integer Space+ field:StringField { return cmdNode("top", { count: n, ...field }) }

Rare =
  RareNF Space+ n:Integer Space+ field:StringField { return cmdNode("rare", { count: n, ...field }) }

/**
 * 限制返回数据字段命令
 */
Fields =
  FieldsF Space+ field:StringField moreFields:(Space* Comma Space* next:StringField { return next })* { return cmdNode("fields", [field, ...moreFields]) }

Table =
  TableF Space+ field:StringField moreFields:(Space* Comma Space* next:StringField { return next })* { return cmdNode("table", [field, ...moreFields]) }

/**
 * 配置事务
 * maxopentxn 最大事务数量
 * maxopenevents 最大事务日志条数
 */
Transaction =
  TransactionF Space+
  field:StringField
  options:(
    maxopentxn:(Space+ "maxopentxn" Space* Equal Space* value:Integer { return value })
    maxopenevents:(Space+ "maxopenevents" Space* Equal Space* value:Integer { return value })? { return { maxopentxn, maxopenevents } }
    /
    maxopenevents:(Space+ "maxopenevents" Space* Equal Space* value:Integer { return value })
    maxopentxn:(Space+ "maxopentxn" Space* Equal Space* value:Integer { return value })? { return { maxopentxn, maxopenevents } }
  )? { return cmdNode("transaction", {...field, options}) }

/**
 * 计算
 */
Evaluation =
  Eval Space+ newFieldName:FieldName Space* Equal Space* base:(Unary/Binary) { return evalNode("eval", {newFieldName, ...base}) }

/**
 * 一元操作
 */
Unary =
  fn:(Ceil/Floor/Abs) Space* L_S_Bracket Space* n1:Expr Space* R_S_Bracket { return { fn, params: {n1}} }

/**
 * 二元操作
 */
Binary =
  fn:(Max/Min) Space* L_S_Bracket Space* n1:Expr Space* Comma Space* n2:Expr Space* R_S_Bracket { return { fn, params: {n1, n2}} }

/**
 * 四则运算
 */
 Expr =
 lTerm:Term expr:(Space* operator:PlusOrMinus Space* rTerm:Term { return [operator, rTerm]})* {
 return  expr.length ? [lTerm].concat(...expr) : lTerm
}

Term =
 lFactor:Factor expr:(MultiplyOrDivide Factor)* {
 return  expr.length ? [lFactor].concat(...expr) : lFactor
}

Factor = L_S_Bracket Space* Expr:(Expr) Space* R_S_Bracket { return Expr } 
/ Space* num:Num Space* { return evalNode('number', num)}
/ Space* name:FieldName Space* { return evalNode('field', fieldNode(name, 'number'))}

MultiplyOrDivide = operator: (Times/Slash) { return evalNode('operator', operator)}

PlusOrMinus = operator: (Plus/Minus) { return evalNode('operator', operator) }

// -------------------------------------- 命令结束 --------------------------------------

// -------------------------------------- 字段开始 --------------------------------------
StringField =
  field:FieldName { return fieldNode(field, 'string') }
// -------------------------------------- 字段结束 --------------------------------------

/**
 * 词法
 */
_exists_ "_exists_" = "_exists_"
Space "space" = [ \r\n\t]
AND "and" = "AND"
OR "or" = "OR"
NOT "not" = "NOT"
TO "to" = "TO"
Search "search" = "search"
Count "count" = "count"
Min "min" = "min"
Max "max" = "max"
Avg "avg" = "avg"
Sum "sum" = "sum"
DC "distinct_count" = "dc"
Ceil "ceil" = "ceil"
Floor "floor" = "floor"
Abs "abs" = "abs"
Eval "evaluation" = "eval"
LimitN "limit" = "limit"
HeadN "head" = "head"
TailN "tail" = "tail"
TopNF "top" = "top"
RareNF "rare" = "rare"
FilterF "filter" = "filter"
FieldsF "fields" = "fields"
TableF "table" = "table"
TransactionF "transaction" = "transaction"
SortBy "sort_by" = "sort by"
By "group_by" = "by"
As "alias" = "as"
Stats "stats" = "stats"
Pipe "pipe" = "|"
Quote "quote" = '"'
QuoteStr "quote_string" = $([^"]+)
Slash "slash" = "/"
Comma "comma" = ","
RegExpStr "regexp" = $([^/]+)
L_L_Bracket "L_L_Bracket" = "{"
R_L_Bracket "R_L_Bracket" = "}"
L_M_Bracket "L_M_Bracket" = "["
R_M_Bracket "R_M_Bracket" = "]"
L_S_Bracket "L_S_Bracket" = "("
R_S_Bracket "R_S_Bracket" = ")"
Equal "Equal" = "="
Gt "greater_than" = ">"
Lt "less_than" = "<"
Plus "plus" = "+"
Minus "minus" = "-"
Times "times" = "*"
Num "number" = $(minus:Minus? Space* n:$(Integer ("." Integer)?) { return minus? -n : n})
Integer "integer" = $([0-9]+)
FieldName "fieldName" = $([a-zA-Z@]+[a-zA-Z0-9]*)
FieldValue "fieldValue" = $([^ )]+)
Identifier "identifier" = $([.0-9a-zA-Z\u4e00-\uffff_@?*]+)

`