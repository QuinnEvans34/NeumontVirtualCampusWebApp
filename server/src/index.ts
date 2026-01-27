const port = Number(process.env.PORT ?? 3001)

const server = Bun.serve({
  port,
  fetch(req, server) {
    const url = new URL(req.url)

    if (url.pathname === '/ws') {
      if (server.upgrade(req)) return
      return new Response('WebSocket upgrade failed', { status: 400 })
    }

    return new Response('OK', { status: 200 })
  },
  websocket: {
    open(ws) {
      ws.send(JSON.stringify({ type: 'hello', ts: Date.now() }))
    },
    message(ws, message) {
      const body =
        typeof message === 'string' ? message : Array.from(message)
      ws.send(JSON.stringify({ type: 'echo', body }))
    },
  },
})

console.log(`Bun server listening on http://localhost:${server.port}`)
