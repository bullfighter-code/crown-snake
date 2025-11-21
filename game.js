const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const score2Element = document.getElementById('score2');
const p1NameDisplay = document.getElementById('p1-name-display');
const p2NameDisplay = document.getElementById('p2-name-display');
const p2ScoreBoard = document.getElementById('p2ScoreBoard');
const highScoreElement = document.getElementById('highScore');
const finalScoreElement = document.getElementById('finalScore');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const leaderboardBtn = document.createElement('button'); // Dynamic button
leaderboardBtn.textContent = "LEADERBOARD";
leaderboardBtn.style.marginTop = "10px";
leaderboardBtn.onclick = () => window.location.href = 'leaderboard.html';
document.getElementById('startScreen').appendChild(leaderboardBtn);

const p2Controls = document.getElementById('p2Controls');
const winnerText = document.getElementById('winnerText');
const p1NameInput = document.getElementById('p1NameInput');
const p2NameInput = document.getElementById('p2NameInput');
// Mode Selection
const mode1Btn = document.getElementById('mode1Btn');
const mode2Btn = document.getElementById('mode2Btn');

const p1LivesElement = document.getElementById('p1-lives');
const p2LivesElement = document.getElementById('p2-lives');
const statsContainer = document.getElementById('statsContainer');

// Game Constants
const GRID_SIZE = 20;
const CANVAS_WIDTH = canvas.width; // Assuming these constants are intended to be defined
const CANVAS_HEIGHT = canvas.height; // Assuming these constants are intended to be defined
const TILE_COUNT_X = CANVAS_WIDTH / GRID_SIZE;
const TILE_COUNT_Y = CANVAS_HEIGHT / GRID_SIZE;

// --- Audio System ---
class SoundManager {
    constructor() {
        this.audioCtx = null;
        this.muted = false;
        this.initialized = false;
    }

    init() {
        if (!this.initialized) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }

    playTone(freq, type, duration, startTime = 0, vol = 0.1) {
        if (this.muted || !this.initialized) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime + startTime);
        gain.gain.setValueAtTime(vol, this.audioCtx.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + startTime + duration);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(this.audioCtx.currentTime + startTime);
        osc.stop(this.audioCtx.currentTime + startTime + duration);
    }

    playStart() {
        this.playTone(440, 'sine', 0.1, 0);
        this.playTone(554, 'sine', 0.1, 0.1);
        this.playTone(659, 'sine', 0.2, 0.2);
    }

    playEat() {
        this.playTone(880, 'square', 0.1, 0, 0.05);
    }

    playBloodlust() {
        this.playTone(110, 'sawtooth', 0.5, 0, 0.1);
    }

    playCrash() {
        this.playTone(100, 'sawtooth', 0.3, 0, 0.2);
        this.playTone(80, 'sawtooth', 0.3, 0.1, 0.2);
    }

    playWin() {
        this.playTone(523, 'triangle', 0.1, 0);
        this.playTone(659, 'triangle', 0.1, 0.1);
        this.playTone(784, 'triangle', 0.1, 0.2);
        this.playTone(1046, 'triangle', 0.4, 0.3);
    }

    playDrop() {
        this.playTone(300, 'sine', 0.2, 0, 0.1);
    }

    playPickup() {
        this.playTone(600, 'sine', 0.1, 0, 0.05);
    }

    playMegaEat() {
        this.playTone(200, 'sawtooth', 0.3, 0, 0.2);
        this.playTone(400, 'sawtooth', 0.3, 0.1, 0.2);
    }
}

const soundManager = new SoundManager();

// Game State
let score = 0;
let score2 = 0;
let highScore = parseInt(localStorage.getItem('neonSnakeHighScore')) || 0;
let gameLoop;
let isGameRunning = false;
let gamePaused = false; // Added
let gameSpeed = 90; // Slightly faster base speed (Changed from GAME_SPEED)
let lastRenderTime = 0; // Added
let isTwoPlayer = false;
let p1Name = "Alex";
let p2Name = "Theo";

let snake = [];
let snake2 = [];
let foods = []; // Array of food objects
let droppedCubes = []; // Array to store DroppedCube objects
let bombs = []; // Array of Bomb obstacles
let lastBombUpdate = 0; // Timestamp for Bomb updates
let velocity = { x: 0, y: 0 };
let nextVelocity = { x: 0, y: 0 };
let velocity2 = { x: 0, y: 0 };
let nextVelocity2 = { x: 0, y: 0 };

