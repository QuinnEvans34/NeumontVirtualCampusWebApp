import { useEffect, useMemo, useRef, useState } from 'react'
import Phaser from 'phaser'
import './App.css'

const MAP_KEY = 'main-floor'
const TILESET_KEY = 'neumont-tileset'
const TILESET_NAME = 'neumont_tileset_32'
const DEFAULT_WS_URL = 'ws://localhost:3001/ws'

type ChatMessage = {
  id: string
  kind: 'system' | 'client' | 'server'
  text: string
}

class BootScene extends Phaser.Scene {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody

  constructor() {
    super('boot')
  }

  preload() {
    this.load.image(
      TILESET_KEY,
      '/assets/tilesets/neumont/neumont_tileset_32.png'
    )
    this.load.tilemapTiledJSON(
      MAP_KEY,
      '/assets/maps/floors/main-floor.json'
    )
  }

  create() {
    const map = this.make.tilemap({ key: MAP_KEY })
    const tileset = map.addTilesetImage(TILESET_NAME, TILESET_KEY)

    if (!tileset) {
      console.error(
        `Tileset "${TILESET_NAME}" not found in map "${MAP_KEY}".`
      )
      return
    }

    if (!map.getLayer('Floor')) {
      console.error(`Layer "Floor" not found in map "${MAP_KEY}".`)
      return
    }

    if (!map.getLayer('Walls')) {
      console.error(`Layer "Walls" not found in map "${MAP_KEY}".`)
      return
    }

    const floorLayer = map.createLayer('Floor', tileset, 0, 0)
    const wallsLayer = map.createLayer('Walls', tileset, 0, 0)

    if (!floorLayer || !wallsLayer) {
      console.error(`Failed to create layers for map "${MAP_KEY}".`)
      return
    }

    wallsLayer.setCollisionByProperty({ collides: true })

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels)

    const playerSize = 28
    const playerGfx = this.add.graphics()
    playerGfx.fillStyle(0x38bdf8, 1)
    playerGfx.fillRect(0, 0, playerSize, playerSize)
    playerGfx.generateTexture('player', playerSize, playerSize)
    playerGfx.destroy()

    this.player = this.physics.add
      .sprite(map.tileWidth * 2, map.tileHeight * 2, 'player')
      .setCollideWorldBounds(true)
    this.player.setSize(playerSize, playerSize, true)

    this.physics.add.collider(this.player, wallsLayer)

    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15)
    this.cameras.main.setBackgroundColor('#0f172a')

    this.cursors = this.input.keyboard?.createCursorKeys() ?? null

    this.add
      .text(24, 24, `FLOOR: ${MAP_KEY}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '32px',
        color: '#f8fafc',
        backgroundColor: '#0f172a',
        padding: { x: 12, y: 8 },
      })
      .setScrollFactor(0)
      .setDepth(1000)
  }

  update() {
    if (!this.player || !this.cursors) return

    const speed = 200
    const body = this.player.body
    body.setVelocity(0, 0)

    if (this.cursors.left?.isDown) {
      body.setVelocityX(-speed)
    } else if (this.cursors.right?.isDown) {
      body.setVelocityX(speed)
    }

    if (this.cursors.up?.isDown) {
      body.setVelocityY(-speed)
    } else if (this.cursors.down?.isDown) {
      body.setVelocityY(speed)
    }

    body.velocity.normalize().scale(speed)
  }
}

function App() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<'connecting' | 'open' | 'closed'>(
    'connecting'
  )
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const wsUrl = useMemo(
    () => import.meta.env.VITE_WS_URL ?? DEFAULT_WS_URL,
    []
  )

  useEffect(() => {
    if (!containerRef.current) return

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 800,
      height: 450,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0 },
          debug: false,
        },
      },
      scene: [BootScene],
      backgroundColor: '#0f172a',
    })

    return () => {
      game.destroy(true)
    }
  }, [])

  useEffect(() => {
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws
    setStatus('connecting')

    ws.addEventListener('open', () => {
      setStatus('open')
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          kind: 'system',
          text: `Connected to ${wsUrl}`,
        },
      ])
    })

    ws.addEventListener('close', () => {
      setStatus('closed')
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          kind: 'system',
          text: 'WebSocket disconnected',
        },
      ])
    })

    ws.addEventListener('message', (event) => {
      const text =
        typeof event.data === 'string'
          ? event.data
          : JSON.stringify(event.data)
      let parsed = text

      try {
        const json = JSON.parse(text)
        parsed = JSON.stringify(json, null, 2)
      } catch {
        // Keep raw text
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          kind: 'server',
          text: parsed,
        },
      ])
    })

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [wsUrl])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = () => {
    const trimmed = input.trim()
    if (!trimmed) return

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(trimmed)
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          kind: 'client',
          text: trimmed,
        },
      ])
      setInput('')
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          kind: 'system',
          text: 'WebSocket not connected.',
        },
      ])
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Phaser + React</h1>
        <p>Phaser should render below with a "Boot OK" label.</p>
      </header>
      <div className="game-wrapper">
        <div ref={containerRef} className="game-container" />
      </div>
      <aside className="chat-overlay">
        <div className="chat-header">
          <div>
            <strong>Basement Chat</strong>
            <div className="chat-subtitle">WebSocket: {wsUrl}</div>
          </div>
          <span className={`chat-status chat-status-${status}`}>
            {status}
          </span>
        </div>
        <div className="chat-messages">
          {messages.map((message) => (
            <div key={message.id} className={`chat-message ${message.kind}`}>
              {message.text}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="chat-input">
          <input
            type="text"
            value={input}
            placeholder="Type a message..."
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') sendMessage()
            }}
          />
          <button type="button" onClick={sendMessage}>
            Send
          </button>
        </div>
      </aside>
    </div>
  )
}

export default App
