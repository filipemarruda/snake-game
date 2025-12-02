/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/*!************************!*\
  !*** ./public/game.ts ***!
  \************************/

class SnakeGameClient {
    constructor() {
        this.pauseDebounce = false;
        // Optimistic prediction
        this.lastLocalState = null;
        this.inputBuffer = [];
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        // Set canvas size
        this.canvas.width = 400;
        this.canvas.height = 400;
        // Game settings
        this.gridSize = 20;
        // Initialize UI elements
        this.scoreElement = document.getElementById('score');
        this.highScoreElement = document.getElementById('highScore');
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.userNameElement = document.getElementById('userName');
        this.switchUserBtn = document.getElementById('switchUserBtn');
        this.nameModal = document.getElementById('nameModal');
        this.nameInput = document.getElementById('nameInput');
        this.submitNameBtn = document.getElementById('submitNameBtn');
        this.topScoresBtn = document.getElementById('topScoresBtn');
        this.topScoresModal = document.getElementById('topScoresModal');
        this.scoresList = document.getElementById('scoresList');
        this.closeScoresBtn = document.getElementById('closeScoresBtn');
        this.upBtn = document.getElementById('upBtn');
        this.downBtn = document.getElementById('downBtn');
        this.leftBtn = document.getElementById('leftBtn');
        this.rightBtn = document.getElementById('rightBtn');
        this.upLeftBtn = document.getElementById('upLeftBtn');
        this.upRightBtn = document.getElementById('upRightBtn');
        this.downLeftBtn = document.getElementById('downLeftBtn');
        this.downRightBtn = document.getElementById('downRightBtn');
        // Set up event listeners once
        this.setupEventListeners();
        // Load user name
        this.userName = localStorage.getItem('snakeUserName') || '';
        if (this.userName) {
            this.initializeGame();
        }
        else {
            this.showNameModal();
        }
    }
    showNameModal() {
        this.nameModal.classList.add('show');
        this.nameInput.focus();
        this.submitNameBtn.addEventListener('click', () => {
            this.setUserName();
        });
        this.nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.setUserName();
            }
        });
    }
    setUserName() {
        const name = this.nameInput.value.trim();
        if (name) {
            this.userName = name;
            localStorage.setItem('snakeUserName', this.userName);
            this.nameModal.classList.remove('show');
            // Always initialize/reinitialize the game
            this.initializeGame();
        }
    }
    initializeGame() {
        // Display user name
        this.userNameElement.textContent = this.userName;
        // Connect to server
        this.socket = io();
        this.socket.emit('setUserName', this.userName);
        this.setupSocketListeners();
    }
    setupSocketListeners() {
        this.socket.on('gameState', (state) => {
            this.lastLocalState = state;
            this.inputBuffer = [];
            this.render(state);
        });
    }
    setupEventListeners() {
        document.addEventListener('keydown', this.handleKeyPress.bind(this));
        this.startBtn.addEventListener('click', () => {
            this.socket.emit('startGame');
            this.startBtn.blur();
        });
        this.pauseBtn.addEventListener('click', () => {
            if (this.pauseDebounce) {
                return;
            }
            this.pauseDebounce = true;
            this.socket.emit('togglePause');
            this.pauseBtn.blur();
            setTimeout(() => {
                this.pauseDebounce = false;
            }, 300);
        });
        this.switchUserBtn.addEventListener('click', () => {
            this.switchUser();
        });
        this.topScoresBtn.addEventListener('click', () => {
            this.showTopScores();
        });
        this.closeScoresBtn.addEventListener('click', () => {
            this.topScoresModal.classList.remove('show');
        });
        // Joystick buttons
        this.upBtn.addEventListener('click', () => {
            this.inputBuffer.push({ direction: 'up', timestamp: Date.now() });
            this.socket.emit('changeDirection', 'up');
            this.upBtn.blur();
        });
        this.downBtn.addEventListener('click', () => {
            this.inputBuffer.push({ direction: 'down', timestamp: Date.now() });
            this.socket.emit('changeDirection', 'down');
            this.downBtn.blur();
        });
        this.leftBtn.addEventListener('click', () => {
            this.inputBuffer.push({ direction: 'left', timestamp: Date.now() });
            this.socket.emit('changeDirection', 'left');
            this.leftBtn.blur();
        });
        this.rightBtn.addEventListener('click', () => {
            this.inputBuffer.push({ direction: 'right', timestamp: Date.now() });
            this.socket.emit('changeDirection', 'right');
            this.rightBtn.blur();
        });
        // Diagonal buttons - smart direction selection
        this.upLeftBtn.addEventListener('click', () => {
            this.handleDiagonalDirection('up', 'left');
            this.upLeftBtn.blur();
        });
        this.upRightBtn.addEventListener('click', () => {
            this.handleDiagonalDirection('up', 'right');
            this.upRightBtn.blur();
        });
        this.downLeftBtn.addEventListener('click', () => {
            this.handleDiagonalDirection('down', 'left');
            this.downLeftBtn.blur();
        });
        this.downRightBtn.addEventListener('click', () => {
            this.handleDiagonalDirection('down', 'right');
            this.downRightBtn.blur();
        });
    }
    handleDiagonalDirection(vertical, horizontal) {
        // Smart logic: if moving horizontally, turn vertical; if moving vertically, turn horizontal
        if (this.lastLocalState && this.lastLocalState.snake && this.lastLocalState.snake.length > 1) {
            const head = this.lastLocalState.snake[0];
            const neck = this.lastLocalState.snake[1];
            const isMovingHorizontally = head.x !== neck.x;
            const isMovingVertically = head.y !== neck.y;
            const direction = isMovingHorizontally ? vertical : horizontal;
            this.inputBuffer.push({ direction, timestamp: Date.now() });
            this.socket.emit('changeDirection', direction);
        }
    }
    switchUser() {
        // Reload the page for a complete clean slate
        localStorage.removeItem('snakeUserName');
        window.location.reload();
    }
    handleKeyPress(event) {
        if (event.key === ' ') {
            event.preventDefault();
            if (this.pauseDebounce) {
                return;
            }
            this.pauseDebounce = true;
            this.socket.emit('togglePause');
            setTimeout(() => {
                this.pauseDebounce = false;
            }, 300);
            return;
        }
        let direction = null;
        switch (event.key) {
            case 'ArrowUp':
                direction = 'up';
                break;
            case 'ArrowDown':
                direction = 'down';
                break;
            case 'ArrowLeft':
                direction = 'left';
                break;
            case 'ArrowRight':
                direction = 'right';
                break;
        }
        if (direction) {
            // Immediate feedback: track input locally
            this.inputBuffer.push({ direction, timestamp: Date.now() });
            this.socket.emit('changeDirection', direction);
        }
    }
    render(state) {
        this.clearCanvas();
        this.drawSnake(state.snake);
        this.drawFood(state.food);
        this.drawEnemies(state.enemies);
        this.scoreElement.textContent = state.score.toString();
        this.highScoreElement.textContent = state.highScore.toString();
        if (state.gameOver) {
            this.drawGameOver(state.score);
            this.startBtn.textContent = 'Play Again';
            this.pauseBtn.disabled = true;
        }
        else {
            this.startBtn.textContent = 'Restart';
            this.pauseBtn.disabled = false;
        }
        if (state.isPaused) {
            this.drawPauseOverlay();
            this.pauseBtn.textContent = 'Resume';
        }
        else {
            this.pauseBtn.textContent = 'Pause';
        }
    }
    clearCanvas() {
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    drawSnake(snake) {
        this.ctx.fillStyle = '#2ecc71';
        snake.forEach((segment, index) => {
            this.ctx.fillRect(segment.x, segment.y, this.gridSize - 2, this.gridSize - 2);
            // Draw eyes on the head
            if (index === 0) {
                this.ctx.fillStyle = '#000';
                const eyeSize = 4;
                // Simplified eye drawing - assuming right direction for now
                this.ctx.fillRect(segment.x + 12, segment.y + 4, eyeSize, eyeSize);
                this.ctx.fillRect(segment.x + 12, segment.y + 12, eyeSize, eyeSize);
            }
        });
    }
    drawFood(food) {
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.beginPath();
        this.ctx.arc(food.x + this.gridSize / 2, food.y + this.gridSize / 2, this.gridSize / 2 - 2, 0, Math.PI * 2);
        this.ctx.fill();
    }
    drawEnemies(enemies) {
        enemies.forEach(enemy => {
            this.drawSkull(enemy.x, enemy.y, enemy.opacity);
        });
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
    drawGameOver(score) {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '30px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Game Over!', this.canvas.width / 2, this.canvas.height / 2 - 20);
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`Score: ${score}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
    }
    drawPauseOverlay() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 40px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2);
    }
    showTopScores() {
        fetch('/api/top-scores')
            .then(response => response.json())
            .then(data => {
            this.scoresList.innerHTML = '';
            data.forEach((user, index) => {
                const scoreItem = document.createElement('div');
                scoreItem.className = 'score-item';
                scoreItem.textContent = `${index + 1}. ${user.username}: ${user.highScore}`;
                this.scoresList.appendChild(scoreItem);
            });
            this.topScoresModal.classList.add('show');
        })
            .catch(error => {
            console.error('Error fetching top scores:', error);
            alert('Error loading top scores');
        });
    }
}
// Initialize game when the page loads
window.addEventListener('load', () => {
    new SnakeGameClient();
});

/******/ })()
;
//# sourceMappingURL=game.js.map