// Advanced Rules State
let p1Lives = 0;
let p2Lives = 0;
let droppedCrown = null; // { x, y } or null
let p1Stats = { apple: 0, orange: 0, grape: 0, banana: 0, mega: 0 };
let p2Stats = { apple: 0, orange: 0, grape: 0, banana: 0, mega: 0 };
let p1Bloodlust = 0;
let p2Bloodlust = 0;
let particles = [];

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 4 + 2;
        this.speedX = (Math.random() - 0.5) * 4;
        this.speedY = (Math.random() - 0.5) * 4;
        this.life = 1.0;
        this.decay = Math.random() * 0.05 + 0.02;
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= this.decay;
    }
    draw(ctx) {
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1.0;
    }
}

function createParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
        particles.push(new Particle(x, y, color));
    }
}

class DroppedCube {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.life = 300; // Frames until disappearance (~5 seconds)
        this.maxLife = 300;
    }

    update() {
        this.life--;
        return this.life > 0;
    }

    draw(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 5;
        ctx.shadowColor = this.color;
        ctx.fillRect(this.x * GRID_SIZE, this.y * GRID_SIZE, GRID_SIZE - 2, GRID_SIZE - 2);
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
    }
}

// Initialize High Score Display
highScoreElement.textContent = highScore;

// Event Listeners
document.addEventListener('keydown', handleInput);
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
document.getElementById('sound-toggle').addEventListener('click', (e) => {
    const muted = soundManager.toggleMute();
    e.target.textContent = muted ? '🔇' : '🔊';
});

document.getElementById('exit-btn').addEventListener('click', exitGame);
document.getElementById('exitBtnGameOver').addEventListener('click', exitGame);

mode1Btn.addEventListener('click', () => {
    isTwoPlayer = false;
    mode1Btn.classList.add('active');
    mode2Btn.classList.remove('active');
    p2NameInput.classList.add('hidden');
    p2Controls.classList.add('hidden');
    p2ScoreBoard.classList.add('hidden');
});

mode2Btn.addEventListener('click', () => {
    isTwoPlayer = true;
    mode1Btn.classList.remove('active');
    mode2Btn.classList.add('active');
    p2NameInput.classList.remove('hidden');
    p2Controls.classList.remove('hidden');
    p2ScoreBoard.classList.remove('hidden');
});

// Input UX: Form Submission (Enter Key)
const setupForm = document.getElementById('setup-form');
setupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!isGameRunning && !startScreen.classList.contains('hidden')) {
        startGame();
    }
});


function initGame() {
    // Update Names
    p1Name = p1NameInput.value || "Alex";
    p2Name = p2NameInput.value || "Theo";
    p1NameDisplay.textContent = p1Name;
    p2NameDisplay.textContent = p2Name;

    p2NameDisplay.textContent = p2Name;

    droppedCubes = [];
    bombs = [];
    lastBombUpdate = Date.now();

    // Reset Stats & Lives
    p1Lives = 0;
    p2Lives = 0;
    p1Stats = { apple: 0, orange: 0, grape: 0, banana: 0, mega: 0 };
    p2Stats = { apple: 0, orange: 0, grape: 0, banana: 0, mega: 0 };
    p1Bloodlust = 0;
    p2Bloodlust = 0;
    particles = [];
    droppedCrown = null;
    updateLivesDisplay();

    // Player 1 (Grant/Arrows) - Starts TOP LEFT, moving RIGHT
    snake = [
        { x: 5, y: 5 },
        { x: 4, y: 5 },
        { x: 3, y: 5 }
    ];
    velocity = { x: 1, y: 0 };
    nextVelocity = { x: 1, y: 0 };
    score = 0;
    scoreElement.textContent = score;

    if (isTwoPlayer) {
        // Player 2 (Neon/WASD) - Starts BOTTOM RIGHT, moving LEFT
        snake2 = [
            { x: 35, y: 25 },
            { x: 36, y: 25 },
            { x: 37, y: 25 }
        ];
        velocity2 = { x: -1, y: 0 };
        nextVelocity2 = { x: -1, y: 0 };
        score2 = 0;
        score2Element.textContent = score2;
    } else {
        snake2 = [];
    }

    foods = [];
    for (let i = 0; i < 6; i++) spawnFood(); // Start with 6 fruits
}

