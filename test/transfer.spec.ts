/// <reference types="../typings" />
/// <reference types="../typings/ast" />
/// <reference types="../typings/elasticsearch" />

import { parse } from '../src/parser'
import { transferFactory } from '../src'

describe("全文检索", () => {
  const transfer = transferFactory()

  it("error", () => {
    const dsl = transfer(`error`)
    expect(dsl.query.query_string.query).toBe("error")
  })

  it("error exception", () => {
    const dsl = transfer(`error OR  exception`)
    expect(dsl.query.query_string.query).toBe("error OR exception")
  })

  it("\"error is\"", () => {
    const dsl = transfer(`"error is"`)
    expect(dsl.query.query_string.query).toBe(`"error is"`)
  })

  it("空词组\"\"", () => {
    const dsl = transfer(`""`)
    expect(dsl.query.query_string.query).toBe(`""`)
  })

  it("中文", () => {
    const dsl = transfer(`中文`)
    expect(dsl.query.query_string.query).toBe(`中文`)
  })

  it("特殊符号", () => {
    const dsl = transfer(`@_?*.`)
    expect(dsl.query.query_string.query).toBe(`@_?*.`)
    expect(dsl.query.query_string.default_field).toBe("_message")
  })
})

describe("字段检索", () => {
  const transfer = transferFactory({
    typeMapping: new Map<string, TypeInfo[]>([
      ["host", ["string", "regexp"]],
      ["type", ["string"]],
      ["_exists_", []]
    ])
  })

  it("字段host中包含localhost的日志", () => {
    {
      const dsl = transfer(`host=localhost`)
      expect(dsl.query.query_string.query).toBe(`host_string:"localhost"`)
    }

    {
      const dsl = transfer(`host="localhost"`)
      expect(dsl.query.query_string.query).toBe(`host_string:"localhost"`)
    }
  })

  it("字段type中匹配词组online offline的⽇志", () => {
    const dsl = transfer(`type="online offline"`)
    expect(dsl.query.query_string.query).toBe(`type_string:"online offline"`)
  })

  it("存在字段type的⽇志", () => {
    {
      const dsl = transfer(`_exists_=type`)
      expect(dsl.query.query_string.query).toBe(`_exists_:"type"`)
    }

    {
      const dsl = transfer(`_exists_="type"`)
      expect(dsl.query.query_string.query).toBe(`_exists_:"type"`)
    }
  })

  it("host 字段正则检索", () => {
    const dsl = transfer(`host=/host/`)
    expect(dsl.query.query_string.query).toBe(`host_string:/host/`)
  })

  it("type 字段不支持正则检索", () => {
    expect(() => {
      transfer(`type=/int/`)
    }).toThrow('字段 "type" 的类型 "[string]" 不支持此操作')

  })

  it("空字段值", () => {
    const dsl = transfer(`type=""`)
    expect(dsl.query.query_string.query).toBe(`type_string:""`)
  })

  it('查询非空字段', () => {
    const dsl = transfer(`NOT type=""`)
    expect(dsl.query.query_string.query).toBe(`NOT type_string:""`)
  })

  it("nonExists 字段不存在", () => {
    expect(() => {
      transfer(`nonExists=2`)
    }).toThrow('字段 "nonExists" 不存在')
  })

  it('_exists_=空字段名称', () => {
    const dsl = transfer(`_exists_=""`)
    expect(dsl.query.query_string.query).toBe(`_exists_:""`)
  })
})

