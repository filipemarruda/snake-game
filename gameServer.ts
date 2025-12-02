interface Position {
    x: number;
    y: number;
}

interface Enemy extends Position {
    opacity: number;
}

interface GameState {
    snake: Position[];
    food: Position;
    enemies: Enemy[];
    score: number;
    gameOver: boolean;
    isPaused: boolean;
}

class SnakeGameServer {
    gridSize: number;
    canvasWidth: number;
    canvasHeight: number;
    snake!: Position[];
    food!: Position;
    dx!: number;
    dy!: number;
    score!: number;
    isPaused!: boolean;
    directionChangedThisTick!: boolean;
    enemies!: Enemy[];
    enemySpawnCounter!: number;
    gameOver!: boolean;

    constructor() {
        this.gridSize = 20;
        this.canvasWidth = 400;
        this.canvasHeight = 400;
        this.resetGame();
    }

    resetGame(): void {
        this.snake = [
            { x: 200, y: 200 },
            { x: 180, y: 200 },
            { x: 160, y: 200 },
        ];
        this.food = { x: 300, y: 200 };
        this.dx = this.gridSize;
        this.dy = 0;
        this.score = 0;
        this.isPaused = false;
        this.directionChangedThisTick = false;
        this.enemies = [];
        this.enemySpawnCounter = 0;
        this.gameOver = false;
        this.generateFood();
    }

    setDirection(dx: number, dy: number): void {
        if (this.directionChangedThisTick) return;
        // Prevent reversing into self
        if ((dx > 0 && this.dx < 0) || (dx < 0 && this.dx > 0) ||
            (dy > 0 && this.dy < 0) || (dy < 0 && this.dy > 0)) return;
        this.dx = dx;
        this.dy = dy;
        this.directionChangedThisTick = true;
    }

    gameLoop(): void {
        if (this.isPaused || this.gameOver) return;

        this.directionChangedThisTick = false;
        this.moveSnake();
        this.updateEnemies();

        // Spawn enemies
        this.enemySpawnCounter++;
        const spawnThreshold = Math.max(50, 200 - Math.floor(this.score / 10));
        if (this.enemySpawnCounter >= spawnThreshold) {
            this.spawnEnemy();
            this.enemySpawnCounter = 0;
        }

        if (this.checkCollision()) {
            this.gameOver = true;
        }
    }

    moveSnake(): void {
        let newX = this.snake[0].x + this.dx;
        let newY = this.snake[0].y + this.dy;

        // Wrap around horizontally
        if (newX < 0) newX = this.canvasWidth - this.gridSize;
        if (newX >= this.canvasWidth) newX = 0;

        // Wrap around vertically
        if (newY < 0) newY = this.canvasHeight - this.gridSize;
        if (newY >= this.canvasHeight) newY = 0;

        const head: Position = { x: newX, y: newY };
        this.snake.unshift(head);

        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            this.generateFood();
        } else {
            this.snake.pop();
        }
    }

    generateFood(): void {
        const generatePosition = (): Position => ({
            x: Math.floor(Math.random() * (this.canvasWidth / this.gridSize)) * this.gridSize,
            y: Math.floor(Math.random() * (this.canvasHeight / this.gridSize)) * this.gridSize
        });

        let newFood: Position;
        do {
            newFood = generatePosition();
        } while (this.snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));

        this.food = newFood;
    }

    updateEnemies(): void {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            this.enemies[i].opacity -= 0.01;
            if (this.enemies[i].opacity <= 0) {
                this.enemies.splice(i, 1);
            }
        }
    }

    spawnEnemy(): void {
        const generatePosition = (): Position => ({
            x: Math.floor(Math.random() * (this.canvasWidth / this.gridSize)) * this.gridSize,
            y: Math.floor(Math.random() * (this.canvasHeight / this.gridSize)) * this.gridSize
        });

        let pos: Position;
        do {
            pos = generatePosition();
        } while (this.snake.some(segment => segment.x === pos.x && segment.y === pos.y) ||
                 (this.food.x === pos.x && this.food.y === pos.y) ||
                 this.enemies.some(enemy => enemy.x === pos.x && enemy.y === pos.y));

        this.enemies.push({ x: pos.x, y: pos.y, opacity: 1 });
    }

    checkCollision(): boolean {
        const head = this.snake[0];
        // Check self collision
        if (this.snake.slice(1).some(segment => segment.x === head.x && segment.y === head.y)) {
            return true;
        }
        // Check enemy collision
        return this.enemies.some(enemy => enemy.x === head.x && enemy.y === head.y);
    }

    startGame(): void {
        this.resetGame();
    }

    togglePause(): void {
        this.isPaused = !this.isPaused;
        console.log('Game paused toggled to:', this.isPaused);
    }

    getGameState(): GameState {
        return {
            snake: this.snake,
            food: this.food,
            enemies: this.enemies,
            score: this.score,
            gameOver: this.gameOver,
            isPaused: this.isPaused,
        };
    }
}

export default SnakeGameServer;