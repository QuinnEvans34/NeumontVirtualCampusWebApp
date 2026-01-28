import Phaser from 'phaser'

const DEFAULT_MAP_FILE = 'neumont_main.json'
const MAP_BASE_URL = '/maps/'
const TILESET_KEY = 'neumont_tileset_32'
const TILESET_IMAGE_URL = '/assets/neumont_tileset_32.png'
const TILESET_EXPECTED_NAME = 'neumont_tileset_32'
const PLAYER_TEXTURE_KEY = 'player_placeholder'

type SpawnPoint = { x: number; y: number }
type PortalDefinition = { targetMap: string; targetSpawn?: string }

export default class WorldScene extends Phaser.Scene {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null
  private wasd:
    | {
        W: Phaser.Input.Keyboard.Key
        A: Phaser.Input.Keyboard.Key
        S: Phaser.Input.Keyboard.Key
        D: Phaser.Input.Keyboard.Key
      }
    | null = null
  private player?: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
  private tileLayers: Phaser.Tilemaps.TilemapLayer[] = []
  private portalZones: Phaser.GameObjects.Zone[] = []
  private colliders: Phaser.Physics.Arcade.Collider[] = []
  private currentMapFile: string | null = null
  private isTransitioning = false
  private portalCooldownUntil = 0
  private playerTextureReady = false
  private resizeHandler: (() => void) | null = null

  constructor() {
    super('world')
  }

  preload() {
    this.load.image(TILESET_KEY, TILESET_IMAGE_URL)
    this.load.tilemapTiledJSON(
      this.mapKey(DEFAULT_MAP_FILE),
      this.mapUrl(DEFAULT_MAP_FILE)
    )
  }

  create() {
    this.cursors = this.input.keyboard?.createCursorKeys() ?? null
    this.wasd = this.input.keyboard?.addKeys('W,A,S,D') as {
      W: Phaser.Input.Keyboard.Key
      A: Phaser.Input.Keyboard.Key
      S: Phaser.Input.Keyboard.Key
      D: Phaser.Input.Keyboard.Key
    }

    this.loadMap(DEFAULT_MAP_FILE)
  }

  update() {
    if (!this.player) return

    const speed = 200
    const body = this.player.body
    body.setVelocity(0, 0)

    const left = this.cursors?.left?.isDown || this.wasd?.A?.isDown
    const right = this.cursors?.right?.isDown || this.wasd?.D?.isDown
    const up = this.cursors?.up?.isDown || this.wasd?.W?.isDown
    const down = this.cursors?.down?.isDown || this.wasd?.S?.isDown

    if (left) body.setVelocityX(-speed)
    if (right) body.setVelocityX(speed)
    if (up) body.setVelocityY(-speed)
    if (down) body.setVelocityY(speed)

    body.velocity.normalize().scale(speed)
  }

  private mapKey(fileName: string) {
    return `map:${fileName}`
  }

  private mapUrl(fileName: string) {
    return `${MAP_BASE_URL}${fileName}`
  }

