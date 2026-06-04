const fs = require('fs')
const path = require('path')

const {describe, expect, it} = global

describe('display orders quantity prefix', () => {
  it('keeps root item quantities visible on KDS and TV cards', () => {
    const sourcePath = path.join(
      __dirname,
      '../../../../../react/pages/displays/orders/index.js',
    )
    const source = fs.readFileSync(sourcePath, 'utf8')

    expect(source).toContain('<OrderProducts')
    expect(source).not.toContain('showRootQuantityPrefix={false}')
  })
})