function shrinkSnake(snakeToShrink, color) { // New function
    if (snakeToShrink.length > 3) {
        // Drop the last 3 segments as cubes
        const segmentsToDrop = Math.min(3, snakeToShrink.length - 3);
        for (let i = 0; i < segmentsToDrop; i++) {
            const segment = snakeToShrink.pop();
            droppedCubes.push(new DroppedCube(segment.x, segment.y, color));
        }
        soundManager.playDrop();
    }
}

function updateLivesDisplay() {
    // Lives = Length / 3 (Roughly)
    p1Lives = Math.floor(snake.length / 3);
    if (isTwoPlayer) p2Lives = Math.floor(snake2.length / 3);

    p1LivesElement.textContent = `❤️ ${p1Lives}`;
    if (isTwoPlayer) {
        p2LivesElement.textContent = `❤️ ${p2Lives}`;
    }
}

function startGame() {
    try {
        console.log("Starting game...");
        try {
            soundManager.init(); // Initialize audio context on user interaction
            soundManager.playStart(); // Added
        } catch (e) {
            console.warn("Audio init failed:", e);
        }

        initGame();

        // Start Game Immediately (Countdown Removed)
        const countdownOverlay = document.getElementById('countdown-overlay');
        if (countdownOverlay) countdownOverlay.classList.add('hidden');

        isGameRunning = true;
        if (gameLoop) clearInterval(gameLoop);
        gameLoop = setInterval(update, gameSpeed);

        startScreen.classList.add('hidden');
        gameOverScreen.classList.add('hidden');
    } catch (error) {
        console.error("Error starting game:", error);
        alert("Error starting game: " + error.message);
    }
}

function exitGame() {
    isGameRunning = false;
    clearInterval(gameLoop);
    startScreen.classList.remove('hidden');
    gameOverScreen.classList.add('hidden');
    document.getElementById('countdown-overlay').classList.add('hidden');

    // Reset Game State for visual cleanliness
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function gameOver(reason) {
    isGameRunning = false;
    clearInterval(gameLoop);

    if (!isTwoPlayer) {
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('neonSnakeHighScore', highScore);
            highScoreElement.textContent = highScore;
        }
        winnerText.textContent = "GAME OVER";
        finalScoreElement.textContent = score;

        // Single Player Stats
        statsContainer.innerHTML = `
            <h3>${p1Name} Stats:</h3>
            <p>🍎: ${p1Stats.apple} | 🍊: ${p1Stats.orange} | 🍇: ${p1Stats.grape} | 🍌: ${p1Stats.banana} | 🍉: ${p1Stats.mega}</p>
        `;
    } else {
        if (reason === 'draw') {
            winnerText.textContent = "IT'S A DRAW!";
        } else if (reason === 'p1_wins') {
            winnerText.textContent = `${p1Name.toUpperCase()} WINS!`;
            soundManager.playWin(); // Added
        } else if (reason === 'p2_wins') {
            winnerText.textContent = `${p2Name.toUpperCase()} WINS!`;
            soundManager.playWin(); // Added
        }
        finalScoreElement.textContent = `${score} - ${score2}`;

        // 2 Player Stats
        statsContainer.innerHTML = `
            <div style="display: flex; justify-content: space-between; gap: 20px;">
                <div>
                    <h3>${p1Name}</h3>
                    <p>🍎: ${p1Stats.apple}</p>
                    <p>🍊: ${p1Stats.orange}</p>
                    <p>🍇: ${p1Stats.grape}</p>
                    <p>🍌: ${p1Stats.banana}</p>
                    <p>🍉: ${p1Stats.mega}</p>
                </div>
                <div>
                    <h3>${p2Name}</h3>
                    <p>🍎: ${p2Stats.apple}</p>
                    <p>🍊: ${p2Stats.orange}</p>
                    <p>🍇: ${p2Stats.grape}</p>
                    <p>🍌: ${p2Stats.banana}</p>
                    <p>🍉: ${p2Stats.mega}</p>
                </div>
            </div>
        `;
    }

    gameOverScreen.classList.remove('hidden');

    // Save Scores to Leaderboard
    saveScore(p1Name, score);
    if (isTwoPlayer) saveScore(p2Name, score2);
}

