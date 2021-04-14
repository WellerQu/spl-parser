/// <reference types="../typings" />

import { parse } from '../src/parser'

describe("全文检索", () => {
  it("error", () => {
    parse(`error`)
  })

  it("error exception", () => {
    parse(`error OR exception`)
  })

  it("\"error is\"", () => {
    parse(`"error is"`)
  })

  it("中文", () => {
    parse(`中文`)
  })

  it("特殊符号", () => {
    parse(`@_?*.`)
  })
})

describe("字段检索", () => {
  it("字段host中包含localhost的日志", () => {
    parse(`host=localhost`)
    parse(`host="localhost"`)
  })

  it("字段type中匹配词组online offline的⽇志", () => {
    parse(`type="online offline"`)
  })

  it("存在字段type的⽇志", () => {
    parse(`_exists_=type`)
    parse(`_exists_="type"`)
  })

  it("正则检索", () => {
    parse(`host=/host/`)
  })
})

describe("OR, AND, NOT", () => {
  it("OR连接", () => {
    parse(`type="online offline" OR _exists_="type"`)
  })

  it("AND连接", () => {
    parse(`type="online offline" AND _exists_="type"`)
  })

  it("NOT连接", () => {
    parse(`type="online offline" OR NOT host="local?ost"`)
  })
})

describe("通配符", () => { 
  it("通配符 * 表示0个或多个字符", () => {
    parse(`type=*line*`)
  })

  it("使用通配符 ? 来代替⼀个字符", () => {
    parse(`host=local?ost`)
  })
})

describe("数字字段⽀持范围查询", () => {
  it("⽅括号中的范围是闭区间", () => {
    parse(`grade=[50 TO 80]`)
  })

  it("花括号中的范围是开区间", () => {
    parse(`grade={30 TO 60}`)
  })

  it("⽅括号，花括号组合使⽤", () => {
    parse(`grade=[50 TO 80}`)
    parse(`grade={50 TO 80]`)
  })
})

describe("高级查询", () => {
  describe("stats统计", () => {
    it("count: 统计数量", () => {
      parse(`* | stats count(fieldName)`)
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
      parse(`* | stats count(fieldName) as ce by fuck,the,world`)
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