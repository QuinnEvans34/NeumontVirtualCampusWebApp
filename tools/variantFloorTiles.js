/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')

const repoRoot = path.resolve(__dirname, '..')
const targets = [
  path.join(repoRoot, 'client', 'public', 'maps'),
  path.join(repoRoot, 'client', 'public', 'assets', 'maps', 'floors'),
]

const FLOOR_LAYER_NAMES = ['ground', 'floor']
const VARIANT_COUNT = 8

const FLIP_H = 0x80000000
const FLIP_V = 0x40000000
const FLIP_D = 0x20000000
const FLIP_MASK = FLIP_H | FLIP_V | FLIP_D

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((file) => file.toLowerCase().endsWith('.json'))
    .map((file) => path.join(dir, file))
}

function hashVariant(x, y) {
  const value = (x * 73856093) ^ (y * 19349663)
  return Math.abs(value) % VARIANT_COUNT
}

function baseGid(gid) {
  return gid & ~FLIP_MASK
}

function rotateFloorLayer(layer, mapWidth, firstgid) {
  if (!Array.isArray(layer.data)) return 0

  const counts = new Map()
  layer.data.forEach((gid) => {
    const id = baseGid(gid)
    if (!id) return
    counts.set(id, (counts.get(id) || 0) + 1)
  })

  if (counts.size === 0) return 0

  let modeId = null
  let modeCount = -1
  counts.forEach((count, id) => {
    if (count > modeCount) {
      modeCount = count
      modeId = id
    }
  })

  if (!modeId) return 0

  let changed = 0
  const newData = layer.data.map((gid, index) => {
    const id = baseGid(gid)
    if (id !== modeId) return gid

    const x = index % mapWidth
    const y = Math.floor(index / mapWidth)
    const variant = hashVariant(x, y)
    const newBase = firstgid + variant
    const flags = gid & FLIP_MASK
    changed += 1
    return flags | newBase
  })

  layer.data = newData
  return changed
}

function processMap(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8')
  const map = JSON.parse(raw)

  if (map.infinite) {
    console.warn(`Skipping infinite map: ${path.basename(filePath)}`)
    return 0
  }

  const tileset = map.tilesets?.[0]
  if (!tileset || typeof tileset.firstgid !== 'number') {
    console.warn(`Skipping map without tileset: ${path.basename(filePath)}`)
    return 0
  }

  const firstgid = tileset.firstgid
  let totalChanged = 0

  map.layers?.forEach((layer) => {
    if (layer.type !== 'tilelayer') return
    const name = (layer.name || '').toLowerCase()
    if (!FLOOR_LAYER_NAMES.some((n) => name.includes(n))) return
    totalChanged += rotateFloorLayer(layer, map.width, firstgid)
  })

  fs.writeFileSync(filePath, JSON.stringify(map, null, 2))
  return totalChanged
}

function run() {
  const files = Array.from(new Set(targets.flatMap(listJsonFiles)))
  if (!files.length) {
    console.error('No map JSON files found.')
    process.exit(1)
  }

  files.forEach((file) => {
    const changed = processMap(file)
    console.log(`Updated floor variants: ${path.relative(repoRoot, file)} (${changed} tiles)`)
  })
}

run()