function saveScore(name, points) {
    if (points === 0) return; // Don't save 0 scores

    const leaderboard = JSON.parse(localStorage.getItem('crownSnakeLeaderboard')) || [];
    const date = new Date().toLocaleDateString();

    leaderboard.push({ name: name, score: points, date: date });

    // Sort by score descending
    leaderboard.sort((a, b) => b.score - a.score);

    // Keep top 20
    if (leaderboard.length > 20) {
        leaderboard.splice(20);
    }

    localStorage.setItem('crownSnakeLeaderboard', JSON.stringify(leaderboard));
}

function spawnFood() {
    let valid = false;
    let foodItem = {};

    // Limit total food items
    if (foods.length >= 6) return;

    while (!valid) {
        foodItem.x = Math.floor(Math.random() * TILE_COUNT_X);
        foodItem.y = Math.floor(Math.random() * TILE_COUNT_Y);

        // Random Fruit Type (Boosted High Tier)
        const rand = Math.random();
        if (rand < 0.25) foodItem.type = 'apple';       // 25%
        else if (rand < 0.50) foodItem.type = 'orange'; // 25%
        else if (rand < 0.70) foodItem.type = 'grape'; // 20%
        else if (rand < 0.85) foodItem.type = 'banana'; // 15%
        else {
            foodItem.type = 'mega'; // 15% Mega Fruit
            // Ensure Mega Fruit fits (2x2)
            if (foodItem.x >= TILE_COUNT_X - 1) foodItem.x--;
            if (foodItem.y >= TILE_COUNT_Y - 1) foodItem.y--;
        }

        foodItem.spawnTime = Date.now();
        valid = true;

        // Helper to check point collision
        const checkPoint = (x, y) => {
            // Check collision with P1
            for (let segment of snake) if (segment.x === x && segment.y === y) return false;
            // Check collision with P2
            if (isTwoPlayer) for (let segment of snake2) if (segment.x === x && segment.y === y) return false;
            // Check collisions with dropped cubes
            for (let cube of droppedCubes) if (cube.x === x && cube.y === y) return false;
            // Check collisions with Bombs
            for (let b of bombs) if (b.x === x && b.y === y) return false;
            // Check collision with Dropped Crown
            if (droppedCrown && droppedCrown.x === x && droppedCrown.y === y) return false;
            // Check collision with other foods
            for (let f of foods) {
                if (f.type === 'mega') {
                    if ((x === f.x || x === f.x + 1) && (y === f.y || y === f.y + 1)) return false;
                } else {
                    if (f.x === x && f.y === y) return false;
                }
            }
            return true;
        };

        if (foodItem.type === 'mega') {
            // Check all 4 tiles for Mega Fruit
            if (!checkPoint(foodItem.x, foodItem.y) ||
                !checkPoint(foodItem.x + 1, foodItem.y) ||
                !checkPoint(foodItem.x, foodItem.y + 1) ||
                !checkPoint(foodItem.x + 1, foodItem.y + 1)) valid = false;
        } else {
            if (!checkPoint(foodItem.x, foodItem.y)) valid = false;
        }
    }
    foods.push(foodItem);
}

function handleInput(e) {
    // Prevent Enter key from restarting game if running
    if (e.key === 'Enter' && isGameRunning) {
        e.preventDefault();
        return;
    }

    if (!isGameRunning) return;

    // Player 1 (Arrow Keys)
    switch (e.key) {
        case 'ArrowUp':
            if (velocity.y === 0) nextVelocity = { x: 0, y: -1 };
            break;
        case 'ArrowDown':
            if (velocity.y === 0) nextVelocity = { x: 0, y: 1 };
            break;
        case 'ArrowLeft':
            if (velocity.x === 0) nextVelocity = { x: -1, y: 0 };
            break;
        case 'ArrowRight':
            if (velocity.x === 0) nextVelocity = { x: 1, y: 0 };
            break;
    }

    // Player 2 (WASD)
    if (isTwoPlayer) {
        switch (e.key.toLowerCase()) {
            case 'w':
                if (velocity2.y === 0) nextVelocity2 = { x: 0, y: -1 };
                break;
            case 's':
                if (velocity2.y === 0) nextVelocity2 = { x: 0, y: 1 };
                break;
            case 'a':
                if (velocity2.x === 0) nextVelocity2 = { x: -1, y: 0 };
                break;
            case 'd':
                if (velocity2.x === 0) nextVelocity2 = { x: 1, y: 0 };
                break;
        }
    }
}

function getFruitPoints(type) {
    switch (type) {
        case 'apple': return 10;
        case 'orange': return 20;
        case 'grape': return 30;
        case 'banana': return 50;
        case 'mega': return 100;
        default: return 10;
    }
}

