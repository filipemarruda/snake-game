var SnakeGame = /** @class */ (function () {
    function SnakeGame() {
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
        // Initialize UI elements
        this.scoreElement = document.getElementById('score');
        this.highScoreElement = document.getElementById('highScore');
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        // Set up event listeners
        this.setupEventListeners();
        // Update high score display
        this.highScoreElement.textContent = this.highScore.toString();
        // Mouse movement direction
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    }
    SnakeGame.prototype.setupEventListeners = function () {
        var _this = this;
        document.addEventListener('keydown', this.handleKeyPress.bind(this));
        this.startBtn.addEventListener('click', function () {
            _this.startGame();
            _this.startBtn.blur();
        });
        this.pauseBtn.addEventListener('click', function () {
            _this.togglePause();
            _this.pauseBtn.blur();
        });
        // Mouse move handled in constructor
    };
    SnakeGame.prototype.handleMouseMove = function (event) {
        if (!this.gameInterval || this.isPaused)
            return;
        var rect = this.canvas.getBoundingClientRect();
        var mouseX = event.clientX - rect.left;
        var mouseY = event.clientY - rect.top;
        var head = this.snake[0];
        // Center of the head
        var headCenterX = head.x + this.gridSize / 2;
        var headCenterY = head.y + this.gridSize / 2;
        var dx = mouseX - headCenterX;
        var dy = mouseY - headCenterY;
        // Ignore if mouse is very close to head
        if (Math.abs(dx) < 2 && Math.abs(dy) < 2)
            return;
        // Determine direction
        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal move
            if (dx > 0 && this.dx === 0 && this.dy !== 0) {
                // Move right
                this.dx = this.gridSize;
                this.dy = 0;
            }
            else if (dx < 0 && this.dx === 0 && this.dy !== 0) {
                // Move left
                this.dx = -this.gridSize;
                this.dy = 0;
            }
        }
        else {
            // Vertical move
            if (dy > 0 && this.dy === 0 && this.dx !== 0) {
                // Move down
                this.dx = 0;
                this.dy = this.gridSize;
            }
            else if (dy < 0 && this.dy === 0 && this.dx !== 0) {
                // Move up
                this.dx = 0;
                this.dy = -this.gridSize;
            }
        }
    };
    SnakeGame.prototype.handleKeyPress = function (event) {
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
        }
    };
    SnakeGame.prototype.startGame = function () {
        var _this = this;
        if (this.gameInterval) {
            clearInterval(this.gameInterval);
        }
        this.resetGame();
        this.gameInterval = window.setInterval(function () {
            if (!_this.isPaused) {
                _this.gameLoop();
            }
        }, 100);
        this.startBtn.textContent = 'Restart';
        this.pauseBtn.disabled = false;
    };
    SnakeGame.prototype.togglePause = function () {
        this.isPaused = !this.isPaused;
        this.pauseBtn.textContent = this.isPaused ? 'Resume' : 'Pause';
    };
    SnakeGame.prototype.gameLoop = function () {
        this.clearCanvas();
        this.moveSnake();
        this.drawFood();
        this.drawSnake();
        if (this.checkCollision()) {
            this.handleGameOver();
        }
    };
    SnakeGame.prototype.clearCanvas = function () {
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    };
    SnakeGame.prototype.drawSnake = function () {
        var _this = this;
        this.ctx.fillStyle = '#2ecc71';
        this.snake.forEach(function (segment, index) {
            _this.ctx.fillRect(segment.x, segment.y, _this.gridSize - 2, _this.gridSize - 2);
            // Draw eyes on the head
            if (index === 0) {
                _this.ctx.fillStyle = '#000';
                var eyeSize = 4;
                if (_this.dx > 0) {
                    _this.ctx.fillRect(segment.x + 12, segment.y + 4, eyeSize, eyeSize);
                    _this.ctx.fillRect(segment.x + 12, segment.y + 12, eyeSize, eyeSize);
                }
                else if (_this.dx < 0) {
                    _this.ctx.fillRect(segment.x + 4, segment.y + 4, eyeSize, eyeSize);
                    _this.ctx.fillRect(segment.x + 4, segment.y + 12, eyeSize, eyeSize);
                }
                else if (_this.dy > 0) {
                    _this.ctx.fillRect(segment.x + 4, segment.y + 12, eyeSize, eyeSize);
                    _this.ctx.fillRect(segment.x + 12, segment.y + 12, eyeSize, eyeSize);
                }
                else {
                    _this.ctx.fillRect(segment.x + 4, segment.y + 4, eyeSize, eyeSize);
                    _this.ctx.fillRect(segment.x + 12, segment.y + 4, eyeSize, eyeSize);
                }
            }
        });
    };
    SnakeGame.prototype.drawFood = function () {
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.beginPath();
        this.ctx.arc(this.food.x + this.gridSize / 2, this.food.y + this.gridSize / 2, this.gridSize / 2 - 2, 0, Math.PI * 2);
        this.ctx.fill();
    };
    SnakeGame.prototype.moveSnake = function () {
        var newX = this.snake[0].x + this.dx;
        var newY = this.snake[0].y + this.dy;
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
        var head = { x: newX, y: newY };
        this.snake.unshift(head);
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            this.scoreElement.textContent = this.score.toString();
            this.generateFood();
        }
        else {
            this.snake.pop();
        }
    };
    SnakeGame.prototype.generateFood = function () {
        var _this = this;
        var generatePosition = function () { return ({
            x: Math.floor(Math.random() * (_this.canvas.width / _this.gridSize)) * _this.gridSize,
            y: Math.floor(Math.random() * (_this.canvas.height / _this.gridSize)) * _this.gridSize
        }); };
        var newFood;
        do {
            newFood = generatePosition();
        } while (this.snake.some(function (segment) { return segment.x === newFood.x && segment.y === newFood.y; }));
        this.food = newFood;
    };
    SnakeGame.prototype.checkCollision = function () {
        var head = this.snake[0];
        // Only check self collision now
        return this.snake.slice(1).some(function (segment) { return segment.x === head.x && segment.y === head.y; });
    };
    SnakeGame.prototype.handleGameOver = function () {
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
        this.ctx.fillText("Score: ".concat(this.score), this.canvas.width / 2, this.canvas.height / 2 + 20);
        this.startBtn.textContent = 'Play Again';
        this.pauseBtn.disabled = true;
    };
    SnakeGame.prototype.resetGame = function () {
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
        this.generateFood();
    };
    return SnakeGame;
}());
// Initialize game when the page loads
window.addEventListener('load', function () {
    new SnakeGame();
});
