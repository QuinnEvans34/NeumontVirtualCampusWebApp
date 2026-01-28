# Neumont Virtual Campus Web App (Starter)

## Quick Start

Prerequisites:
- Bun installed (https://bun.sh)
- Node.js installed (required for client tooling)

From the repo root, run:

```powershell
.\runapp.ps1
```

This script:
- Opens a new PowerShell window for the Bun server
- Opens a new PowerShell window for the Vite client

When everything is running:
- Client: http://localhost:5173
- Server health: http://localhost:3001/health

To stop the app, close the two PowerShell windows that were opened.

Note: This setup is subject to change at dev-team discretion.

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

When running, the page should show the Neumont tilemap with a movable placeholder player.

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

- Health check: `http://localhost:3001/health`
- WebSocket endpoint: `ws://localhost:3001/ws`
- Chat send: `{ "type": "chat:send", "room": "basement-general", "text": "..." }`
- Broadcast: `{ "type": "chat:message", "room": "...", "text": "...", "ts": 123, "id": "..." }`