function dropCrown(x, y) {
    let valid = false;
    while (!valid) {
        droppedCrown = {
            x: Math.floor(Math.random() * TILE_COUNT_X),
            y: Math.floor(Math.random() * TILE_COUNT_Y)
        };
        valid = true;
        // Check collisions
        for (let segment of snake) if (segment.x === droppedCrown.x && segment.y === droppedCrown.y) valid = false;
        if (isTwoPlayer) for (let segment of snake2) if (segment.x === droppedCrown.x && segment.y === droppedCrown.y) valid = false;
        for (let f of foods) {
            if (f.type === 'mega') {
                if ((droppedCrown.x === f.x || droppedCrown.x === f.x + 1) && (droppedCrown.y === f.y || droppedCrown.y === f.y + 1)) valid = false;
            } else {
                if (f.x === droppedCrown.x && f.y === droppedCrown.y) valid = false;
            }
        }
        // Check collisions with dropped cubes
        for (let cube of droppedCubes) if (cube.x === droppedCrown.x && cube.y === droppedCrown.y) valid = false;
        // Check collisions with Bombs
        for (let b of bombs) if (b.x === droppedCrown.x && b.y === droppedCrown.y) valid = false;
    }
}

function updateBombs() {
    const now = Date.now();
    if (now - lastBombUpdate > 60000) { // Every 60 seconds
        lastBombUpdate = now;

        // Add new Bomb
        bombs.push({ x: 0, y: 0 }); // Placeholder

        // Randomize ALL Bomb positions
        bombs.forEach(b => {
            let valid = false;
            while (!valid) {
                b.x = Math.floor(Math.random() * TILE_COUNT_X);
                b.y = Math.floor(Math.random() * TILE_COUNT_Y);
                valid = true;

                // Simple collision check (don't spawn on snake head)
                if (snake[0].x === b.x && snake[0].y === b.y) valid = false;
                if (isTwoPlayer && snake2[0] && snake2[0].x === b.x && snake2[0].y === b.y) valid = false;
            }
        });

        soundManager.playDrop(); // Sound cue for Bomb shift
    }
}

