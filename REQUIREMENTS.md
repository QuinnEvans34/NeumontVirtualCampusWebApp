# Requirements & Dependencies

## System Requirements

### Required Software
- **Node.js** (v18 or higher) - for client development
  - Download from: https://nodejs.org/
  - Verify with: `node --version` and `npm --version`
  
- **Bun** (v1.3.7 or higher) - for server runtime
  - Download from: https://bun.sh/
  - **Windows Users:** If the installer script fails, run this PowerShell command in the repository root:
    ```powershell
    $BunVersion = 'latest'; $BunInstallDir = "$HOME\.bun"; $BunBin = "$BunInstallDir\bin"; New-Item -ItemType Directory -Force -Path $BunBin | Out-Null; $ZipFile = "$BunBin\bun.zip"; Invoke-WebRequest -Uri "https://github.com/oven-sh/bun/releases/latest/download/bun-windows-x64.zip" -OutFile $ZipFile -UseBasicParsing; Expand-Archive -Path "$ZipFile" -DestinationPath $BunBin -Force; Move-Item -Path "$BunBin\bun-windows-x64\bun.exe" -Destination "$BunBin\bun.exe" -Force; Remove-Item "$BunBin\bun-windows-x64" -Recurse -Force; Remove-Item "$ZipFile" -Force; $env:Path = "$BunBin;$env:Path"; bun --version
    ```
  - Verify with: `bun --version`
  - **Note:** After installation, add `C:\Users\<YourUsername>\.bun\bin` to your Windows PATH for permanent access

## Project Dependencies

### Client Dependencies (React + Vite + Phaser)

Located in `client/package.json`:

**Core Dependencies:**
- `react@^19.2.0` - UI framework
- `react-dom@^19.2.0` - React DOM rendering
- `phaser@^3.90.0` - Game engine for 2D rendering

**Dev Dependencies:**
- `vite@^7.2.4` - Build tool and dev server
- `typescript@~5.9.3` - TypeScript compiler
- `@vitejs/plugin-react@^5.1.1` - React plugin for Vite
- `@types/react@^19.2.5` - React type definitions
- `@types/react-dom@^19.2.3` - React DOM type definitions
- `@types/node@^24.10.1` - Node.js type definitions
- `eslint@^9.39.1` - Code linting
- `@eslint/js@^9.39.1` - ESLint JavaScript configs
- `eslint-plugin-react-hooks@^7.0.1` - React hooks linting
- `eslint-plugin-react-refresh@^0.4.24` - React refresh linting
- `typescript-eslint@^8.46.4` - TypeScript ESLint support
- `globals@^16.5.0` - Global variable definitions

**To Install Client Dependencies:**
```bash
cd client
npm install
```

### Server Dependencies (Bun + WebSocket)

Located in `server/package.json`:

**Dev Dependencies:**
- `bun-types@latest` - Type definitions for Bun runtime APIs
- `typescript@^5.5.4` - TypeScript compiler

**To Install Server Dependencies:**
```bash
cd server
bun install
```

## Setup Instructions

### 1. Install System Requirements

**Node.js:**
- Download and install from https://nodejs.org/ (LTS recommended)
- Verify: Open a terminal and run `node --version` (should be v18+)

**Bun:**
- Try: `powershell -c "irm bun.sh/install.ps1 | iex"` from https://bun.sh/
- If that fails (missing curl.exe), use the PowerShell command provided above in System Requirements
- Verify: `bun --version` (should be v1.3.7+)
- **For permanent PATH access on Windows:** Add `C:\Users\<YourUsername>\.bun\bin` to your system PATH environment variable

### 2. Install Project Dependencies

Open a terminal in the repository root directory.

**Client:**
```bash
cd client
npm install
```

**Server:**
```bash
cd server
bun install
```

### 3. Run the Application

Open **two separate terminals** in the repository root.

**Terminal 1 - Start the server:**
```bash
cd server
bun run dev
```
Expected output: `Bun server listening on http://localhost:3001`

**Terminal 2 - Start the client:**
```bash
cd client
npm run dev
```
Expected output: Shows local dev server URL (typically `http://localhost:5173`)

**Open your browser** to the client URL shown in Terminal 2. You should see:
- A Phaser game canvas with a blue player square
- A chat overlay on the right
- "FLOOR: main-floor" label in the top-left corner
- The player can move with arrow keys

## Additional Assets Required

The following assets should be present in the project:

- **Tilesets:** `client/public/assets/tilesets/neumont/neumont_tileset_32.png` ✓
- **Maps:** `client/public/assets/maps/floors/` containing:
  - `main-floor.json` ✓
  - `basement-floor.json` ✓
  - `floor2.json` ✓
  - `floor3.json` ✓
- **Sprites:** (optional, folders exist but empty)
  - `client/public/assets/sprites/characters/`
  - `client/public/assets/sprites/npcs/`

## Environment Variables

**Client:**
- `VITE_WS_URL` (optional) - Override WebSocket URL (default: `ws://localhost:3001/ws`)

**Server:**
- `PORT` (optional) - Override server port (default: `3001`)

## Troubleshooting

### Bun Not Found / "bun is not recognized"
If you get this error after installation:

**Option 1: Set PATH for current session**
```powershell
$env:Path = "$HOME\.bun\bin;$env:Path"; bun --version
```

**Option 2: Add Bun to Windows PATH permanently**
1. Press `Win + X` → Select "System"
2. Click "Advanced system settings"
3. Click "Environment Variables"
4. Under "User variables", click "New"
5. Variable name: `PATH`
6. Variable value: `C:\Users\<YourUsername>\.bun\bin`
7. Click OK three times
8. Restart your terminal

**Option 3: Re-run the installation**
If Bun is not showing as installed, re-run the PowerShell command from the System Requirements section above.

### TypeScript Errors in VS Code (Server)
If you see TypeScript errors about `Bun` or `process` not found:

1. Verify server dependencies are installed:
   ```bash
   cd server
   bun install
   ```

2. Restart the TypeScript server:
   - Press `Ctrl + Shift + P` in VS Code
   - Type "Restart TypeScript Server"
   - Press Enter

### Client Won't Start
If `npm run dev` fails in the client directory:

1. Delete `node_modules` and `package-lock.json`:
   ```bash
   cd client
   rm -r node_modules package-lock.json
   npm install
   npm run dev
   ```

2. If that doesn't work, clear npm cache:
   ```bash
   npm cache clean --force
   cd client
   npm install
   npm run dev
   ```

### Server Won't Start
If `bun run dev` fails:

1. Verify Bun is installed: `bun --version`
2. Verify dependencies are installed:
   ```bash
   cd server
   bun install
   ```
3. Check if port 3001 is in use (try `netstat -ano | findstr :3001`)
4. Override port if needed:
   ```bash
   cd server
   $env:PORT=3002; bun run dev
   ```

### Game Won't Load / Shows Errors
If the game canvas is black or shows console errors:

1. **Check browser console:** Press `F12` to open Developer Tools → Console tab
2. **Verify server is running:** Open `http://localhost:3001` in your browser (should show "OK")
3. **Check map files exist:**
   ```
   client/public/assets/maps/floors/main-floor.json
   client/public/assets/tilesets/neumont/neumont_tileset_32.png
   ```
4. **Verify WebSocket connection:** Look for "Connected to ws://localhost:3001/ws" in the chat overlay

### WebSocket Connection Failed
If the chat overlay shows "closed" status:

1. Verify server is running on port 3001
2. Check firewall isn't blocking localhost connections
3. Verify `VITE_WS_URL` environment variable if customized
4. Try restarting both server and client
