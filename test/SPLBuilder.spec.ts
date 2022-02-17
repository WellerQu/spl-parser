/// <reference types="../typings/ast" />

import { append } from '../src/SPLBuilder'

describe('SPL 语句构造器', () => {
  it.each<[string, ast.ConditionLinker, string]>([
    ['', 'AND', 'abc=123'],
    ['*', 'AND', '* AND abc=123'],
    ['a=b AND b=c', 'AND', 'a=b AND b=c AND abc=123'],
    ['a=2 OR b=3', 'AND', '(a=2 OR b=3) AND abc=123'],
    ['', 'OR', 'abc=123'],
    ['*', 'OR', '* OR abc=123'],
    ['a=b AND b=c', 'OR', 'a=b AND b=c OR abc=123'],
    ['a=2 OR b=3', 'OR', '(a=2 OR b=3) OR abc=123'],
    ['a=2 OR b=3 OR a_b[0]_c=4', 'OR', '(a=2 OR b=3 OR a_b[0]_c=4) OR abc=123'],
    ['a=2 AND (b=3 OR a_b[0]_c=4)', 'OR', 'a=2 AND (b=3 OR a_b[0]_c=4) OR abc=123'],
    ['a=2 OR (b=3 OR a_b[0]_c=4)', 'OR', '(a=2 OR (b=3 OR a_b[0]_c=4)) OR abc=123'],
  ])('在仅有查询条件的情况下, 追加查询条件', (src, linker, dst) => {
    {
      const spl = append(src, {
        type: 'KeyValue',
        value: {
          fieldName: 'abc',
          fieldType: 'string',
          fieldValue: '123'
        },
        decorator: []
      }, linker)

      expect(spl).toBe(dst)
    }

    {
      const spl = append(src, {
        groups: [{
          conditions: [{
            type: 'KeyValue',
            value: {
              fieldName: 'abc',
              fieldType: 'string',
              fieldValue: '123'
            },
            decorator: []
          }]
        }]
      }, linker)

      expect(spl).toBe(dst)
    }
  })

  it.each<[string, ast.ConditionLinker, string, string]>([
    ['', 'AND', 'abc=123', 'abc=123'],
    ['', 'AND', 'abc=123 AND def=321', 'abc=123 AND def=321'],
    ['', 'OR', 'abc=123 OR def=321', '(abc=123 OR def=321)'],
    ['a=b', 'AND', 'abc=123', 'a=b AND abc=123'],
    ['a=b', 'AND', 'abc=123 OR def=321', 'a=b AND (abc=123 OR def=321)'],
    ['a=b', 'OR', 'abc=123 OR def=321', 'a=b OR (abc=123 OR def=321)'],
  ])('在仅有查询条件的情况下, 追加多个查询条件', (src, linker, condition, dst) => {
    const spl = append(src, condition, linker)
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

    expect(spl).toBe('* AND abc=123 | stats count(id) as amt by department,location')
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

    expect(spl).toBe('* AND abc=123 | eval newField=ceil(field+(-1*2)+2)')
  })

  it.each([
    ['* | fields a,b', '* AND abc=123 | fields a,b'],
    ['* | limit 10', '* AND abc=123 | limit 10'],
    ['* | sort by a,b desc,c asc', '* AND abc=123 | sort by a,b desc,c asc']
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

  it.each<[string, ast.ConditionLinker, string]>([
    ['', 'AND', 'abc="\\\\ \\\\"handsome FEer\\\\""'],
    ['*', 'AND', '* AND abc="\\\\ \\\\"handsome FEer\\\\""'],
    ['"Hello"', 'AND', '"Hello" AND abc="\\\\ \\\\"handsome FEer\\\\""'],
    ['\'Hello\'', 'AND', '"Hello" AND abc="\\\\ \\\\"handsome FEer\\\\""'],
    ['ab=1', 'AND', 'ab=1 AND abc="\\\\ \\\\"handsome FEer\\\\""'],
    ['ab=1 AND cd=2', 'AND', 'ab=1 AND cd=2 AND abc="\\\\ \\\\"handsome FEer\\\\""'],
    ['ab=1 OR cd=2', 'AND', '(ab=1 OR cd=2) AND abc="\\\\ \\\\"handsome FEer\\\\""'],
  ])('追加带有嵌套双引号的查询条件', (src, linker, dst) => {
    const spl = append(src, {
      type: 'KeyValue',
      value: {
        fieldName: 'abc',
        fieldType: 'string',
        fieldValue: '"\\\\ \\\\"handsome FEer\\\\""'
      },
      decorator: []
    }, linker)

    expect(spl).toBe(dst)
  })

  it.each<[string, ast.ConditionLinker, string]>([
    ['', 'AND', 'abc=\'\\\\ \\\\\'handsome FEer\\\\\'\''],
    ['*', 'AND', '* AND abc=\'\\\\ \\\\\'handsome FEer\\\\\'\''],
    ['"Hello"', 'AND', '"Hello" AND abc=\'\\\\ \\\\\'handsome FEer\\\\\'\''],
    ['\'Hello\'', 'AND', '"Hello" AND abc=\'\\\\ \\\\\'handsome FEer\\\\\'\''],
    ['ab=1', 'AND', 'ab=1 AND abc=\'\\\\ \\\\\'handsome FEer\\\\\'\''],
    ['ab=1 AND cd=2', 'AND', 'ab=1 AND cd=2 AND abc=\'\\\\ \\\\\'handsome FEer\\\\\'\''],
    ['ab=1 OR cd=2', 'AND', '(ab=1 OR cd=2) AND abc=\'\\\\ \\\\\'handsome FEer\\\\\'\''],
  ])('追加带有嵌套单引号的查询条件', (src, linker, dst) => {
    const spl = append(src, {
      type: 'KeyValue',
      value: {
        fieldName: 'abc',
        fieldType: 'string',
        fieldValue: '\'\\\\ \\\\\'handsome FEer\\\\\'\''
      },
      decorator: []
    }, linker)

    expect(spl).toBe(dst)
  })
})