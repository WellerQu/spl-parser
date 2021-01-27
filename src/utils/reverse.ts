/**
 * 创建一个原数组中元素倒序排列的新数组, 
 * 与 lodash 的 reverse函数不同, lodash 的 reverse 会改变元素组
 */
export function reverse<T>(arr: T[]): T[] {
  return arr.map((_, index, arr) => arr[arr.length - index - 1])
}
