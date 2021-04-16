import { pipe } from './utils/pipe'

import { parse } from './parser'
import { transpiler, DSLRemoveAggs, DSLRemovePagination, DSLRemoveScriptField, DSLRemoveSort, DSLRemoveSource } from './transpiler'

export const transfer = pipe(parse, transpiler)

export { DSLRemoveAggs, DSLRemovePagination, DSLRemoveScriptField, DSLRemoveSort, DSLRemoveSource }