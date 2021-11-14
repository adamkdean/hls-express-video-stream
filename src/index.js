// Copyright 2021 Adam K Dean. Use of this source code is
// governed by an MIT-style license that can be found at
// https://opensource.org/licenses/MIT.

// using node.js generate an image 800 x 600
// with a background of black and a white square
// in the middle.

const { createWriteStream } = require('fs')
const { createCanvas } = require('canvas')
const path = require('path')

const outputImagePath = path.join(__dirname, '..', 'out', 'output.png')
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
const width = 400
const height = 300

const main = async() => {
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  const start = Date.now()

  while (true) {
    const elapsed = Date.now() - start

    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.fillStyle = 'white'
    ctx.font = '24px Hack'

    const metrics = ctx.measureText(`${elapsed} ms`)
    const x = canvas.width / 2 - metrics.width / 2
    const y = canvas.height / 2 + metrics.actualBoundingBoxAscent / 2
    ctx.fillText(`${elapsed} ms`, x, y)

    const out = createWriteStream(outputImagePath)
    const stream = canvas.createPNGStream()
    stream.pipe(out)

    await sleep(1000)
  }
}

main()
