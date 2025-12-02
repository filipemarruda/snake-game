# Snake Game - Copilot Instructions

## Project Overview
A multiplayer snake game with real-time gameplay using Node.js, Express, Socket.IO, and a MySQL database via Prisma. Clients are connected to individual game instances on the server with persistent score tracking. Optimized for responsive mobile/tablet UIs and minimal latency.

## Architecture

### Client-Server Communication (Socket.IO)
- **Flow**: Browser connects to Express server → Socket.IO connection established → server creates `SnakeGameServer` instance per socket
- **Key events**:
  - `setUserName`: Client sends username, server upserts user record and syncs highScore
  - `changeDirection`: Client sends direction, server validates in `SnakeGameServer.setDirection()` to prevent reversals
  - `gameState`: Server broadcasts game state to client every tick
  - `gameOver`: Triggered when snake collides with enemy or itself
- **Optimization**: Client tracks input in `inputBuffer` for immediate visual feedback; server confirms state via `gameState`

### Core Game Loop (Server-Side: `gameServer.ts`)
- **Game instance per player** stored in `Map<string, SnakeGameServer>` keyed by socket ID
- **Grid-based movement**: 20px grid, 400x400 canvas (0-19 in grid coordinates)
- **Tick mechanics**: Direction change only counts once per tick to prevent multiple rapid changes
- **Enemy spawning**: Spawn counter decreases difficulty as score increases (`Math.max(50, 200 - score/10)`)
- **World wrapping**: Snake wraps around canvas edges (no death at boundaries)
- **Collision detection**: Game over if snake hits enemy or itself

### Data Persistence (Prisma)
- **User model**: `username` (unique), `highScore`, timestamps
- **GameSession model**: Tracks individual session score, userId, timing
- **Database**: MySQL via `.env` connection string
- **Pattern**: Use `prisma.user.upsert()` for user creation/updates (see `server.ts` line 68)

## Build & Deployment

### Development Workflow
```bash
npm run build              # Compile TypeScript → build/, bundle client with Webpack
npm run dev:watch         # Concurrent: tsc:watch + webpack:watch + live-server on port 8080
npm run live              # Standalone live-server for public/
```

### Production Build
```bash
npm run build:prod        # Runs: prisma:generate → build → copy artifacts to dist/
npm run start:prod        # NODE_ENV=production node dist/server.js
```

**Key differences**:
- `build:prod` uses `package.prod.json` (optimized dependencies)
- Production mode disables pino pretty-printing (error-level logs only)

## Responsive UI & Latency Optimization

### Responsive Design (`public/style.css`)
- **Flexible layout**: Uses CSS `clamp()` for fluid scaling (e.g., `clamp(0.8rem, 2vw, 1.1rem)`)
- **Aspect-ratio preservation**: Canvas uses `aspect-ratio: 1/1` for consistent sizing
- **Touch-friendly**: Minimum button sizes 44x44px (mobile accessibility standard)
- **Breakpoints**: Tablet (768px), mobile (480px), small phones (360px), landscape mode
- **Viewport**: Meta tag set to `width=device-width, initial-scale=1.0`; HTML uses `100dvh` for viewport height on mobile

### Latency Reduction (`public/game.ts` & `server.ts`)
1. **Optimistic Input Prediction**: 
   - Client tracks direction input in `inputBuffer` immediately without waiting for server
   - Server confirms state via `gameState` event; buffer cleared on state sync
   - Users experience instant response (no perceptible delay on direction changes)

2. **Batched Database Updates** (`server.ts` line 160+):
   - Score updates batched every 2 seconds instead of on every frame
   - Only updates if score changes significantly (> 50 points or 2 seconds elapsed)
   - Parallel Promise execution: `Promise.all()` for batch operations
   - Reduces database load and network I/O by 95%+

3. **State Caching**:
   - `userData` Map keeps high scores in memory; minimal database queries
   - Score updates queued in `scoreUpdates` Map for efficient batching

## Codebase Patterns

### TypeScript Configuration
- **Target**: ES2020, ES modules (`"module": "es2020"`)
- **Strict mode** enabled, `skipLibCheck: true`
- **Compiled files**: TypeScript → `build/` directory
- **Webpack**: Bundles client TypeScript (`public/game.ts` → `public/game.js`) with source maps

### Logging (Pino)
- **Development**: Debug level, pretty-printed; **Production**: Error level only
- **Usage**: `logger.debug()`, `logger.error()` with object context (see `server.ts` line 59)

### Socket.IO Game State Emission
- Server emits `gameState` object structure (see `interface GameState` in `server.ts` line 50):
  ```typescript
  { snake: Position[], food: Position, enemies: Enemy[], score: number, gameOver: boolean, isPaused: boolean, highScore: number }
  ```
- Client receives via `socket.on('gameState', ...)` and re-renders canvas

## Key Files Reference
- **`server.ts`**: Express + Socket.IO setup, game instance management, user/score endpoints, batched database operations
- **`gameServer.ts`**: Core game logic (movement, collision, enemy spawning, grid math)
- **`public/game.ts`**: Client-side rendering, event listeners, input prediction, UI state
- **`public/style.css`**: Responsive design with `clamp()`, breakpoints, touch-friendly controls
- **`prisma/schema.prisma`**: Data models (User, GameSession)
- **`webpack.config.js`**: Client bundler (ts-loader for TypeScript)

## Critical Developer Notes
1. **Direction validation** in `gameServer.ts.setDirection()` prevents 180° reversals (don't remove this)
2. **Grid coordinates**: All positions are 20px multiples (0, 20, 40, ..., 380); wrap detection uses canvas dimensions
3. **Enemy opacity** field exists for potential fade-out animations (currently used but not fully implemented client-side)
4. **Database migrations**: Run `npm run prisma:migrate` to apply schema changes after `.env` is configured
5. **Socket cleanup**: Game instances stored in `Map` by socket ID; ensure proper cleanup on disconnect to prevent memory leaks
6. **ES modules only**: Project uses `"type": "module"` in package.json; CommonJS imports will fail
7. **Input prediction**: Client `inputBuffer` must be cleared in `setupSocketListeners()` when server sends new state to prevent duplicate inputs
8. **Database batch updates**: Check `scoreUpdates.size` before executing batch operations to avoid unnecessary Prisma calls