function update() {
    velocity = nextVelocity; // AI Logic removed
    if (isTwoPlayer) {
        velocity2 = nextVelocity2;
    }

    updateBombs();

    // Determine Crown Holder (Leader)
    let p1HasCrown = false;
    let p2HasCrown = false;

    if (snake.length > snake2.length) p1HasCrown = true;
    else if (snake2.length > snake.length) p2HasCrown = true;

    // Move Snake 1
    let head = { x: snake[0].x + velocity.x, y: snake[0].y + velocity.y };
    // Wrap P1
    if (head.x < 0) head.x = TILE_COUNT_X - 1;
    if (head.x >= TILE_COUNT_X) head.x = 0;
    if (head.y < 0) head.y = TILE_COUNT_Y - 1;
    if (head.y >= TILE_COUNT_Y) head.y = 0;

    let p1Crashed = false;

    // Move Snake 2
    let head2 = null;
    let p2Crashed = false;

    if (isTwoPlayer) {
        head2 = { x: snake2[0].x + velocity2.x, y: snake2[0].y + velocity2.y };

        // Wrap P2
        if (head2.x < 0) head2.x = TILE_COUNT_X - 1;
        if (head2.x >= TILE_COUNT_X) head2.x = 0;
        if (head2.y < 0) head2.y = TILE_COUNT_Y - 1;
        if (head2.y >= TILE_COUNT_Y) head2.y = 0;
    }

    // --- COLLISION CHECKS ---

    // 1. Self Collisions
    // 1. Self Collisions
    for (let segment of snake) if (head.x === segment.x && head.y === segment.y) p1Crashed = true;
    if (isTwoPlayer) {
        for (let segment of snake2) if (head2.x === segment.x && head2.y === segment.y) p2Crashed = true;
    }

    // 2. Head-to-Head Collision
    if (isTwoPlayer && head.x === head2.x && head.y === head2.y) {
        if (p1HasCrown && !p2HasCrown) {
            gameOver('p1_wins'); // Crown wins
            return;
        } else if (p2HasCrown && !p1HasCrown) {
            gameOver('p2_wins'); // Crown wins
            return;
        } else {
            gameOver('draw'); // Both/Neither have crown
            return;
        }
    }

    // 3. Head-to-Body Collisions (Enemy)
    for (let segment of snake2) if (head.x === segment.x && head.y === segment.y) p1Crashed = true;
    if (isTwoPlayer) {
        for (let segment of snake) if (head2.x === segment.x && head2.y === segment.y) p2Crashed = true;
    }

    // 4. Dropped Cube Collisions (Added)
    for (let i = droppedCubes.length - 1; i >= 0; i--) {
        const cube = droppedCubes[i];
        if (head.x === cube.x && head.y === cube.y) {
            score += 5;
            scoreElement.textContent = score;
            snake.push({ ...snake[snake.length - 1] }); // Grow by 1
            droppedCubes.splice(i, 1);
            soundManager.playPickup();
        }
        if (isTwoPlayer && head2.x === cube.x && head2.y === cube.y) {
            score2 += 5;
            score2Element.textContent = score2;
            snake2.push({ ...snake2[snake2.length - 1] }); // Grow by 1
            droppedCubes.splice(i, 1);
            soundManager.playPickup();
        }
    }

    // 5. Bomb Collisions
    for (let b of bombs) {
        // Helper to handle bomb hit
        const hitBomb = (s, headPos, color) => {
            if (s.length > 1) {
                soundManager.playCrash(); // Explosion sound
                createParticles(headPos.x * GRID_SIZE + GRID_SIZE / 2, headPos.y * GRID_SIZE + GRID_SIZE / 2, '#ff4400'); // Explosion particles

                // Lose LAST block
                const lostSegment = s.pop();

                // Drop it as a cube
                droppedCubes.push(new DroppedCube(lostSegment.x, lostSegment.y, color));

                // Relocate Bomb
                b.x = Math.floor(Math.random() * TILE_COUNT_X);
                b.y = Math.floor(Math.random() * TILE_COUNT_Y);
            }
        };

        if (head.x === b.x && head.y === b.y) {
            hitBomb(snake, head, '#00ff88');
        }
        if (isTwoPlayer && head2 && head2.x === b.x && head2.y === b.y) {
            hitBomb(snake2, head2, '#00ffff');
        }
    }

    // --- HANDLE CRASHES (Shield/Lives) ---

    const handleCrash = (isP1) => {
        const hasCrown = isP1 ? p1HasCrown : p2HasCrown;
        const lives = isP1 ? p1Lives : p2Lives;
        const s = isP1 ? snake : snake2;
        const sColor = isP1 ? '#00ff88' : '#00ffff'; // Pass color for dropped cubes

        if (hasCrown) {
            soundManager.playCrash(); // Added
            // Shield Used! Drop Crown, Shrink
            dropCrown();
            shrinkSnake(s, sColor); // Use new shrink function
            return false; // Survived
        } else if (s.length > 3) {
            soundManager.playCrash(); // Added
            // Lives in Body: Lose segments instead of dying
            shrinkSnake(s, sColor); // Drops 3 segments
            updateLivesDisplay();
            return false; // Survived
        }
        return true; // Died
    };

    if (p1Crashed) {
        if (handleCrash(true)) {
            gameOver('p2_wins');
            return;
        }
    }
    if (p2Crashed) {
        if (handleCrash(false)) {
            gameOver('p1_wins');
            return;
        }
    }

    // --- UPDATE SNAKES ---

    // Helper for eating
    const eat = (s, h, isP1) => {
        s.unshift(h);

        let ateFood = false;
        let foodIndex = -1;

        for (let i = 0; i < foods.length; i++) {
            const f = foods[i];
            if (f.type === 'mega') {
                // Check 2x2 area
                if ((h.x === f.x || h.x === f.x + 1) && (h.y === f.y || h.y === f.y + 1)) {
                    ateFood = true;
                    foodIndex = i;
                    break;
                }
            } else {
                if (h.x === f.x && h.y === f.y) {
                    ateFood = true;
                    foodIndex = i;
                    break;
                }
            }
        }

        if (ateFood) {
            const f = foods[foodIndex];
            if (f.type === 'mega') {
                soundManager.playMegaEat();
            } else {
                soundManager.playEat();
            }
            const points = getFruitPoints(f.type);
            if (isP1) {
                score += points;
                scoreElement.textContent = score;
                p1Stats[f.type]++;
                p1Bloodlust = Math.min(100, p1Bloodlust + 20);
                createParticles(f.x * GRID_SIZE + GRID_SIZE / 2, f.y * GRID_SIZE + GRID_SIZE / 2, '#00ff88');
            } else {
                score2 += points;
                score2Element.textContent = score2;
                p2Stats[f.type]++;
                p2Bloodlust = Math.min(100, p2Bloodlust + 20);
                createParticles(f.x * GRID_SIZE + GRID_SIZE / 2, f.y * GRID_SIZE + GRID_SIZE / 2, '#00ffff');
            }

            // Mega Fruit grows more
            if (f.type === 'mega') {
                // Already grew 1, grow 3 more (total 4)
                s.push({ ...s[s.length - 1] });
                s.push({ ...s[s.length - 1] });
                s.push({ ...s[s.length - 1] });
            }

            foods.splice(foodIndex, 1); // Remove eaten food
            spawnFood(); // Spawn new one

            // Chance to spawn extra food if count is low
            if (foods.length < 6 && Math.random() < 0.5) spawnFood();

        } else {
            s.pop();
        }

        // Check Dropped Crown Pickup
        if (droppedCrown && h.x === droppedCrown.x && h.y === droppedCrown.y) {
            if (isP1) p1Lives++; else p2Lives++;
            updateLivesDisplay();
            droppedCrown = null;
            soundManager.playPickup(); // Added
        }
    };

    eat(snake, head, true);
    if (isTwoPlayer) eat(snake2, head2, false);

    // Update dropped cubes (Added)
    for (let i = droppedCubes.length - 1; i >= 0; i--) {
        if (!droppedCubes[i].update()) {
            droppedCubes.splice(i, 1);
        }
    }

    // Decay Bloodlust
    p1Bloodlust = Math.max(0, p1Bloodlust - 0.5);
    p2Bloodlust = Math.max(0, p2Bloodlust - 0.5);

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].life <= 0) particles.splice(i, 1);
    }

    // Fruit Respawn Logic
    const now = Date.now();
    for (let i = foods.length - 1; i >= 0; i--) {
        if (now - foods[i].spawnTime > 10000) { // 10 seconds
            foods.splice(i, 1);
            spawnFood();
        }
    }

    updateLivesDisplay(); // Ensure lives don't exceed length
    draw(p1HasCrown, p2HasCrown);
}

