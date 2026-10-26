// Erzeugt die App-Icons (PNG) ohne zusätzliche Abhängigkeiten.
// Aufruf: npm run icons  → schreibt nach public/icons/
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'

const BG = [39, 39, 42] // zinc-800
const FG = [250, 250, 250]

// Hantel als Rechtecke in einem 100er-Raster: [x, y, breite, höhe]
const SHAPES = [
  [22, 47, 56, 6], // Stange
  [14, 32, 8, 36], // Scheibe links außen
  [24, 26, 9, 48], // Scheibe links innen
  [67, 26, 9, 48], // Scheibe rechts innen
  [78, 32, 8, 36], // Scheibe rechts außen
]

function crc32(buf) {
  let c = ~0
  for (const b of buf) {
    c ^= b
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

function png(size) {
  const raw = Buffer.alloc((size * 3 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const u = (x / size) * 100
      const v = (y / size) * 100
      const inShape = SHAPES.some(([sx, sy, w, h]) => u >= sx && u < sx + w && v >= sy && v < sy + h)
      const [r, g, b] = inShape ? FG : BG
      const i = y * (size * 3 + 1) + 1 + x * 3
      raw[i] = r
      raw[i + 1] = g
      raw[i + 2] = b
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // Bittiefe
  ihdr[9] = 2 // RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync('public/icons', { recursive: true })
writeFileSync('public/icons/icon-192.png', png(192))
writeFileSync('public/icons/icon-512.png', png(512))
writeFileSync('public/icons/apple-touch-icon.png', png(180))
console.log('Icons geschrieben: public/icons/')