describe("OR, AND, NOT", () => {
  const transfer = transferFactory()

  it("OR连接", () => {
    const dsl = transfer(`type="online offline" OR _exists_="type"`)
    expect(dsl.query.query_string.query).toBe(`type_string:"online offline" OR _exists_:"type"`)
  })

  it("AND连接", () => {
    const dsl = transfer(`type="online offline" AND _exists_="type"`)
    expect(dsl.query.query_string.query).toBe(`type_string:"online offline" AND _exists_:"type"`)
  })

  it("NOT连接", () => {
    const dsl = transfer(`type="online offline" OR NOT host="local?ost"`)
    expect(dsl.query.query_string.query).toBe(`type_string:"online offline" OR NOT host_string:"local?ost"`)
  })

  it("联合条件", () => {
    const dsl = transfer(`type=abc AND (host=local? OR host=*host) AND NOT type=cde`)
    expect(dsl.query.query_string.query).toBe(`type_string:"abc" AND (host_string:"local?" OR host_string:"*host") AND NOT type_string:"cde"`)
  })

  it("子查询", () => {
    expect(() => {
      transfer(`type=abc AND (search host=123)`)
    }).toThrowError('尚未支持的查询条件 SubSearch')
  })
})

describe("通配符", () => {
  const transfer = transferFactory()
  it("通配符 * 表示0个或多个字符", () => {
    const dsl = transfer(`type=*line*`)
    expect(dsl.query.query_string.query).toBe(`type_string:"*line*"`)
  })

  it("使用通配符 ? 来代替⼀个字符", () => {
    const dsl = transfer(`host=local?ost`)
    expect(dsl.query.query_string.query).toBe(`host_string:"local?ost"`)
  })
})

describe("数字字段⽀持范围查询", () => {
  const transfer = transferFactory({
    typeMapping: new Map<string, TypeInfo[]>([
      ["grade", ["range", "number"]]
    ])
  })

  it("⽅括号中的范围是闭区间", () => {
    const dsl = transfer(`grade=[50 TO 80]`)
    expect(dsl.query.query_string.query).toBe(`grade_number:[50 TO 80]`)
  })

  it("花括号中的范围是开区间", () => {
    const dsl = transfer(`grade={ 30  TO   60 }`)
    expect(dsl.query.query_string.query).toBe(`grade_number:{30 TO 60}`)
  })

  it("⽅括号，花括号组合使⽤", () => {
    {
      const dsl = transfer(`grade=[50 TO 80}`)
      expect(dsl.query.query_string.query).toBe(`grade_number:[50 TO 80}`)
    }

    {
      const dsl = transfer(`grade={50 TO 80]`)
      expect(dsl.query.query_string.query).toBe(`grade_number:{50 TO 80]`)
    }
  })

  it("负数支持", () => {
    const dsl = transfer(`grade=[-2 TO -4]`)
    expect(dsl.query.query_string.query).toBe(`grade_number:[-2 TO -4]`)
  })
})

