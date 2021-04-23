/// <reference types="../typings" />

import { recognizeFields } from '../src'

describe('识别字段', () => {
  it('识别条件中的字段', () => {
    const fields = recognizeFields('a=b AND c OR (d=e) AND f=[2 TO 10] OR g=/abc/')
    expect(fields).toEqual<Field[]>([
      {
        fieldName: 'a',
        fieldType: 'string',
        formatName: 'a_string',
        fieldValue: 'b',
        location: 'query'
      },
      {
        fieldName: 'd',
        fieldType: 'string',
        formatName: 'd_string',
        fieldValue: 'e',
        location: 'query'
      },
      {
        fieldName: 'f',
        fieldType: 'range',
        formatName: 'f_number',
        fieldValue: '[2 TO 10]',
        location: 'query'
      },
      {
        fieldName: 'g',
        fieldType: 'regexp',
        formatName: 'g_string',
        fieldValue: 'abc',
        location: 'query'
      }
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
          location: 'statistic',
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
      const fields = recognizeFields('* | stats max(a) as b by c,d')
      expect(fields).toEqual<Field[]>([
        {
          fieldName: 'a',
          fieldType: 'number',
          formatName: 'a_number',
          location: 'statistic',
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
  })

  it('识别命令中的字段', () => {
    // TODO: 暂时没有需求
  })
})