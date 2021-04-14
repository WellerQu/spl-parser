import { pipe } from './utils/pipe'

import { parse } from './parser'
import { transpiler } from './transpiler'

export const transfer = pipe(parse, transpiler)