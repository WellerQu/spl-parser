import peg from 'pegjs'

import { compose } from './utils/compose'
import { reverse } from './utils/reverse'
import { grammar } from './grammar'
import { FieldValueType } from 'spl-input'

interface Sort {
  [key: string]: { order: 'asc' | 'desc', 'unmapped_type': 'long' | 'string' }
}

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

/**
 * 缓存 buffer 长度
 */
const LAST_CACHE = 1

/**
 * log事件时间字段名
 */
const EVENT_TIME = '_event_time'

/**
 * 语法解析
 */ 
const $parser = peg.generate(grammar)

/**
 * 将查询语句解释成 DSL
 * @param input 用户输入的原始查询语句
 */
export function toDSL(input: string): ESQuery {
  return $parser.parse(input.replace(/\t/g, ''))
}

/**
 * 构建 ES DSL 语句对象
 * @param query 用户输入的查询语句字符串
 * @param dsl 待加工的 DSL 语句
 */
export const DSLTransformer = (query: string, from?: number, size?: number) => (dsl: ESQuery): ESQuery => {
  const [head] = query.split('|')
  const queryStr = head
    .trim()
    .replace(/=/g, ':')
    .replace(/\t/g, '')

  dsl.query['query_string'].query = queryStr
  dsl.from = from
  dsl.size = size ?? dsl.size

  return dsl
}

/**
 * 在DSL语句中添加时间范围限制
 * @param range 时间范围
 */
export const DSLTimeRange = (range: [number, number]) => (dsl: ESQuery): ESQuery => {
  const hasRange = range[0] !== 0 && range[1] !== 0
  const start = hasRange ? (range[0] / 1000 / 60 >> 0) * 1000 * 60 : 0
  const end = hasRange ? (range[1] / 1000 / 60 >> 0) * 1000 * 60 : 0

  if (!hasRange) {
    return dsl
  }

  return DSLTimeRangePlaceholder([start.toString(), end.toString()])(dsl)
}

/**
 * 在DSL语句中添加时间范围限制的占位符, 等待被替换
 * @param placeholders 时间范围占位符
 */
export const DSLTimeRangePlaceholder = (placeholders: [string, string]) => (dsl: ESQuery): ESQuery => {
  const origin = dsl.query['query_string'].query
  dsl.query['query_string'].query = `(${origin}) AND (${EVENT_TIME}:[${placeholders[0]} TO ${placeholders[1]}})`

  return dsl
}

/**
 * 将存在于已知字段列表中的字段加上类型信息
 * @param dsl 待加工的 DSL 语句
 * @param replaceFields 已知字段列表
 */
export const DSLTypeMapping = (dsl: ESQuery): ESQuery => {
  const r = (fieldName: string, valueType: string) => 
    (str: string) => 
      str
        .replace(new RegExp(`(?<!_)${fieldName}(?=\\s*:[^:])`, 'g'), `$&_${valueType}`)
        .replace(new RegExp(`_exists_:"(${fieldName})"`), `_exists_:"$1_${valueType}"`)

  const factor = (dsl.fields ?? [])
    .filter(([, type]) => type !== FieldValueType.keyword)
    .filter(([fieldName]) => !fieldName.startsWith('_'))
    .map((field) => r(...field))
  const replace = compose(...reverse(factor))
  const origin = dsl.query['query_string'].query

  dsl.query['query_string'].query = replace ? replace(origin) : origin

  if (dsl._source && dsl._source.length > 0) {
    dsl._source = ['_message', '_event_time'].concat(dsl._source.map(item => item.startsWith('_') ? item : `${item}_string`) ?? [])
  }

  return dsl
}

/**
 * 设置排序字段
 * @param dsl 待加工的 DSL 语句
 */
export const DSLSort = (dsl: ESQuery): ESQuery => {
  if (!dsl.sort) {
    dsl.sort = []
  }

  if (dsl.sort.length === 0) {
    dsl.sort = [{ [EVENT_TIME]: { order: 'desc', 'unmapped_type': 'long' } }]
  }

  return dsl
}

/**
 * 从DSL中移除 limit 相关字段(from, size)
 * @param dsl 待加工的 DSL 语句
 */
export const DSLRemoveLimit = (dsl: ESQuery): ESQuery => {
  dsl.from = undefined
  dsl.size = undefined

  return dsl
}

/**
 * 从DSL语句中移除 _source 字段 
 * @param dsl 待加工的 DSL 语句
 */
export const DSLRemoveSource = (dsl: ESQuery): ESQuery => {
  dsl._source = undefined

  return dsl
}

/**
 * 从DSL语句中移除 fields 字段 
 * @param dsl 待加工的 DSL 语句
 */
export const DSLRemoveFields = (dsl: ESQuery): ESQuery => {
  // NOTE: 丢弃 fields 这个字段, 因为 fields 只是用来传递数据的, 并不是 ES 的标签 DSL, 传到 ES 那儿会引起 ES 报错
  dsl.fields = undefined

  return dsl
}

/**
 * 从DSL语句中移除 aggs 字段
 * @param dsl 待加工的 DSL 语句
 */
export const DSLRemoveAggs = (dsl: ESQuery): ESQuery => {
  dsl.aggs = undefined

  return dsl
}

/**
 * 从DSL语句中移除sort字段
 * @param dsl 代加工的 DSL 语句
 */
export const DSLRemoveSort = (dsl: ESQuery): ESQuery => {
  dsl.sort = undefined

  return dsl
}