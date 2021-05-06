/// <reference types="../typings/elasticsearch" />
/// <reference types="../typings/index" />


import { pipe } from './utils/pipe'

import { parse } from './parser'
import { typeCheck } from './typeCheck'
import { resolve, DSLRemoveAggs, DSLRemovePagination, DSLRemoveScriptField, DSLRemoveSort, DSLRemoveSource, DSLTimeRange, DSLTimeRangePlaceholder } from './transpiler'
import { getFields } from './fields'
import { getKeywords } from './keywords'

export { append } from './SPLBuilder'

export interface TransferOptions {
  /**
   * 类型映射关系, 若不提供此配置项, 则不会进行类型检查
   */
  typeMapping: Map<string, TypeInfo[]>
}

/**
 * 将用户输入的 SPL 翻译为 ElasticSearch 的 DSL
 */
export const transferFactory = (options: Partial<TransferOptions> = {}): (SPL: string) => elasticsearch.ESQuery => pipe(parse, typeCheck(options.typeMapping), resolve)

/**
 * 从用户输入的 SPL 中取得字段信息
 */
export const recognizeFields = pipe(parse, getFields)

/**
 * 从用户输入的 SPL 中取得关键词信息
 */
export const recognizeKeywords = pipe(parse, getKeywords)

export { DSLRemoveAggs, DSLRemovePagination, DSLRemoveScriptField, DSLRemoveSort, DSLRemoveSource, DSLTimeRange, DSLTimeRangePlaceholder }