describe("高级查询", () => {
  const transfer = transferFactory({
    typeMapping: new Map<string, TypeInfo[]>([
      ["fieldName", ["string", "number"]],
      ["groupFieldName", ["string"]],
      ["group1", ["string"]],
      ["group2", ["string"]],
      ["path", ["string"]],
      ["hostname", ["string"]],
      ["timestamp", ["string"]],
      ["offset", ["string"]]
    ])
  })

  describe("stats统计", () => {
    it("count: 统计数量", () => {
      const dsl = transfer(`* | stats count(fieldName)`)
      expect(dsl.aggs).toEqual({
        "count(fieldName)": {
          "terms": {
            "field": "fieldName_string",
            "size": 10000
          }
        }
      })
    })

    it("min: 统计最⼩值", () => {
      const dsl = transfer(`* | stats min(fieldName)`)
      expect(dsl.aggs).toEqual({
        "min(fieldName)": {
          "min": {
            "field": "fieldName_number"
          }
        }
      })
    })

    it("max: 统计最⼤值", () => {
      const dsl = transfer(`* | stats max(fieldName)`)
      expect(dsl.aggs).toEqual({
        "max(fieldName)": {
          "max": {
            "field": "fieldName_number"
          }
        }
      })
    })

    it("avg: 统计平均值", () => {
      const dsl = transfer(`* | stats avg(fieldName)`)
      expect(dsl.aggs).toEqual({
        "avg(fieldName)": {
          "avg": {
            "field": "fieldName_number"
          }
        }
      })
    })

    it("sum: 统计总和", () => {
      const dsl = transfer(`* | stats sum(fieldName)`)
      expect(dsl.aggs).toEqual({
        "sum(fieldName)": {
          "sum": {
            "field": "fieldName_number"
          }
        }
      })
    })

    it("group by 分组，by后面可用多个字段进行分组", () => {
      {
        const dsl = transfer(`* | stats count(fieldName) by groupFieldName`)
        expect(dsl.aggs).toEqual({
          "groupFieldName": {
            "terms": {
              "field": "groupFieldName_string",
              "size": 10000
            },
            "aggs": {
              "count(fieldName)": {
                "terms": {
                  "field": "fieldName_string",
                  "size": 10000
                }
              }
            }
          }
        })
      }

      {
        const dsl = transfer(`* | stats count(fieldName) by group1, group2`)
        expect(dsl.aggs).toEqual({
          "group1": {
            "terms": {
              "field": "group1_string",
              "size": 10000
            },
            "aggs": {
              "group2": {
                "terms": {
                  "field": "group2_string",
                  "size": 10000
                },
                "aggs": {
                  "count(fieldName)": {
                    "terms": {
                      "field": "fieldName_string",
                      "size": 10000
                    }
                  }
                }
              }
            }
          }
        })
      }
    })

    it("as 别名", () => {
      const dsl = transfer(`* | stats count(fieldName) as ce`)
      expect(dsl.aggs).toEqual({
        "ce": {
          "terms": {
            "field": "fieldName_string",
            "size": 10000
          }
        }
      })
    })

    it("综合", () => {
      const dsl = transfer(`* | stats count(fieldName) as ce by group1, group2`)
      expect(dsl.aggs).toEqual({
        "group1": {
          "terms": {
            "field": "group1_string",
            "size": 10000
          },
          "aggs": {
            "group2": {
              "terms": {
                "field": "group2_string",
                "size": 10000
              },
              "aggs": {
                "ce": {
                  "terms": {
                    "field": "fieldName_string",
                    "size": 10000
                  }
                }
              }
            }
          }
        }
      })
    })
  })

  describe("sort根据指定字段排序，多个字段时依次级联排序，默认为降序", () => {
    it("默认字段", () => {
      const dsl = transfer(`*`)
      expect(dsl.sort).toEqual([
        {
          "_event_time": {
            order: "desc",
            'unmapped_type': 'long'
          }
        }
      ])
    })

    it("默认规则", () => {
      const dsl = transfer(`* | sort by timestamp,offset`)
      expect(dsl.sort).toEqual([
        {
          "timestamp": {
            "order": "desc",
            "unmapped_type": "string"
          }
        },
        {
          "offset": {
            "order": "desc",
            "unmapped_type": "string"
          }
        }
      ])
    })

    it("显示规则", () => {
      const dsl = transfer(`* | sort by timestamp+,offset-`)
      expect(dsl.sort).toEqual([{
        "timestamp": {
          "order": "asc",
          "unmapped_type": "string"
        }
      },
      {
        "offset": {
          "order": "desc",
          "unmapped_type": "string"
        }
      }])
    })
  })

  describe("limit 限制结果返回条数", () => {
    it("limit搜索结果中, 默认保留N条", () => {
      const dsl = transfer(`*`)
      expect(dsl.size).toBe(10)
    })

    it("limit搜索结果中，保留前N条结果", () => {
      const dsl = transfer(`* | limit 20`)
      expect(dsl.size).toBe(20)
    })

    it("limit搜索结果中, 最大不能超过M条", () => {
      const dsl = transfer(`* | limit 10001`)
      expect(dsl.size).toBe(10000)
    })
  })

  describe("fields 限制结果返回字段", () => {
    it("fields对收缩结果的字段默认无影响", () => {
      const dsl = transfer(`*`)
      expect(dsl._source).toEqual([])
    })

    it("fields对搜索结果的字段进⾏挑选", () => {
      const dsl = transfer(`* | fields path,hostname`)
      expect(dsl._source).toEqual(["_message", "_event_time", "path", "hostname"])
    })
  })

  describe("table 限制结果返回字段", () => {
    it("命令尚未支持类型检查", () => {
      expect(() => {
        transfer(`* | table a`)
      }).toThrow('未支持检查的命令: table')
    })
  })

  describe("eval计算", () => {

    it('不含字段表达式', () => {
      const dslCeil = transfer(`* | eval newFieldName=ceil(2*(3+4))`)
      expect(dslCeil.script_fields).toEqual({
        newFieldName: {
          script: {
            "lang": "painless",
            "source": "Math.ceil(2*(3+4))"
          }
        }
      })

      const dslFloor = transfer(`* | eval newFieldName=floor(2*(3+4))`)
      expect(dslFloor.script_fields).toEqual({
        newFieldName: {
          script: {
            "lang": "painless",
            "source": "Math.floor(2*(3+4))"
          }
        }
      })

      const dslAbs = transfer(`* | eval newFieldName=abs(2*(3+4))`)
      expect(dslAbs.script_fields).toEqual({
        newFieldName: {
          script: {
            "lang": "painless",
            "source": "Math.abs(2*(3+4))"
          }
        }
      })
    })

    it("包含字段表达式", () => {

      const dslCeil = transfer(`* | eval newFieldName=ceil(fieldName*(3+4))`)
      expect(dslCeil.script_fields).toEqual({
        newFieldName: {
          script: {
            "lang": "painless",
            "source": "Math.ceil(doc['fieldName_number'].value*(3+4))"
          }
        }
      })

      const dslFloor = transfer(`* | eval newFieldName=floor(fieldName*(3+4))`)
      expect(dslFloor.script_fields).toEqual({
        newFieldName: {
          script: {
            "lang": "painless",
            "source": "Math.floor(doc['fieldName_number'].value*(3+4))"
          }
        }
      })

      const dslAbs = transfer(`* | eval newFieldName=abs(fieldName*(3+4))`)
      expect(dslAbs.script_fields).toEqual({
        newFieldName: {
          script: {
            "lang": "painless",
            "source": "Math.abs(doc['fieldName_number'].value*(3+4))"
          }
        }
      })

      const dslMax = transfer(`* | eval newFieldName=max(fieldName*(3+4), 2)`)
      expect(dslMax.script_fields).toEqual({
        newFieldName: {
          script: {
            "lang": "painless",
            "source": "Math.max(doc['fieldName_number'].value*(3+4), 2)"
          }
        }
      })

      const dslMin = transfer(`* | eval newFieldName=min(fieldName*(3+4), 2)`)
      expect(dslMin.script_fields).toEqual({
        newFieldName: {
          script: {
            "lang": "painless",
            "source": "Math.min(doc['fieldName_number'].value*(3+4), 2)"
          }
        }
      })

      const dslBinaryMin = transfer(`* | eval newFieldName=min(fieldName*(3+4), fieldName2)`)
      expect(dslBinaryMin.script_fields).toEqual({
        newFieldName: {
          script: {
            "lang": "painless",
            "source": "Math.min(doc['fieldName_number'].value*(3+4), doc['fieldName2_number'].value)"
          }
        }
      })

      const dslBinaryMax = transfer(`* | eval newFieldName=max(fieldName*(3+4), fieldName2*(1+2))`)
      expect(dslBinaryMax.script_fields).toEqual({
        newFieldName: {
          script: {
            "lang": "painless",
            "source": "Math.max(doc['fieldName_number'].value*(3+4), doc['fieldName2_number'].value*(1+2))"
          }
        }
      })
    })
  })
})