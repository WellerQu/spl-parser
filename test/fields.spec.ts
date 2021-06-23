/// <reference types="../typings" />

import { recognizeFields, recognizeKeywords } from '../src'

describe('识别字段', () => {
  it('识别条件中的关键词', () => {
    const keywords = recognizeKeywords('a=b AND c OR (d=e OR h OR "hello world") AND f=[2 TO 10] OR g=/abc/')
    expect(keywords).toEqual<Keyword[]>([
      {
        location: 'condition',
        content: 'c'
      },
      {
        location: 'condition',
        content: 'h'
      },
      {
        location: 'condition',
        content: 'hello world'
      }
    ])
  })

  it('识别条件中的字段', () => {
    const fields = recognizeFields('a=b AND c OR (d=e) AND f=[2 TO 10] AND g_h[0]_i=123 OR g=/abc/')
    expect(fields).toEqual<Field[]>([
      {
        fieldName: 'a',
        fieldType: 'string',
        formatName: 'a_string',
        fieldValue: 'b',
        location: 'condition'
      },
      {
        fieldName: 'd',
        fieldType: 'string',
        formatName: 'd_string',
        fieldValue: 'e',
        location: 'condition'
      },
      {
        fieldName: 'f',
        fieldType: 'range',
        formatName: 'f_number',
        fieldValue: '[2 TO 10]',
        location: 'condition'
      },
      {
        fieldName: 'g_h[0]_i',
        fieldType: 'string',
        formatName: 'g_h[0]_i_string',
        fieldValue: '123',
        location: 'condition'
      },
      {
        fieldName: 'g',
        fieldType: 'regexp',
        formatName: 'g_string',
        fieldValue: 'abc',
        location: 'condition'
      },
    ])
  })

  it('识别操作中的字段', () => {
    {
      const fields = recognizeFields('* | stats count(a) as b by c,d')
      expect(fields).toEqual<Field[]>([
        {
          fieldName: 'a',
          fieldType: 'string',
          formatName: 'a_string',
          location: 'statistic aggr',
        },
        {
          fieldName: 'c',
          fieldType: 'string',
          formatName: 'c_string',
          location: 'statistic group',
        },
        {
          fieldName: 'd',
          fieldType: 'string',
          formatName: 'd_string',
          location: 'statistic group' 
        }
      ])
    }

    {
      const fields = recognizeFields('* AND Level=* | stats max(Level)')
      expect(fields).toEqual<Field[]>([
        {
          fieldName: 'Level',
          fieldType: 'string',
          fieldValue: '*',
          formatName: 'Level_string',
          location: 'condition'
        },
        {
          fieldName: 'Level',
          fieldType: 'number',
          formatName: 'Level_number',
          location: 'statistic aggr',
        }
      ])
    }
  })

  it('识别命令中的字段', () => {
    // TODO: 暂时没有需求
  })
})