/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')

const repoRoot = path.resolve(__dirname, '..')
const targets = [
  path.join(repoRoot, 'client', 'public', 'maps'),
  path.join(repoRoot, 'client', 'public', 'assets', 'maps', 'floors'),
]

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((file) => file.toLowerCase().endsWith('.json'))
    .map((file) => path.join(dir, file))
}

function rotatePointCw(point, mapHeightPx) {
  return {
    x: mapHeightPx - point.y,
    y: point.x,
  }
}

function rotateTileLayer(layer, width, height) {
  if (!Array.isArray(layer.data)) {
    if (layer.chunks) {
      throw new Error('Chunked/infinite maps are not supported by this script.')
    }
    return
  }

  const newWidth = height
  const newHeight = width
  const newData = new Array(newWidth * newHeight).fill(0)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const oldIndex = y * width + x
      const newX = height - 1 - y
      const newY = x
      const newIndex = newY * newWidth + newX
      newData[newIndex] = layer.data[oldIndex]
    }
  }

  layer.data = newData
  layer.width = newWidth
  layer.height = newHeight
}

function rotateObjectLayer(layer, mapWidthPx, mapHeightPx) {
  if (!Array.isArray(layer.objects)) return

  layer.objects.forEach((obj) => {
    if (obj.polyline || obj.polygon) {
      const points = obj.polyline || obj.polygon || []
      const rotatedWorld = points.map((point) => {
        const world = {
          x: (obj.x || 0) + point.x,
          y: (obj.y || 0) + point.y,
        }
        return rotatePointCw(world, mapHeightPx)
      })

      const xs = rotatedWorld.map((p) => p.x)
      const ys = rotatedWorld.map((p) => p.y)
      const minX = Math.min(...xs)
      const minY = Math.min(...ys)
      const maxX = Math.max(...xs)
      const maxY = Math.max(...ys)

      obj.x = minX
      obj.y = minY
      obj.width = maxX - minX
      obj.height = maxY - minY

      const rotatedLocal = rotatedWorld.map((p) => ({
        x: p.x - minX,
        y: p.y - minY,
      }))

      if (obj.polyline) obj.polyline = rotatedLocal
      if (obj.polygon) obj.polygon = rotatedLocal
    } else if (obj.point) {
      const rotated = rotatePointCw({ x: obj.x || 0, y: obj.y || 0 }, mapHeightPx)
      obj.x = rotated.x
      obj.y = rotated.y
    } else {
      const width = obj.width || 0
      const height = obj.height || 0
      const newX = mapHeightPx - ((obj.y || 0) + height)
      const newY = obj.x || 0
      obj.x = newX
      obj.y = newY
      obj.width = height
      obj.height = width
    }

    if (typeof obj.rotation === 'number') {
      obj.rotation = (obj.rotation + 90) % 360
    }
  })

}

function rotateMap(map) {
  if (map.infinite) {
    throw new Error('Infinite maps are not supported by this script.')
  }

  const originalWidth = map.width
  const originalHeight = map.height
  const tileWidth = map.tilewidth
  const tileHeight = map.tileheight

  if (!originalWidth || !originalHeight || !tileWidth || !tileHeight) {
    throw new Error('Map is missing width/height/tilewidth/tileheight.')
  }

  const mapWidthPx = originalWidth * tileWidth
  const mapHeightPx = originalHeight * tileHeight

  map.width = originalHeight
  map.height = originalWidth

  if (Array.isArray(map.layers)) {
    map.layers.forEach((layer) => {
      if (layer.type === 'tilelayer') {
        rotateTileLayer(layer, originalWidth, originalHeight)
        return
      }

      if (layer.type === 'objectgroup') {
        rotateObjectLayer(layer, mapWidthPx, mapHeightPx)
      }

      if (typeof layer.width === 'number') {
        layer.width = map.width
      }
      if (typeof layer.height === 'number') {
        layer.height = map.height
      }
    })
  }

  return map
}

function run() {
  const files = Array.from(new Set(targets.flatMap(listJsonFiles)))

  if (!files.length) {
    console.error('No map JSON files found to rotate.')
    process.exit(1)
  }

  files.forEach((filePath) => {
    const raw = fs.readFileSync(filePath, 'utf8')
    const map = JSON.parse(raw)
    const rotated = rotateMap(map)
    fs.writeFileSync(filePath, JSON.stringify(rotated, null, 2))
    console.log(`Rotated map: ${path.relative(repoRoot, filePath)}`)
  })
}

run()
