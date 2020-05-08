const fs = require('fs')
const path = require('path')

const sqlite = require('./sqlite')
const format = require('./formatElementUI')

async function main () {
  await sqlite.init()

  const pcas = await format.getAddressPCAS()
  jsonOut('pcas-elementUI', pcas)

  console.log('[100%] 数据更新完成！')
}

function jsonOut (name, data) {
  fs.writeFileSync(
    path.resolve(__dirname, `../dist/${name}.json`),
    JSON.stringify(data))
}

main().then(() => process.exit(0)).catch(e => {
  console.log(e)
  process.exit(-1)
})