function draw(p1HasCrown, p2HasCrown) {
    // Clear Canvas
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Foods
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    foods.forEach(f => {
        // Blink effect in last 3 seconds
        const age = Date.now() - f.spawnTime;
        if (age > 7000 && Math.floor(Date.now() / 200) % 2 === 0) return;

        let emoji = '🍎';
        switch (f.type) {
            case 'apple': emoji = '🍎'; break;
            case 'orange': emoji = '🍊'; break;
            case 'grape': emoji = '🍇'; break;
            case 'banana': emoji = '🍌'; break;
            case 'mega': emoji = '🍉'; break;
        }

        if (f.type === 'mega') {
            ctx.font = '40px Arial';
            ctx.fillText(emoji, f.x * GRID_SIZE + GRID_SIZE, f.y * GRID_SIZE + GRID_SIZE + 4);
            ctx.font = '20px Arial'; // Reset
        } else {
            ctx.fillText(emoji, f.x * GRID_SIZE + GRID_SIZE / 2, f.y * GRID_SIZE + GRID_SIZE / 2);
        }
    });

    // Draw Bombs
    bombs.forEach(b => {
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💣', b.x * GRID_SIZE + GRID_SIZE / 2, b.y * GRID_SIZE + GRID_SIZE / 2 + 2);
    });

    // Draw Dropped Crown
    if (droppedCrown) {
        ctx.fillText('💎', droppedCrown.x * GRID_SIZE + GRID_SIZE / 2, droppedCrown.y * GRID_SIZE + GRID_SIZE / 2 + 2);
    }

    // Draw Dropped Cubes (Added)
    droppedCubes.forEach(cube => cube.draw(ctx));

    // Draw Particles
    particles.forEach(p => p.draw(ctx));

    // Draw Snake 1 (Grant)
    drawSnake(snake, '#00ff88', '#ccffdd', p1HasCrown, p2HasCrown, p1Lives, p1Bloodlust);

    // Draw Snake 2
    if (isTwoPlayer) {
        drawSnake(snake2, '#00ffff', '#ccffff', p2HasCrown, p1HasCrown, p2Lives, p2Bloodlust);
    }

    // Draw Crown on Leader
    let leader = null;
    if (p1HasCrown) leader = snake[0];
    else if (p2HasCrown) leader = snake2[0];

    if (leader) {
        ctx.font = '20px Arial';
        ctx.fillText('👑', leader.x * GRID_SIZE + GRID_SIZE / 2, leader.y * GRID_SIZE - 10);
    }
}

