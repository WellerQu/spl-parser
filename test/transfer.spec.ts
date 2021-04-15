/// <reference types="../typings" />

import { parse } from '../src/parser'
import { transfer } from '../src'

describe("全文检索", () => {
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

  it("中文", () => {
    const dsl = transfer(`中文`)
    expect(dsl.query.query_string.query).toBe(`中文`)
  })

  it("特殊符号", () => {
    const dsl = transfer(`@_?*.`)
    expect(dsl.query.query_string.query).toBe(`@_?*.`)
  })
})

describe("字段检索", () => {
  it("字段host中包含localhost的日志", () => {
    {
      const dsl = transfer(`host=localhost`)
      expect(dsl.query.query_string.query).toBe(`host="localhost"`)
    }

    {
      const dsl = transfer(`host="localhost"`)
      expect(dsl.query.query_string.query).toBe(`host="localhost"`)
    }
  })

  it("字段type中匹配词组online offline的⽇志", () => {
    const dsl = transfer(`type="online offline"`)
    expect(dsl.query.query_string.query).toBe(`type="online offline"`)
  })

  it("存在字段type的⽇志", () => {
    {
      const dsl = transfer(`_exists_=type`)
      expect(dsl.query.query_string.query).toBe(`_exists_="type"`)
    }

    {
      const dsl = transfer(`_exists_="type"`)
      expect(dsl.query.query_string.query).toBe(`_exists_="type"`)
    }
  })

  it("正则检索", () => {
    const dsl = transfer(`host=/host/`)
    expect(dsl.query.query_string.query).toBe(`host=/host/`)
  })
})

describe("OR, AND, NOT", () => {
  it("OR连接", () => {
    const dsl = transfer(`type="online offline" OR _exists_="type"`)
    expect(dsl.query.query_string.query).toBe(`type="online offline" OR _exists_="type"`)
  })

  it("AND连接", () => {
    const dsl = transfer(`type="online offline" AND _exists_="type"`)
    expect(dsl.query.query_string.query).toBe(`type="online offline" AND _exists_="type"`)
  })

  it("NOT连接", () => {
    const dsl = transfer(`type="online offline" OR NOT host="local?ost"`)
    expect(dsl.query.query_string.query).toBe(`type="online offline" OR NOT host="local?ost"`)
  })
})

describe("通配符", () => { 
  it("通配符 * 表示0个或多个字符", () => {
    const dsl = transfer(`type=*line*`)
    expect(dsl.query.query_string.query).toBe(`type="*line*"`)
  })

  it("使用通配符 ? 来代替⼀个字符", () => {
    const dsl = transfer(`host=local?ost`)
    expect(dsl.query.query_string.query).toBe(`host="local?ost"`)
  })
})

describe("数字字段⽀持范围查询", () => {
  it("⽅括号中的范围是闭区间", () => {
    const dsl = transfer(`grade=[50 TO 80]`)
    expect(dsl.query.query_string.query).toBe(`grade=[50 TO 80]`)
  })

  it("花括号中的范围是开区间", () => {
    const dsl = transfer(`grade={ 30  TO   60 }`)
    expect(dsl.query.query_string.query).toBe(`grade={30 TO 60}`)
  })

  it("⽅括号，花括号组合使⽤", () => {
    { 
      const dsl = transfer(`grade=[50 TO 80}`)
      expect(dsl.query.query_string.query).toBe(`grade=[50 TO 80}`)
    }

    { 
      const dsl = transfer(`grade={50 TO 80]`)
      expect(dsl.query.query_string.query).toBe(`grade={50 TO 80]`)
    }
  })
})

describe("高级查询", () => {
  describe("stats统计", () => {
    it("count: 统计数量", () => {
      const dsl = transfer(`* | stats count(fieldName)`)
      expect(dsl.aggs).not.toBeUndefined()
      expect(dsl.aggs).toEqual({
        "count(fieldName)": {
          "terms": {
            "field": "fieldName",
            "size": 10000
          }
        }
      })
    })

    it("min: 统计最⼩值", () => {
      parse(`* | stats min(fieldName)`)
    })

    it("max: 统计最⼤值", () => {
      parse(`* | stats max(fieldName)`)
    })

    it("avg: 统计平均值", () => {
      parse(`* | stats avg(fieldName)`)
    })

    it("sum: 统计总和", () => {
      parse(`* | stats sum(fieldName)`)
    })

    it("group by 分组，by后面可用多个字段进行分组", () => {
      parse(`* | stats count(fieldName) by fieldName`)
    })

    it("as 别名", () => {
      parse(`* | stats count(fieldName) as ce`)
    })

    it("综合", () => {
      parse(`* | stats count(fieldName) as ce by hello,world`)
    })
  })

  describe("sort根据指定字段排序，多个字段时依次级联排序，默认为降序", () => {
    it("默认排序", () => {
      parse(`* | sort by timestamp,offset`)
    })

    it("显示排序", () => {
      parse(`* | sort by timestamp+,offset-`)
    })
  })

  it("limit搜索结果中，保留前N条结果", () => {
    parse(`* | limit 10`)
  })

  it("fields对搜索结果的字段进⾏挑选", () => {
    parse(`* | fields [path,hostname]`)
  })

  describe("eval计算", () => {
    it("不含字段表达式", () => {
      parse(`* | eval newFieldName=ceil(2*(3+4))`)
      parse(`* | eval newFieldName=floor(2*(3+4))`)
      parse(`* | eval newFieldName=abs(2*(3+4))`)
      parse(`* | eval newFieldName=max(2*(3+4), 2)`)
      parse(`* | eval newFieldName=min(2*(3+4), 2)`)
    })

    it("包含字段表达式", () => {
      parse(`* | eval newFieldName=ceil(fieldName*(3+4))`)
      parse(`* | eval newFieldName=floor(fieldName*(3+4))`)
      parse(`* | eval newFieldName=abs(fieldName*(3+4))`)
      parse(`* | eval newFieldName=max(fieldName*(3+4), 2)`)
      parse(`* | eval newFieldName=min(fieldName*(3+4), 3)`)
    })
  })
})