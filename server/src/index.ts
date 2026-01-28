const PORT = Number(process.env.PORT ?? 3001)
const ROOM = 'basement-general'
const MAX_TEXT_LENGTH = 300
const RATE_WINDOW_MS = 1000
const MAX_MESSAGES_PER_WINDOW = 6

type ChatSendPayload = {
  type: 'chat:send'
  room: string
  text: string
}

type ChatMessage = {
  type: 'chat:message'
  room: string
  text: string
  ts: number
  id: string
}

const clients = new Set<WebSocket>()
const rateLimits = new WeakMap<
  WebSocket,
  { windowStart: number; count: number }
>()

function isChatSendPayload(value: unknown): value is ChatSendPayload {
  if (!value || typeof value !== 'object') return false
  const payload = value as ChatSendPayload
  return (
    payload.type === 'chat:send' &&
    typeof payload.room === 'string' &&
    typeof payload.text === 'string'
  )
}

function canSend(ws: WebSocket) {
  const now = Date.now()
  const state = rateLimits.get(ws) ?? { windowStart: now, count: 0 }

  if (now - state.windowStart >= RATE_WINDOW_MS) {
    state.windowStart = now
    state.count = 0
  }

  if (state.count >= MAX_MESSAGES_PER_WINDOW) {
    rateLimits.set(ws, state)
    return false
  }

  state.count += 1
  rateLimits.set(ws, state)
  return true
}

function broadcast(message: ChatMessage) {
  const payload = JSON.stringify(message)
  for (const client of clients) {
    try {
      client.send(payload)
    } catch {
      // Ignore failed sends
    }
  }
}

const server = Bun.serve({
  port: PORT,
  fetch(req, server) {
    const url = new URL(req.url)

    if (url.pathname === '/health') {
      return Response.json({ ok: true })
    }

    if (url.pathname === '/ws') {
      if (server.upgrade(req)) return
      return new Response('WebSocket upgrade failed', { status: 400 })
    }

    return new Response('Not Found', { status: 404 })
  },
  websocket: {
    open(ws) {
      clients.add(ws)
      rateLimits.set(ws, { windowStart: Date.now(), count: 0 })
    },
    close(ws) {
      clients.delete(ws)
      rateLimits.delete(ws)
    },
    message(ws, raw) {
      if (!canSend(ws)) return

      const text =
        typeof raw === 'string' ? raw : new TextDecoder().decode(raw)

      let payload: unknown
      try {
        payload = JSON.parse(text)
      } catch {
        return
      }

      if (!isChatSendPayload(payload)) return
      if (payload.room !== ROOM) return

      const messageText = payload.text.trim()
      if (!messageText) return
      if (messageText.length > MAX_TEXT_LENGTH) return

      broadcast({
        type: 'chat:message',
        room: payload.room,
        text: messageText,
        ts: Date.now(),
        id: crypto.randomUUID(),
      })
    },
  },
})

console.log(`Bun server listening on http://localhost:${server.port}`)
