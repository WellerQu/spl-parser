/// <reference types="../typings/ast" />

import { append } from '../src/SPLBuilder'

describe('SPL 语句构造器', () => {
  it.each([
    ['*', '(*) AND abc=123'],
    ['a=b AND b=c', '(a=b AND b=c) AND abc=123'],
    ['a=2 OR b=3', '(a=2 OR b=3) AND abc=123']
  ])('在仅有查询条件的情况下, 追加查询条件', (src, dst) => {
      const spl = append(src, {
        type: 'KeyValue',
        value: {
          fieldName: 'abc',
          fieldType: 'string',
          fieldValue: '123'
        },
        decorator: []
      })

      expect(spl).toBe(dst)
  })

  it('在存在聚合操作的情况下, 追加查询条件', () => {
    const spl = append('* | stats count(id) as amt by department,location', {
      type: 'KeyValue',
      value: {
        fieldName: 'abc',
        fieldType: 'string',
        fieldValue: '123'
      },
      decorator: []
    })

    expect(spl).toBe('(*) AND abc=123 | stats count(id) as amt by department,location')
  })

  it('在存在组合操作的情况下, 追加查询条件', () => {
    const spl = append('* | eval newField=ceil(field + -1 * 2 + 2)', {
      type: 'KeyValue',
      value: {
        fieldName: 'abc',
        fieldType: 'string',
        fieldValue: '123'
      },
      decorator: []
    })

    expect(spl).toBe('(*) AND abc=123 | eval newField=ceil(field+(-1*2)+2)')
  })

  it.each([
    ['* | fields a,b', '(*) AND abc=123 | fields a,b'],
    ['* | limit 10', '(*) AND abc=123 | limit 10'],
    ['* | sort by a,b-,c+', '(*) AND abc=123 | sort by a,b-,c+']
  ])('在存在其它指令的情况下, 追加查询条件', (src, dst) => {
    const spl = append(src, {
      type: 'KeyValue',
      value: {
        fieldName: 'abc',
        fieldType: 'string',
        fieldValue: '123'
      },
      decorator: []
    })

    expect(spl).toBe(dst)
  })
})