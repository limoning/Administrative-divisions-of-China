const _ = require('lodash')

const { Province, City, Area, Street, Village } = require('./sqlite')

const cField = ['code', 'name']
const fField = cField.concat('children')

/**
 * 获取省市区镇四级联动数据
 * @author   https://github.com/modood
 * @datetime 2018-02-02 09:51
 */
exports.getAddressPCAS = async () => {
  const res = await Province.findAll({
    include: [{ model: City,
      include: [{ model: Area,
        include: [{ model: Street,
          include: [{ model: Village }] }] }] }] })

  const count = res.length
  let index = 0
  // 地址json数据

  // 来源：国家统计局      http://www.stats.gov.cn
  //            统计数据/统计标准/统计用区划和城乡划分代码/2019年
  //            http://www.stats.gov.cn/tjsj/tjbz/tjyqhdmhcxhfdm/2019/index.html
  // 特殊处理：
  // 1.  处理 [ 北京市(11), 上海市(31), 天津市(12), 重庆市(50) ] 直辖区/县 数据, 使用上级名称
  // - 例：北京市^北京市
  // 2. 处理 [ 省直辖县级行政区划, 自治区直辖县级行政区划 ] 下级数据上浮一级 即遇到则将第三级作为第二级 第四级作为第三级 第五级作为第四级
  // - 涉及区域:  [ 湖北省^省直辖县级行政区划(4290), 河南省^省直辖县级行政区划(4190), 海南省^省直辖县级行政区划(4690), 新疆维吾尔自治区^自治区直辖县级行政区划(6590) ]
  // - 例： 湖北省^省直辖县级行政区划^仙桃市^沙嘴街道 处理为：湖北省^仙桃市^沙嘴街道^沙嘴居委会
  // 3. 处理 [ 广东省中山市(4420), 广东省东莞市(4419), 海南省儋州市(4604) ] 无3级区划
  // - 例： 广东省^东莞市^东城街道
  // - 特殊处理： 旧数据回填时转换为数组去除空字符串数据后回填 如 广东省^东莞市^^东城街道 需处理成 广东省^东莞市^东城街道 才能正确回填
  // 4. 处理 甘肃省^嘉峪关市(6202)第三级地址为市辖区且有4级区划特殊情况 （京东另加入了自定义数据「国家统计局官网无数据」 [ 长城区: [ 城区, 新城镇 ], 镜铁区: [ 城区,  文殊镇 ], 雄关区: [ 城区, 峪泉镇 ] ] ）
  // - 例：甘肃省^嘉峪关市^市辖区 =》 肃省^嘉峪关市^嘉峪关市
  // 5. 处理 第三级地址为市辖区且无4级区划特殊情况 去除市辖区 同京东
  // - 例： 广东省^深圳市^市辖区
  // 6.  处理 福建省泉州市金门县（350527） 其无4级地址 手动添加4级 福建省泉州市金门县金门县
  // 7. 为减小文件大小 数据处理为数组形式 从原先 2.1 M 大小降低为 889 KB
  // - 格式：[[区域,子集],[区域,[[区域,子集]]]]   子集为数字 无子集的数据则只有一个数据
  // - 例子：
  // -  [["北京市",[["北京市",[["东城区",[["东华门街道"],["景山街道"],["交道口街道"],["安定门街道"]]]]]]],["广东省",[["深圳市",[["罗湖区",[["桂园街道"],["黄贝街道"],["东门街道"],["翠竹街道"],["南湖街道"],["笋岗街道"],["东湖街道"],["莲塘街道"],["东晓街道"],["清水河街道"]]],["福田区",[["南园街道"],["园岭街道"],["福田街道"],["沙头街道"],["香蜜湖街道"],["梅林街道"],["莲花街道"],["华富街道"],["福保街道"],["华强北街道"],["福田保税区"]]],["南山区",[["南头街道"],["南山街道"],["沙河街道"],["蛇口街道"],["招商街道"],["粤海街道"],["桃源街道"],["西丽街道"],["前海合作区"]]],["宝安区",[["新安街道"],["西乡街道"],["航城街道"],["福永街道"],["福海街道"],["沙井街道"],["新桥街道"],["松岗街道"],["燕罗街道"],["石岩街道"],["深圳市宝安国际机场"]]],["龙岗区",[["平湖街道"],["坪地街道"],["葵涌街道"],["大鹏街道"],["南澳街道"],["南湾街道"],["坂田街道"],["布吉街道"],["龙城街道"],["龙岗街道"],["横岗街道"],["吉华街道"],["宝龙街道"],["园山街道"]]],["盐田区",[["梅沙街道"],["盐田街道"],["沙头角街道"],["海山街道"],["市保税区（沙头角）"],["市保税区（盐田港）"]]],["龙华区",[["观湖街道"],["民治街道"],["龙华街道"],["大浪街道"],["福城街道"],["观澜街道"]]],["坪山区",[["坪山街道"],["马峦街道"],["碧岭街道"],["石井街道"],["坑梓街道"],["龙田街道"],["深圳市大工业区"]]],["光明区",[["光明街道"],["公明街道"],["新湖街道"],["凤凰街道"],["玉塘街道"],["马田街道"]]]]]]]]
  // 以上为新地址处理逻辑，另外地址数据无 港澳台 数据
  // - 文件存放在七牛云  alpha-wq-pic/location/20200508/index.json
  // - 访问地址: https://wg.cloud.ininin.com/location/20200508/index.json
  // - 注解:
  // - 后期维护时需保留历史文件；新文件存放，新建一个上传时间(格式: 年月日 )文件夹，放到其目录下保存为 index.json

  // [ 北京市(11), 上海市(31), 天津市(12), 重庆市(50) ]
  const f1 = [ '11', '31', '12', '50' ]
  const f2 = [ '省直辖县级行政区划', '自治区直辖县级行政区划' ]
  // [ 广东省中山市(4420), 广东省东莞市(4419), 海南省儋州市(4604) ]
  const f3 = [ '4420', '4419', '4604' ]
  return _.map(res, p => {
    index++
    const pd = p.dataValues
    const { code, name: pname } = pd
    log(index, count, code, pname, 4)
    // 特殊处理 1
    if (f1.includes(code)) {
      p.cities = [_.reduce(p.cities, (r, n) => {
        r.dataValues = {...n.dataValues, name: pname}
        r.areas = [...r.areas, ...n.areas]
        return r
      }, {dataValues: {}, areas: []})]
    }
    // 特殊处理 2
    const ctempIndex = p.cities.findIndex(c => {
      return f2.includes(c.dataValues.name)
    })
    if (ctempIndex > -1) {
      const [ctemp] = p.cities.splice(ctempIndex, 1)
      const inCity = _.map(ctemp.areas, sitem => {
        return {
          dataValues: sitem.dataValues,
          areas: _.map(sitem.streets, vitem => {
            return {
              dataValues: vitem.dataValues,
              streets: vitem.villages
            }
          })
        }
      })
      p.cities = [...p.cities, ...inCity]
    }
    const pchildren = _.map(p.cities, c => {
      let { code, name: cname } = c.dataValues
      log(index, count, code, cname, 4)
      // 特殊处理 3
      if (f3.includes(code)) {
        const cchildren = _.map(c.areas[0].streets, s => {
          const sd = s.dataValues
          const {name: value} = _.pick(sd, fField)
          return [value]
        })
        return [cname, cchildren]
      } else {
        const cchildren = _.map(c.areas, a => {
          const ad = a.dataValues
          const { code, name } = ad
          log(index, count, code, name, 4)
          ad.children = _.map(a.streets, s => {
            const sd = s.dataValues
            const {name: value} = _.pick(sd, fField)
            return [value]
          })
          const { name: value, children } = _.pick(ad, fField)
          return [value, children]
        })
        return [cname, cchildren]
      }
    })
    return [pname, pchildren]
  })
}

function log (index, total, code, name, type) {
  if (index >= 0 && index <= 9) index = `0${index}`
  const clen = code.length

  if ((type === 3 && clen === 2) ||
    (type === 4 && clen === 4)) code = `${code}  `
  else if (type === 4 && clen === 2) code = `${code}    `

  let text = ''
  switch (type) {
    case 2:
      text = '正在格式化省市二级联动数据'
      break
    case 3:
      text = '正在格式化省市区三级联动数据，请耐心等候'
      break
    case 4:
      text = '正在格式化省市区镇四级联动数据，该步骤比较耗时，请耐心等候'
      break
  }

  console.log(`[${index}/${total}]${text} ${code} ${name}`)
}
