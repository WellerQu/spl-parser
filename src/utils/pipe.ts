/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */

type Func<T extends any[], P> = (...a: T) => P

export function pipe(): <P>(a: P) => P

export function pipe<F extends Function>(f: F): F

/* two functions */
export function pipe<A, T extends any[], P>(
  f1: Func<T, A>,
  f2: (a: A) => P,
): Func<T, P>

/* three functions */
export function pipe<A, B, T extends any[], P>(
  f1: Func<T, A>,
  f2: (a: A) => B,
  f3: (b: B) => P,
): Func<T, P>

/* four functions */
export function pipe<A, B, C, T extends any[], P>(
  f1: Func<T, A>,
  f2: (a: A) => B,
  f3: (b: B) => C,
  f4: (c: C) => P,
): Func<T, P>

/* five functions */
export function pipe<A, B, C, D, T extends any[], P>(
  f1: Func<T, A>,
  f2: (a: A) => B,
  f3: (b: B) => C,
  f4: (c: C) => D,
  f5: (d: D) => P,
): Func<T, P>

/* six functions */
export function pipe<A, B, C, D, E, T extends any[], P>(
  f1: Func<T, A>,
  f2: (a: A) => B,
  f3: (b: B) => C,
  f4: (c: C) => D,
  f5: (d: D) => E,
  f6: (e: E) => P,
): Func<T, P>

/* seven functions */
export function pipe<A, B, C, D, E, F, T extends any[], P>(
  f1: Func<T, A>,
  f2: (a: A) => B,
  f3: (b: B) => C,
  f4: (c: C) => D,
  f5: (d: D) => E,
  f6: (e: E) => F,
  f7: (f: F) => P,
): Func<T, P>

/* eight functions */
export function pipe<A, B, C, D, E, F, G, T extends any[], P>(
  f1: Func<T, A>,
  f2: (a: A) => B,
  f3: (b: B) => C,
  f4: (c: C) => D,
  f5: (d: D) => E,
  f6: (e: E) => F,
  f7: (f: F) => G,
  f8: (f: G) => P,
): Func<T, P>

export function pipe<P>(...funcs: Function[]): (...args: any[]) => P

export function pipe(...funcs: Function[]) {
  if (funcs.length === 0) {
    // infer the argument type so it is usable in inference down the line
    return <T>(arg: T) => arg
  }

  if (funcs.length === 1) {
    return funcs[0]
  }

  return funcs.reduce((a, b) => (...args: any) => b(a(...args)))
}