  private loadMap(fileName: string, spawnName?: string) {
    const mapKey = this.mapKey(fileName)

    if (this.cache.tilemap.has(mapKey)) {
      this.buildMap(mapKey, fileName, spawnName)
      return
    }

    this.load.tilemapTiledJSON(mapKey, this.mapUrl(fileName))
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      this.buildMap(mapKey, fileName, spawnName)
    })
    this.load.once(
      Phaser.Loader.Events.FILE_LOAD_ERROR,
      (file: Phaser.Loader.File) => {
        const source = file?.src ?? fileName
        console.error(`Failed to load map JSON from ${source}.`)
        this.isTransitioning = false
      }
    )

    if (!this.load.isLoading()) {
      this.load.start()
    }
  }

  private buildMap(mapKey: string, fileName: string, spawnName?: string) {
    this.cleanupMap()
    this.currentMapFile = fileName

    const map = this.make.tilemap({ key: mapKey })
    const tileset = map.addTilesetImage(TILESET_EXPECTED_NAME, TILESET_KEY)

    if (!tileset) {
      const available = map.tilesets.map((set) => set.name)
      console.error(
        `Tileset name mismatch. Expected "${TILESET_EXPECTED_NAME}", but map contains: ${
          available.length ? available.join(', ') : 'none'
        }.`
      )
      this.isTransitioning = false
      return
    }

    map.layers.forEach((layerData) => {
      const layerType = (layerData as { type?: string }).type
      if (layerType && layerType !== 'tilelayer') return

      const layer = map.createLayer(layerData.name, tileset)
      if (!layer) return

      layer.setPosition(0, 0)
      this.applyCollision(layer)
      this.tileLayers.push(layer)
    })

    if (this.tileLayers.length === 0) {
      console.error(`No tile layers found in map "${mapKey}".`)
      this.isTransitioning = false
      return
    }

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels)

    const spawn = this.findSpawnPoint(map, spawnName)
    this.ensurePlayer(spawn)

    this.configureCamera(map)

    const player = this.player
    if (player) {
      this.tileLayers.forEach((layer) => {
        this.colliders.push(this.physics.add.collider(player, layer))
      })
    }

    this.createPortals(map)

    this.isTransitioning = false
  }

  private ensurePlayer(spawn: SpawnPoint) {
    const playerSize = 32
    const colliderSize = 26

    if (!this.playerTextureReady) {
      const playerGfx = this.add.graphics()
      playerGfx.fillStyle(0x38bdf8, 1)
      playerGfx.fillRect(0, 0, playerSize, playerSize)
      playerGfx.generateTexture(PLAYER_TEXTURE_KEY, playerSize, playerSize)
      playerGfx.destroy()
      this.playerTextureReady = true
    }

    if (!this.player) {
      this.player = this.physics.add
        .sprite(spawn.x, spawn.y, PLAYER_TEXTURE_KEY)
        .setCollideWorldBounds(true)
    } else {
      this.player.setPosition(spawn.x, spawn.y)
      this.player.body.reset(spawn.x, spawn.y)
    }

    this.player.setSize(colliderSize, colliderSize)
    this.player.setOffset(
      (playerSize - colliderSize) / 2,
      playerSize - colliderSize
    )
  }

  private createPortals(map: Phaser.Tilemaps.Tilemap) {
    const portalLayer = map.getObjectLayer('Portals')
    const player = this.player
    const objectsLayer = map.getObjectLayer('Objects')
    const portalObjects =
      portalLayer?.objects ??
      objectsLayer?.objects?.filter((obj) =>
        (obj.type ?? obj.name ?? '').toString().toLowerCase().includes('portal')
      ) ??
      []

    if (!portalObjects.length || !player) return

    portalObjects.forEach((obj) => {
      if (!obj.width || !obj.height) return
      const props = this.getObjectProperties(obj)
      const targetMap = props.targetMap
      const targetSpawn = props.targetSpawn

      if (typeof targetMap !== 'string' || targetMap.length === 0) {
        console.error(
          `Portal is missing a valid targetMap (object: "${obj.name ?? 'unnamed'}").`
        )
        return
      }

      const resolvedMap = this.resolveMapFile(targetMap)

      const zone = this.add.zone(
        (obj.x ?? 0) + obj.width / 2,
        (obj.y ?? 0) + obj.height / 2,
        obj.width,
        obj.height
      )
      this.physics.add.existing(zone, true)
      this.portalZones.push(zone)

      const collider = this.physics.add.overlap(
        player,
        zone,
        () => {
          this.tryPortalTransition({
            targetMap: resolvedMap,
            targetSpawn:
              typeof targetSpawn === 'string' ? targetSpawn : undefined,
          })
        },
        undefined,
        this
      )
      this.colliders.push(collider)
    })
  }

  private tryPortalTransition(portal: PortalDefinition) {
    if (this.isTransitioning) return
    if (this.time.now < this.portalCooldownUntil) return

    this.isTransitioning = true
    this.portalCooldownUntil = this.time.now + 500

    this.loadMap(portal.targetMap, portal.targetSpawn)
  }

  private cleanupMap() {
    this.colliders.forEach((collider) => collider.destroy())
    this.colliders = []
    this.portalZones.forEach((zone) => zone.destroy())
    this.portalZones = []
    this.tileLayers.forEach((layer) => layer.destroy())
    this.tileLayers = []
  }

  private resolveMapFile(targetMap: string) {
    const normalized = targetMap.trim()
    const lower = normalized.toLowerCase()
    const aliasMap: Record<string, string> = {
      main: 'neumont_main.json',
      basement: 'neumont_basement.json',
      floor2: 'neumont_floor2.json',
      floor3: 'neumont_floor3.json',
    }

    if (aliasMap[lower]) return aliasMap[lower]
    if (normalized.endsWith('.json')) return normalized
    return `${normalized}.json`
  }

  private getObjectProperties(
    obj: Phaser.Types.Tilemaps.TiledObject
  ): Record<string, unknown> {
    const props: Record<string, unknown> = {}
    const raw = obj.properties

    if (Array.isArray(raw)) {
      raw.forEach((prop) => {
        if (prop && typeof prop.name === 'string') {
          props[prop.name] = prop.value
        }
      })
    } else if (raw && typeof raw === 'object') {
      Object.assign(props, raw)
    }

    return props
  }

  private findSpawnPoint(
    map: Phaser.Tilemaps.Tilemap,
    spawnName?: string
  ): SpawnPoint {
    const spawnLayer = map.getObjectLayer('Spawns')
    const objectsLayer = map.getObjectLayer('Objects')
    const spawnObjects =
      spawnLayer?.objects ??
      objectsLayer?.objects?.filter((obj) =>
        (obj.type ?? obj.name ?? '').toString().toLowerCase().includes('spawn')
      ) ??
      []

    if (spawnObjects.length) {
      let spawnObject =
        spawnName &&
        spawnObjects.find(
          (obj) => obj.name?.toLowerCase() === spawnName.toLowerCase()
        )

      if (!spawnObject) {
        if (spawnName) {
          console.error(
            `Spawn "${spawnName}" not found in map "${
              this.currentMapFile ?? 'unknown'
            }". Falling back to first spawn.`
          )
        }
        spawnObject = spawnObjects[0]
      }

      const x = spawnObject.x ?? map.tileWidth
      const y = spawnObject.y ?? map.tileHeight
      const width = spawnObject.width ?? 0
      const height = spawnObject.height ?? 0

      if (spawnObject.point) {
        return { x, y }
      }

      return { x: x + width / 2, y: y + height / 2 }
    }

    return {
      x: map.tileWidth * 2,
      y: map.tileHeight * 2,
    }
  }

  private applyCollision(layer: Phaser.Tilemaps.TilemapLayer) {
    layer.setCollisionByProperty({ collision: true })
    layer.setCollisionByProperty({ collides: true })
    let hasCollision = false
    layer.forEachTile((tile) => {
      if (tile.collides) {
        hasCollision = true
      }
    })

    const layerName = layer.layer.name.toLowerCase()
    const shouldForceCollision = ['walls', 'wall', 'collision'].some((label) =>
      layerName.includes(label)
    )

    if (!hasCollision && shouldForceCollision) {
      layer.setCollisionByExclusion([-1])
    }

    if (layerName.includes('collision')) {
      layer.setVisible(false)
    }
  }

  private configureCamera(map: Phaser.Tilemaps.Tilemap) {
    const camera = this.cameras.main
    const mapWidth = map.widthInPixels
    const mapHeight = map.heightInPixels

    camera.setBounds(0, 0, mapWidth, mapHeight)
    if (this.player) {
      camera.startFollow(this.player, true, 0.1, 0.1)
    }
    camera.setBackgroundColor('#0f172a')
    camera.roundPixels = true

    const updateZoom = () => {
      const scaleW = this.scale.width
      const scaleH = this.scale.height
      const zoom = Math.min(scaleW / mapWidth, scaleH / mapHeight)
      camera.setZoom(Math.min(1, zoom))
    }

    updateZoom()

    if (this.resizeHandler) {
      this.scale.off('resize', this.resizeHandler)
    }

    this.resizeHandler = () => {
      updateZoom()
    }

    this.scale.on('resize', this.resizeHandler)
  }
}
