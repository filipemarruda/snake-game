import express from 'express';
import path from 'path';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import SnakeGameServer from './gameServer.js';
import pino from 'pino';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDevelopment = process.env.NODE_ENV !== 'production';
const logger = pino(
    {
        level: isDevelopment ? 'debug' : 'error',
    },
    isDevelopment ? pino.transport({ target: 'pino-pretty', options: { colorize: true, singleLine: true } }) : undefined
);

const app = express();
const server = createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;
const prisma = new PrismaClient();

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// API route for top scores
app.get('/api/top-scores', async (req, res) => {
    try {
        const topUsers = await prisma.user.findMany({
            orderBy: { highScore: 'desc' },
            take: 10,
            select: { username: true, highScore: true },
        });
        res.json(topUsers);
    } catch (error) {
        logger.error({ error }, 'Error fetching top scores');
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Game instances per socket
const games = new Map<string, SnakeGameServer>();
const userData = new Map<string, { name: string; highScore: number }>();
// Track score updates to batch database operations
const scoreUpdates = new Map<string, { username: string; score: number; timestamp: number }>();

interface GameState {
    snake: { x: number; y: number }[];
    food: { x: number; y: number };
    enemies: { x: number; y: number; opacity: number }[];
    score: number;
    gameOver: boolean;
    isPaused: boolean;
    highScore: number;
}

io.on('connection', (socket: Socket) => {
    logger.debug({ socketId: socket.id }, 'User connected');

    // Handle user name
    socket.on('setUserName', async (name: string) => {
        try {
            const user = await prisma.user.upsert({
                where: { username: name },
                update: {},
                create: { username: name },
            });
            userData.set(socket.id, { name, highScore: user.highScore });
            logger.debug({ socketId: socket.id, username: name, highScore: user.highScore }, 'User name set');
        } catch (error) {
            logger.error({ error, socketId: socket.id }, 'Error setting user name');
        }
    });

    // Create a new game instance for this client
    const game = new SnakeGameServer();
    games.set(socket.id, game);
    logger.debug({ socketId: socket.id }, 'Game instance created');

    // Send initial game state
    socket.emit('gameState', { ...game.getGameState(), highScore: 0 });

    // Handle direction change
    socket.on('changeDirection', (direction: string) => {
        const game = games.get(socket.id);
        if (game) {
            let dx = 0, dy = 0;
            switch (direction) {
                case 'up':
                    dy = -game.gridSize;
                    break;
                case 'down':
                    dy = game.gridSize;
                    break;
                case 'left':
                    dx = -game.gridSize;
                    break;
                case 'right':
                    dx = game.gridSize;
                    break;
            }
            game.setDirection(dx, dy);
        }
    });

    // Handle start game
    socket.on('startGame', () => {
        const game = games.get(socket.id);
        if (game) {
            game.startGame();
            const data = userData.get(socket.id);
            const highScore = data ? data.highScore : 0;
            socket.emit('gameState', { ...game.getGameState(), highScore });
        }
    });

    // Handle toggle pause
    socket.on('togglePause', () => {
        const game = games.get(socket.id);
        if (game) {
            game.togglePause();
            logger.debug({ socketId: socket.id, isPaused: game['isPaused'] }, 'Game paused toggled');
            const data = userData.get(socket.id);
            const highScore = data ? data.highScore : 0;
            socket.emit('gameState', { ...game.getGameState(), highScore });
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        logger.debug({ socketId: socket.id }, 'User disconnected');
        games.delete(socket.id);
        userData.delete(socket.id);
    });
});

// Game loop running on server - optimized with batched updates
setInterval(async () => {
    // Update game states
    for (const [socketId, game] of games) {
        game.gameLoop();
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
            const state = game.getGameState();
            const data = userData.get(socketId);
            const highScore = data ? data.highScore : 0;
            const fullState = { ...state, highScore };
            socket.emit('gameState', fullState);

            // Batch high score updates: only update if score changed significantly
            if (data && state.score > data.highScore) {
                const updateKey = socketId;
                const lastUpdate = scoreUpdates.get(updateKey);
                const now = Date.now();
                
                // Update in batches every 2 seconds or on significant score jumps
                if (!lastUpdate || now - lastUpdate.timestamp > 2000 || state.score - lastUpdate.score > 50) {
                    scoreUpdates.set(updateKey, { username: data.name, score: state.score, timestamp: now });
                }
            }
        }
    }

    // Batch database operations every 2 seconds
    if (scoreUpdates.size > 0) {
        const updates = Array.from(scoreUpdates.values());
        scoreUpdates.clear();
        
        // Execute all updates in parallel
        try {
            await Promise.all(
                updates.map(update =>
                    prisma.user.update({
                        where: { username: update.username },
                        data: { highScore: update.score },
                    })
                )
            );
        } catch (error) {
            logger.error({ error }, 'Batch score update failed');
            // Re-add failed updates for retry
            updates.forEach(u => {
                scoreUpdates.set(u.username, { ...u, timestamp: Date.now() });
            });
        }
    }
}, 150); // 150ms interval - slower game speed for better mobile gameplay

// Start server
server.listen(port, () => {
  logger.info(`Server running at http://localhost:${port}`);
});