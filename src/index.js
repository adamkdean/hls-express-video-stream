// Copyright 2021 Adam K Dean. Use of this source code is
// governed by an MIT-style license that can be found at
// https://opensource.org/licenses/MIT.

const express = require('express')
const fs = require('fs')
const hls = require('hls-server')
const path = require('path')

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const htmlDir = path.join(__dirname, '../static/html')
const videoDir = path.join(__dirname, '../static/videos')

const app = express()
app.get('/', (req, res) => {
  const fileContents = fs.readFileSync(`${htmlDir}/index.html`)
  res.status(200).send(fileContents.toString())
})
app.use((req, res, next) => {
  console.log('404 handler', req.url)
  res.status(404).send('404')
})

const server = app.listen(8000, () => console.log('HTTP Server listening on port 8000'))

new hls(server, {
  provider: {
    exists: async (req, cb) => {
      console.log('->', req.url)

      // if req.url starts with /video/
      if (!req.url.startsWith('/v/')) return cb(null, true)
      if (!req.url.endsWith('.m3u8')) return cb(null, true)

      // Get filename from req.url without extension or path
      const filename = req.url.split('/').pop().split('.')[0]
      const mp4 = `${videoDir}/${filename}.mp4`
      const m3u8 = `${videoDir}/${filename}/${filename}.m3u8`

      // check if mp4 exists
      const exists = await new Promise((resolve, reject) => {
        fs.access(mp4, fs.constants.F_OK, (err) => {
          if (err) return reject(err)
          resolve(true)
        })
      })

      if (!exists) {
        console.log(`error: requested video ${mp4} does not exist`)
        return cb(null, false)
      }

      // check if directory filename exists
      console.log(`checking if ${videoDir}/${filename} exists`)
      fs.stat(`${videoDir}/${filename}`, async (err, stats) => {
        if (err || !stats.isDirectory()) {
          console.log(`${videoDir}/${filename} does not exist, processing`)

          // ensure directory exists
          await fs.promises.mkdir(`${videoDir}/${filename}`, { recursive: true })

          // convert mp4 into m3u8 and ts files
          console.log(`converting ${mp4} to ${m3u8}`)
          const cmd = `ffmpeg -i ${mp4} -hls_time 5 -f hls ${m3u8}`
          const exec = require('child_process').exec

          await new Promise((resolve, reject) => {
            console.log('cmd', cmd)
            exec(cmd, (err, stdout, stderr) => {
              if (err) {
                console.error(err)
                return reject(err)
              }
              console.log(stdout)
              console.log(stderr)
              resolve()
            })
          })

          console.log(`prepending ${filename} to all lines in ${m3u8}`)
          const m3u8Contents = fs.readFileSync(m3u8).toString()
          const newM3u8Contents = m3u8Contents.split('\n').map(line => {
            if (line.startsWith(filename)) return `${filename}/${line}`
            return line
          }).join('\n')
          fs.writeFileSync(m3u8, newM3u8Contents)

          console.log('generated m3u8 playlist', m3u8)
        }

        console.log('checking video playlist exists')
        fs.access(`${videoDir}/${filename}/${filename}.m3u8`, fs.constants.F_OK, (err) => {
          if (err) {
            console.error(err)
            return cb(null, false)
          }
          console.log('video playlist exists')
          return cb(null, true)
        })
      })
    },
    getManifestStream: (req, cb) => {
      console.log('-> get manifest', req.url)
      const filename = req.url.split('/').pop().split('.')[0]
      const m3u8 = `${videoDir}/${filename}/${filename}.m3u8`

      console.log('<- returning manifest:', m3u8)
      cb(null, fs.createReadStream(m3u8))
    },
    getSegmentStream: (req, cb) => {
      console.log('-> get segment', req.url)

      // from req.url as format /v/earth_1920_1080/earth_1920_10800.ts extract last two parts
      const urlParts = req.url.split('/')
      const filename = urlParts.pop().split('.')[0]
      const video = urlParts.pop()
      const ts = `${videoDir}/${video}/${filename}.ts`

      console.log('<- returning segment:', ts)
      cb(null, fs.createReadStream(ts))
    }
  }
})
