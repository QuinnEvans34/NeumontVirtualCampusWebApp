/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')

const repoRoot = path.resolve(__dirname, '..')
const defaultMapsDir = path.join(
  repoRoot,
  'client',
  'public',
  'assets',
  'maps',
  'floors'
)

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((file) => file.toLowerCase().endsWith('.json'))
    .map((file) => path.join(dir, file))
}

function rotateTileData(data, width, height) {
  const newWidth = height
  const newHeight = width
  const rotated = new Array(newWidth * newHeight).fill(0)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const gid = data[y * width + x]
      const newX = y
      const newY = width - 1 - x
      rotated[newY * newWidth + newX] = gid
    }
  }

  return { data: rotated, width: newWidth, height: newHeight }
}

function rotatePointAbs(x, y, oldPixelWidth) {
  return { x: y, y: oldPixelWidth - x }
}

function rotateVector(x, y) {
  return { x: y, y: -x }
}

function normalizeRotation(value) {
  const raw = value % 360
  return raw < 0 ? raw + 360 : raw
}

function getObjectProperty(objectsProps, name) {
  if (!Array.isArray(objectsProps)) return null
  return objectsProps.find((prop) => prop?.name === name) ?? null
}

function setObjectProperty(objectsProps, name, value) {
  if (!Array.isArray(objectsProps)) return
  const existing = getObjectProperty(objectsProps, name)
  if (existing) {
    existing.value = value
    return
  }
  objectsProps.push({ name, type: 'string', value })
}

function rotateObject(obj, oldPixelWidth) {
  if (typeof obj.rotation === 'number') {
    obj.rotation = normalizeRotation(obj.rotation - 90)
  }

  if (Array.isArray(obj.polygon) || Array.isArray(obj.polyline)) {
    const pointsKey = Array.isArray(obj.polygon) ? 'polygon' : 'polyline'
    const points = obj[pointsKey] ?? []
    const origin = rotatePointAbs(obj.x ?? 0, obj.y ?? 0, oldPixelWidth)
    obj.x = origin.x
    obj.y = origin.y
    obj[pointsKey] = points.map((pt) => rotateVector(pt.x, pt.y))
    return
  }

  const width = Number.isFinite(obj.width) ? obj.width : 0
  const height = Number.isFinite(obj.height) ? obj.height : 0
  const x = Number.isFinite(obj.x) ? obj.x : 0
  const y = Number.isFinite(obj.y) ? obj.y : 0
  const isTileObject = typeof obj.gid === 'number'

  const topLeftX = x
  const topLeftY = isTileObject ? y - height : y

  const corners = [
    { x: topLeftX, y: topLeftY },
    { x: topLeftX + width, y: topLeftY },
    { x: topLeftX, y: topLeftY + height },
    { x: topLeftX + width, y: topLeftY + height },
  ].map((corner) => rotatePointAbs(corner.x, corner.y, oldPixelWidth))

  let minX = corners[0].x
  let maxX = corners[0].x
  let minY = corners[0].y
  let maxY = corners[0].y

  corners.forEach((corner) => {
    minX = Math.min(minX, corner.x)
    maxX = Math.max(maxX, corner.x)
    minY = Math.min(minY, corner.y)
    maxY = Math.max(maxY, corner.y)
  })

  const newWidth = maxX - minX
  const newHeight = maxY - minY

  obj.width = newWidth
  obj.height = newHeight

  if (isTileObject) {
    obj.x = minX
    obj.y = minY + newHeight
  } else {
    obj.x = minX
    obj.y = minY
  }
}

function rotateLayer(layer, oldWidth, oldHeight, oldPixelWidth) {
  if (layer.type === 'tilelayer') {
    if (!Array.isArray(layer.data)) {
      throw new Error(`Tile layer "${layer.name}" is missing data.`)
    }
    const rotated = rotateTileData(layer.data, oldWidth, oldHeight)
    layer.data = rotated.data
    layer.width = rotated.width
    layer.height = rotated.height
    return
  }

  if (layer.type === 'objectgroup') {
    if (Array.isArray(layer.objects)) {
      layer.objects.forEach((obj) => {
        rotateObject(obj, oldPixelWidth)

        const props = obj.properties
        if (!Array.isArray(props)) return

        const targetMap = getObjectProperty(props, 'targetMap')?.value
        const targetFloor = getObjectProperty(props, 'targetFloor')?.value

        if (targetMap && !targetFloor) {
          setObjectProperty(props, 'targetFloor', targetMap)
        } else if (targetFloor && !targetMap) {
          setObjectProperty(props, 'targetMap', targetFloor)
        }
      })
    }
    return
  }

  if (layer.type === 'group') {
    if (Array.isArray(layer.layers)) {
      layer.layers.forEach((child) =>
        rotateLayer(child, oldWidth, oldHeight, oldPixelWidth)
      )
    }
    return
  }

  if (layer.type === 'imagelayer') {
    if (typeof layer.offsetx === 'number' || typeof layer.offsety === 'number') {
      const rotated = rotatePointAbs(
        layer.offsetx ?? 0,
        layer.offsety ?? 0,
        oldPixelWidth
      )
      layer.offsetx = rotated.x
      layer.offsety = rotated.y
    }
  }
}

function rotateMapFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8')
  const map = JSON.parse(raw)

  if (map.infinite) {
    throw new Error(`Map is infinite (unsupported): ${path.basename(filePath)}`)
  }

  const oldWidth = map.width
  const oldHeight = map.height
  const oldPixelWidth = map.width * map.tilewidth

  map.width = oldHeight
  map.height = oldWidth

  if (!Array.isArray(map.layers)) {
    throw new Error(`Map missing layers: ${path.basename(filePath)}`)
  }

  map.layers.forEach((layer) =>
    rotateLayer(layer, oldWidth, oldHeight, oldPixelWidth)
  )

  fs.writeFileSync(filePath, JSON.stringify(map, null, 2))
  console.log(
    `Rotated ${path.relative(repoRoot, filePath)} (new ${map.width}x${map.height})`
  )
}

function run() {
  const args = process.argv.slice(2)
  const targets = args.length
    ? args.map((arg) =>
        path.isAbsolute(arg) ? arg : path.join(repoRoot, arg)
      )
    : listJsonFiles(defaultMapsDir)

  if (!targets.length) {
    console.error('No map JSON files found to rotate.')
    process.exit(1)
  }

  targets.forEach((filePath) => rotateMapFile(filePath))
}

run()