function drawSnake(s, color, headColor, isAttacking, isScared, lives, bloodlust) {
    // Default Shadow
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;

    if (bloodlust > 80) {
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 20;
    }

    s.forEach((segment, index) => {
        if (index === 0) {
            // Head
            let currentHeadColor = headColor;

            if (isAttacking || bloodlust > 80) {
                // BLOODLUST / ATTACK: Red Glow & Tint
                currentHeadColor = '#ff4444'; // Reddish head
            } else if (isScared) {
                // SCARED: Pale
                currentHeadColor = '#f0f0f0'; // Pale head
            }

            ctx.fillStyle = currentHeadColor;

            // Calculate Direction
            let dx = 1, dy = 0;
            if (s.length > 1) {
                dx = segment.x - s[1].x;
                dy = segment.y - s[1].y;
                // Handle Wrap-around for direction calculation
                if (dx > 1) dx = -1;
                if (dx < -1) dx = 1;
                if (dy > 1) dy = -1;
                if (dy < -1) dy = 1;
            }

            const x = segment.x * GRID_SIZE;
            const y = segment.y * GRID_SIZE;
            const cx = x + GRID_SIZE / 2;
            const cy = y + GRID_SIZE / 2;

            // Rotate Context for Head
            ctx.save();
            ctx.translate(cx, cy);
            const angle = Math.atan2(dy, dx);
            ctx.rotate(angle);

            // Draw Head Shape (Rounded Rect)
            ctx.fillRect(-GRID_SIZE / 2 + 1, -GRID_SIZE / 2 + 1, GRID_SIZE - 2, GRID_SIZE - 2);

            // Eyes
            if (isAttacking || bloodlust > 80) {
                // Angry Eyes
                ctx.fillStyle = 'black';
                // Eyebrows
                ctx.beginPath();
                ctx.moveTo(-5, -8);
                ctx.lineTo(5, -4);
                ctx.lineTo(5, -8);
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(-5, 8);
                ctx.lineTo(5, 4);
                ctx.lineTo(5, 8);
                ctx.fill();

                // Pupils
                ctx.fillStyle = '#ffff00';
                ctx.fillRect(0, -6, 3, 3);
                ctx.fillRect(0, 3, 3, 3);
            } else if (isScared) {
                // Scared Eyes
                ctx.fillStyle = 'white';
                ctx.fillRect(0, -7, 6, 6);
                ctx.fillRect(0, 1, 6, 6);
                ctx.fillStyle = 'black';
                ctx.fillRect(2, -5, 2, 2);
                ctx.fillRect(2, 3, 2, 2);
            } else {
                // Normal Eyes
                ctx.fillStyle = 'black';
                ctx.fillRect(2, -6, 4, 4);
                ctx.fillRect(2, 2, 4, 4);
            }

            // Tongue (Flicker)
            if (Math.random() < 0.2) {
                ctx.fillStyle = '#ff0000';
                ctx.beginPath();
                ctx.moveTo(GRID_SIZE / 2, 0);
                ctx.lineTo(GRID_SIZE / 2 + 8, -2);
                ctx.lineTo(GRID_SIZE / 2 + 6, 0);
                ctx.lineTo(GRID_SIZE / 2 + 8, 2);
                ctx.fill();
            }

            ctx.restore();

        } else {
            // Body
            ctx.fillStyle = color;
            if (bloodlust > 50) {
                // Pulse effect
                if (Math.floor(Date.now() / 100) % 2 === 0) {
                    ctx.fillStyle = '#ffaaaa';
                }
            }

            const x = segment.x * GRID_SIZE;
            const y = segment.y * GRID_SIZE;
            ctx.fillRect(x + 1, y + 1, GRID_SIZE - 2, GRID_SIZE - 2);

            // Draw Heart for Lives
            if (index <= lives && lives > 0) {
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = 'white';
                ctx.fillText('❤️', x + GRID_SIZE / 2, y + GRID_SIZE / 2 + 1);
            }
        }
    });
    ctx.shadowBlur = 0;
}

// --- AI LOGIC (Moved to Global Scope) ---

// AI Logic Removed

// Initial Draw
draw(false, false);
