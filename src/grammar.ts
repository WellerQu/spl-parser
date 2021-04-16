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
const kvNode = (type, value) => ({ type, value })
const cmdNode = (type, value) => ({ type, value })
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
  / Quote unionKeyword:QuoteStr Quote { return conditionNode('UnionKeywords', unionKeyword, []) }

/**
 * 键值对
 */
KeyValue =
  fieldName:FieldName
  Space* Equal Space*
  fieldValue:(
    Quote value:QuoteStr Quote { return kvNode("string", value) }
    / Slash value:RegExpStr Slash { return kvNode("regexp", value) }
    / value:RangeValue { return kvNode("range", value) }
    / value:Identifier { return kvNode("string", value) }
  ) { return conditionNode('KeyValue', { fieldName, fieldValue }, []) }

/**
 * 数字范围描述
 */
RangeValue =
  left:(L_M_Bracket/L_L_Bracket) Space*
  value1:(minus:Minus? Space* n:Num { return minus? -n : n} )
  Space+ TO Space+
  value2:(minus:Minus? Space* n:Num { return minus? -n : n} ) Space*
  right:(R_M_Bracket/R_L_Bracket) { return left + value1 + " TO " + value2 + right }

/**
 * 特殊键值对
 */
_Exist_ =
  _exists_ Space* Equal Space*
  value:(
    Quote str:QuoteStr Quote { return kvNode("string", str) }
    / str:Identifier { return kvNode("string", str) }
  ) { return conditionNode('KeyValue', { fieldName: "_exists_", fieldValue:value }, []) }

/**
 * 联合多个条件作为一个条件, 可以嵌套
 */
Union = L_S_Bracket Space* SPL:SPL Space* R_S_Bracket { return conditionNode('Union', SPL, []) }
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
  { return { aggr, fieldName: field, alias, filter } }

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
  )? { return {fieldName: field, sortLimits} }

StatsBeforeFilter =
  L_M_Bracket Space* FilterF Space+ name:FieldName Space* Equal Space* value:Identifier Space* R_M_Bracket { return {fieldName: name, fieldValue:value} }

StatsAfterFilter =
  Space* Pipe Space* FilterF Space+ item:MetricFuncExpr moreItems:(Space* Comma Space* next:MetricFuncExpr { return next })* { return [item, ...moreItems] }

MetricFuncExpr =
  $(FieldName Space* (Equal/Gt/Lt) Space* Num)
// -------------------------------------- 统计结束 --------------------------------------

// -------------------------------------- 命令开始 --------------------------------------
/**
 * 排序命令
 */
Sort =
  SortBy Space+
  name:SortField
  moreNames:(Space* Comma Space* next:SortField { return next })* { return cmdNode("sort", [name, ...moreNames]) }

SortField =
  name:FieldName
  order:(Minus { return "desc" } /Plus { return "asc" } )? { return order ? { fieldName: name, order } : { fieldName: name } }

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
  TopNF Space+ n:Integer Space+ field:FieldName { return cmdNode("top", [n, field]) }

Rare =
  RareNF Space+ n:Integer Space+ field:FieldName { return cmdNode("rare", [n, field]) }

/**
 * 限制返回数据字段命令
 */
Fields =
  FieldsF Space* L_M_Bracket Space* name:FieldName moreNames:(Space* Comma Space* next:FieldName { return next })* Space* R_M_Bracket { return cmdNode("fields", [name, ...moreNames]) }

Table =
  TableF Space+ name:FieldName moreNames:(Space* Comma Space* next:FieldName { return next })* { return cmdNode("table", [name, ...moreNames]) }

/**
 * 配置事务
 * maxopentxn 最大事务数量
 * maxopenevents 最大事务日志条数
 */
Transaction =
  TransactionF Space+
  name:FieldName
  options:(
    maxopentxn:(Space+ "maxopentxn" Space* Equal Space* value:Integer { return value })
    maxopenevents:(Space+ "maxopenevents" Space* Equal Space* value:Integer { return value })? { return { maxopentxn, maxopenevents } }
    /
    maxopenevents:(Space+ "maxopenevents" Space* Equal Space* value:Integer { return value })
    maxopentxn:(Space+ "maxopentxn" Space* Equal Space* value:Integer { return value })? { return { maxopentxn, maxopenevents } }
  )? { return cmdNode("transaction", {name, options}) }

/**
 * 计算
 */
Evaluation =
  Eval Space+ newName:FieldName Space* Equal Space* base:(Unary/Binary) { return evalNode("eval", {...base}) }

/**
 * 一元操作
 */
Unary =
  fn:(Ceil/Floor/Abs) Space* L_S_Bracket param:$(Expr) R_S_Bracket { return { fn, params: [param]} }

/**
 * 二元操作
 */
Binary =
  fn:(Max/Min) Space* L_S_Bracket Space* param1:$(Expr) Space* Comma Space* param2:$(Expr) Space* R_S_Bracket { return { fn, params: [param1, param2]} }

/**
 * 四则运算
 */
Expr =
  Term (Space* (Plus/Minus) Space* Term)*
Term =
  Factor (Space* (Times/Slash) Space* Factor)*
Factor =
  L_S_Bracket Space* Expr Space* R_S_Bracket
  / Num
  / FieldName
// -------------------------------------- 命令结束 --------------------------------------

/**
 * 词法
 */
_exists_ = "_exists_"
Space "Space" = [ \r\n\t]
AND = "AND"
OR = "OR"
NOT = "NOT"
TO = "TO"
Count = "count"
Min = "min"
Max = "max"
Avg = "avg"
Sum = "sum"
DC = "dc"
Ceil = "ceil"
Floor = "floor"
Abs = "abs"
Eval = "eval"
LimitN = "limit"
HeadN = "head"
TailN = "tail"
TopNF = "top"
RareNF = "rare"
FilterF = "filter"
FieldsF = "fields"
TableF = "table"
TransactionF = "transaction"
SortBy = "sort by"
By = "by"
As = "as"
Stats = "stats"
Pipe = "|"
Quote "双引号" = '"'
QuoteStr = $([^"]*)
Slash = "/"
Comma = ","
RegExpStr = $([^/]+)
L_L_Bracket = "{"
R_L_Bracket = "}"
L_M_Bracket = "["
R_M_Bracket = "]"
L_S_Bracket = "("
R_S_Bracket = ")"
Equal = "="
Gt = ">"
Lt = "<"
Plus = "+"
Minus = "-"
Times = "*"
Num = $(Integer ("." Integer)?)
Integer = $([0-9]+)
FieldName "字段名称" = $([a-zA-Z@]+[a-zA-Z0-9]*)
Identifier "通用标识符" = $([.0-9a-zA-Z\u4e00-\uffff_@?*]+)

`