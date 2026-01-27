# Neumont Virtual Campus Web App (Starter)

This repo contains a React + Phaser client and a Bun WebSocket server.

## Client (Vite + React + TypeScript)

```bash
cd client
npm install
npm run dev
```

Build for production:

```bash
cd client
npm run build
```

When running, the page should show a Phaser canvas with a "Boot OK" label.

The chat overlay connects to `ws://localhost:3001/ws` by default. To override:

```bash
cd client
set VITE_WS_URL=ws://localhost:3001/ws
npm run dev
```

## Server (Bun + TypeScript)

```bash
cd server
bun install
bun run dev
```

The server listens on `http://localhost:3001` by default.

- WebSocket endpoint: `ws://localhost:3001/ws`
- On connect, it sends: `{ "type": "hello", "ts": <unix ms> }`
- On message, it echoes: `{ "type": "echo", "body": <original> }`
