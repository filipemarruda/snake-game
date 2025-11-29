"use strict";
class SnakeGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        // Set canvas size
        this.canvas.width = 400;
        this.canvas.height = 400;
        // Game settings
        this.gridSize = 20;
        this.snake = [
            { x: 200, y: 200 },
            { x: 180, y: 200 },
            { x: 160, y: 200 },
        ];
        this.food = { x: 300, y: 200 };
        this.dx = this.gridSize;
        this.dy = 0;
        this.score = 0;
        this.highScore = Number(localStorage.getItem('snakeHighScore')) || 0;
        this.gameInterval = null;
        this.isPaused = false;
        this.prevMouseX = null;
        this.prevMouseY = null;
        this.directionChangedThisTick = false;
        this.leaveDirection = '';
        this.mouseControlEnabled = false;
        this.enemies = [];
        this.enemySpawnCounter = 0;
        // Initialize UI elements
        this.scoreElement = document.getElementById('score');
        this.highScoreElement = document.getElementById('highScore');
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        // Set up event listeners
        this.setupEventListeners();
        // Update high score display
        this.highScoreElement.textContent = this.highScore.toString();
        // Mouse movement direction (listen on entire document)
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        // Mouse click to start/pause/restart
        document.addEventListener('click', this.handleMouseClick.bind(this));
        // Highlight canvas when mouse leaves browser area
        document.addEventListener('mouseleave', (event) => {
            this.canvas.classList.add('active');
            // Determine direction to move mouse back
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            if (event.clientX <= 0) {
                this.leaveDirection = 'right';
            }
            else if (event.clientX >= window.innerWidth - 1) {
                this.leaveDirection = 'left';
            }
            else if (event.clientY <= 0) {
                this.leaveDirection = 'down';
            }
            else if (event.clientY >= window.innerHeight - 1) {
                this.leaveDirection = 'up';
            }
        });
        document.addEventListener('mouseenter', () => {
            this.canvas.classList.remove('active');
            this.leaveDirection = '';
        });
        // Hide cursor for immersive gameplay
        document.body.style.cursor = 'none';
    }
    setupEventListeners() {
        document.addEventListener('keydown', this.handleKeyPress.bind(this));
        this.startBtn.addEventListener('click', () => {
            this.startGame();
            this.startBtn.blur();
        });
        this.pauseBtn.addEventListener('click', () => {
            this.togglePause();
            this.pauseBtn.blur();
        });
        // Mouse move handled in constructor
    }
    handleMouseMove(event) {
        if (!this.gameInterval || this.isPaused || !this.mouseControlEnabled)
            return;
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        if (this.prevMouseX === null || this.prevMouseY === null) {
            this.prevMouseX = mouseX;
            this.prevMouseY = mouseY;
            return;
        }
        const deltaX = mouseX - this.prevMouseX;
        const deltaY = mouseY - this.prevMouseY;
        // Ignore small movements
        if (Math.abs(deltaX) < 5 && Math.abs(deltaY) < 5)
            return;
        // Prevent multiple direction changes per game tick
        if (this.directionChangedThisTick)
            return;
        // Determine direction based on movement
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Horizontal move
            if (deltaX > 0 && this.dx === 0 && this.dy !== 0) {
                // Move right
                this.dx = this.gridSize;
                this.dy = 0;
                this.directionChangedThisTick = true;
            }
            else if (deltaX < 0 && this.dx === 0 && this.dy !== 0) {
                // Move left
                this.dx = -this.gridSize;
                this.dy = 0;
                this.directionChangedThisTick = true;
            }
        }
        else {
            // Vertical move
            if (deltaY > 0 && this.dy === 0 && this.dx !== 0) {
                // Move down
                this.dx = 0;
                this.dy = this.gridSize;
                this.directionChangedThisTick = true;
            }
            else if (deltaY < 0 && this.dy === 0 && this.dx !== 0) {
                // Move up
                this.dx = 0;
                this.dy = -this.gridSize;
                this.directionChangedThisTick = true;
            }
        }
        // Update previous position
        this.prevMouseX = mouseX;
        this.prevMouseY = mouseY;
    }
    handleMouseClick(event) {
        if (this.gameInterval && !this.isPaused) {
            // Game is running, pause it
            this.togglePause();
        }
        else {
            // Game is paused or not started, start/restart
            this.startGame();
        }
    }
    handleKeyPress(event) {
        switch (event.key) {
            case 'ArrowUp':
                if (this.gameInterval && this.dy === 0 && this.dx !== 0) {
                    this.dx = 0;
                    this.dy = -this.gridSize;
                }
                break;
            case 'ArrowDown':
                if (this.gameInterval && this.dy === 0 && this.dx !== 0) {
                    this.dx = 0;
                    this.dy = this.gridSize;
                }
                break;
            case 'ArrowLeft':
                if (this.gameInterval && this.dx === 0 && this.dy !== 0) {
                    this.dx = -this.gridSize;
                    this.dy = 0;
                }
                break;
            case 'ArrowRight':
                if (this.gameInterval && this.dx === 0 && this.dy !== 0) {
                    this.dx = this.gridSize;
                    this.dy = 0;
                }
                break;
            case ' ':
                if (!this.gameInterval) {
                    this.startGame();
                }
                else {
                    this.togglePause();
                }
                break;
            case 'm':
            case 'M':
                this.mouseControlEnabled = !this.mouseControlEnabled;
                break;
        }
    }
    startGame() {
        if (this.gameInterval) {
            clearInterval(this.gameInterval);
        }
        this.resetGame();
        this.gameInterval = window.setInterval(() => {
            if (!this.isPaused) {
                this.gameLoop();
            }
        }, 100);
        this.startBtn.textContent = 'Restart';
        this.pauseBtn.disabled = false;
        // Hide cursor during gameplay
        document.body.style.cursor = 'none';
    }
    togglePause() {
        this.isPaused = !this.isPaused;
        this.pauseBtn.textContent = this.isPaused ? 'Resume' : 'Pause';
        // Show/hide cursor based on pause state
        document.body.style.cursor = this.isPaused ? 'default' : 'none';
    }
    gameLoop() {
        this.directionChangedThisTick = false;
        this.clearCanvas();
        this.moveSnake();
        this.drawFood();
        this.drawSnake();
        this.updateEnemies();
        this.drawEnemies();
        // Draw indicator if mouse is outside browser
        if (this.canvas.classList.contains('active')) {
            this.drawMouseIndicator();
        }
        // Spawn enemies
        this.enemySpawnCounter++;
        const spawnThreshold = Math.max(50, 200 - Math.floor(this.score / 10)); // more enemies as score increases
        if (this.enemySpawnCounter >= spawnThreshold) {
            this.spawnEnemy();
            this.enemySpawnCounter = 0;
        }
        if (this.checkCollision()) {
            this.handleGameOver();
        }
    }
    clearCanvas() {
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    drawSnake() {
        this.ctx.fillStyle = '#2ecc71';
        this.snake.forEach((segment, index) => {
            this.ctx.fillRect(segment.x, segment.y, this.gridSize - 2, this.gridSize - 2);
            // Draw eyes on the head
            if (index === 0) {
                this.ctx.fillStyle = '#000';
                const eyeSize = 4;
                if (this.dx > 0) {
                    this.ctx.fillRect(segment.x + 12, segment.y + 4, eyeSize, eyeSize);
                    this.ctx.fillRect(segment.x + 12, segment.y + 12, eyeSize, eyeSize);
                }
                else if (this.dx < 0) {
                    this.ctx.fillRect(segment.x + 4, segment.y + 4, eyeSize, eyeSize);
                    this.ctx.fillRect(segment.x + 4, segment.y + 12, eyeSize, eyeSize);
                }
                else if (this.dy > 0) {
                    this.ctx.fillRect(segment.x + 4, segment.y + 12, eyeSize, eyeSize);
                    this.ctx.fillRect(segment.x + 12, segment.y + 12, eyeSize, eyeSize);
                }
                else {
                    this.ctx.fillRect(segment.x + 4, segment.y + 4, eyeSize, eyeSize);
                    this.ctx.fillRect(segment.x + 12, segment.y + 4, eyeSize, eyeSize);
                }
            }
        });
    }
    drawFood() {
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.beginPath();
        this.ctx.arc(this.food.x + this.gridSize / 2, this.food.y + this.gridSize / 2, this.gridSize / 2 - 2, 0, Math.PI * 2);
        this.ctx.fill();
    }
    drawMouseIndicator() {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Move mouse here', this.canvas.width / 2, this.canvas.height / 2 - 50);
        // Draw arrow based on leave direction (inverted)
        this.ctx.fillStyle = '#fff';
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        this.ctx.beginPath();
        if (this.leaveDirection === 'right') {
            // Arrow pointing left (inverted)
            this.ctx.moveTo(centerX + 20, centerY);
            this.ctx.lineTo(centerX - 10, centerY - 10);
            this.ctx.lineTo(centerX - 10, centerY + 10);
        }
        else if (this.leaveDirection === 'left') {
            // Arrow pointing right (inverted)
            this.ctx.moveTo(centerX - 20, centerY);
            this.ctx.lineTo(centerX + 10, centerY - 10);
            this.ctx.lineTo(centerX + 10, centerY + 10);
        }
        else if (this.leaveDirection === 'down') {
            // Arrow pointing up (inverted)
            this.ctx.moveTo(centerX, centerY + 20);
            this.ctx.lineTo(centerX - 10, centerY - 10);
            this.ctx.lineTo(centerX + 10, centerY - 10);
        }
        else if (this.leaveDirection === 'up') {
            // Arrow pointing down (inverted)
            this.ctx.moveTo(centerX, centerY - 20);
            this.ctx.lineTo(centerX - 10, centerY + 10);
            this.ctx.lineTo(centerX + 10, centerY + 10);
        }
        this.ctx.closePath();
        this.ctx.fill();
    }
    updateEnemies() {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            this.enemies[i].opacity -= 0.01;
            if (this.enemies[i].opacity <= 0) {
                this.enemies.splice(i, 1);
            }
        }
    }
    drawEnemies() {
        for (const enemy of this.enemies) {
            this.drawSkull(enemy.x, enemy.y, enemy.opacity);
        }
    }
    drawSkull(x, y, opacity) {
        this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        this.ctx.strokeStyle = `rgba(0, 0, 0, ${opacity})`;
        this.ctx.lineWidth = 1;
        // Head
        this.ctx.beginPath();
        this.ctx.arc(x + this.gridSize / 2, y + this.gridSize / 2, this.gridSize / 2 - 2, 0, Math.PI * 2);
        this.ctx.fill();
        // Eyes
        this.ctx.beginPath();
        this.ctx.arc(x + this.gridSize / 2 - 4, y + this.gridSize / 2 - 3, 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(x + this.gridSize / 2 + 4, y + this.gridSize / 2 - 3, 2, 0, Math.PI * 2);
        this.ctx.fill();
        // Mouth (teeth)
        this.ctx.strokeRect(x + this.gridSize / 2 - 3, y + this.gridSize / 2 + 2, 2, 3);
        this.ctx.strokeRect(x + this.gridSize / 2 - 1, y + this.gridSize / 2 + 2, 2, 3);
        this.ctx.strokeRect(x + this.gridSize / 2 + 1, y + this.gridSize / 2 + 2, 2, 3);
    }
    spawnEnemy() {
        const generatePosition = () => ({
            x: Math.floor(Math.random() * (this.canvas.width / this.gridSize)) * this.gridSize,
            y: Math.floor(Math.random() * (this.canvas.height / this.gridSize)) * this.gridSize
        });
        let pos;
        do {
            pos = generatePosition();
        } while (this.snake.some(segment => segment.x === pos.x && segment.y === pos.y) ||
            (this.food.x === pos.x && this.food.y === pos.y) ||
            this.enemies.some(enemy => enemy.x === pos.x && enemy.y === pos.y));
        this.enemies.push({ x: pos.x, y: pos.y, opacity: 1 });
    }
    moveSnake() {
        let newX = this.snake[0].x + this.dx;
        let newY = this.snake[0].y + this.dy;
        // Wrap around horizontally
        if (newX < 0)
            newX = this.canvas.width - this.gridSize;
        if (newX >= this.canvas.width)
            newX = 0;
        // Wrap around vertically
        if (newY < 0)
            newY = this.canvas.height - this.gridSize;
        if (newY >= this.canvas.height)
            newY = 0;
        const head = { x: newX, y: newY };
        this.snake.unshift(head);
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            this.scoreElement.textContent = this.score.toString();
            this.generateFood();
        }
        else {
            this.snake.pop();
        }
    }
    generateFood() {
        const generatePosition = () => ({
            x: Math.floor(Math.random() * (this.canvas.width / this.gridSize)) * this.gridSize,
            y: Math.floor(Math.random() * (this.canvas.height / this.gridSize)) * this.gridSize
        });
        let newFood;
        do {
            newFood = generatePosition();
        } while (this.snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
        this.food = newFood;
    }
    checkCollision() {
        const head = this.snake[0];
        // Check self collision
        if (this.snake.slice(1).some(segment => segment.x === head.x && segment.y === head.y)) {
            return true;
        }
        // Check enemy collision
        return this.enemies.some(enemy => enemy.x === head.x && enemy.y === head.y);
    }
    handleGameOver() {
        if (this.gameInterval) {
            clearInterval(this.gameInterval);
            this.gameInterval = null;
        }
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('snakeHighScore', this.highScore.toString());
            this.highScoreElement.textContent = this.highScore.toString();
        }
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '30px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Game Over!', this.canvas.width / 2, this.canvas.height / 2 - 20);
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
        this.startBtn.textContent = 'Play Again';
        this.pauseBtn.disabled = true;
        // Show cursor on game over
        document.body.style.cursor = 'default';
    }
    resetGame() {
        this.snake = [
            { x: 200, y: 200 },
            { x: 180, y: 200 },
            { x: 160, y: 200 },
        ];
        this.dx = this.gridSize;
        this.dy = 0;
        this.score = 0;
        this.scoreElement.textContent = '0';
        this.isPaused = false;
        this.pauseBtn.textContent = 'Pause';
        this.prevMouseX = null;
        this.prevMouseY = null;
        this.directionChangedThisTick = false;
        this.leaveDirection = '';
        this.enemies = [];
        this.enemySpawnCounter = 0;
        this.generateFood();
    }
}
// Initialize game when the page loads
window.addEventListener('load', () => {
    new SnakeGame();
});
