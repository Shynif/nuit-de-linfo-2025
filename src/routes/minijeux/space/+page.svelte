<script>
    import { onMount, onDestroy } from 'svelte';

    // --- Références & État Svelte ---
    let canvasEl;
    let score = 0;
    let lives = 3;
    let isGameOver = false; // "gameOver" est un mot réservé parfois, on utilise isGameOver pour l'état UI

    let engine;
    let animationFrameId;

    // --- Constantes ---
    const CANVAS_WIDTH = 600;
    const CANVAS_HEIGHT = 500;
    const RETRO_GREEN = "#00ff00";
    const PIXEL_SIZE = 3;

    // --- SPRITES ALIENS ---
    const ALIEN_SPRITE_TOP = [
        [0,0,1,0,0,0,0,0,1,0,0], [0,0,0,1,0,0,0,1,0,0,0], [0,0,1,1,1,1,1,1,1,0,0],
        [0,1,1,0,1,1,1,0,1,1,0], [1,1,1,1,1,1,1,1,1,1,1], [1,0,1,1,1,1,1,1,1,0,1],
        [1,0,1,0,0,0,0,0,1,0,1], [0,0,0,1,1,0,1,1,0,0,0]
    ];
    const ALIEN_SPRITE_MID = [
        [0,0,0,1,1,0,0,0], [0,0,1,1,1,1,0,0], [0,1,1,1,1,1,1,0], [1,1,0,1,1,0,1,1],
        [1,1,1,1,1,1,1,1], [0,0,1,0,0,1,0,0], [0,1,0,1,1,0,1,0], [1,0,1,0,0,1,0,1]
    ];
    const ALIEN_SPRITE_BOTTOM = [
        [0,0,0,1,1,1,1,0,0,0], [0,0,1,1,1,1,1,1,0,0], [0,1,1,1,1,1,1,1,1,0],
        [1,1,0,0,1,1,0,0,1,1], [1,1,1,1,1,1,1,1,1,1], [0,0,0,1,1,0,0,0,0,0],
        [0,0,1,1,0,1,1,0,0,0], [1,1,0,0,0,0,1,1,0,0]
    ];

    // --- Moteur du Jeu ---
    class SpaceInvadersEngine {
        constructor(canvas) {
            this.canvas = canvas;
            this.ctx = canvas.getContext("2d");
            
            // État interne du jeu
            this.score = 0;
            this.lives = 3;
            this.gameOver = false;
            this.running = false;

            // Joueur
            this.player = {
                x: CANVAS_WIDTH / 2 - 15, y: CANVAS_HEIGHT - 30,
                width: 30, height: 15, speed: 5, dx: 0
            };

            // Entités
            this.aliens = [];
            this.bullets = [];
            
            // Logique Aliens
            this.alienDirection = 1;
            this.alienMoveCooldown = 0;

            // Logique Tir
            this.PLAYER_BULLET_SPEED = 7;
            this.ALIEN_BULLET_SPEED = 4;
            this.lastShotTime = 0;
            this.SHOOT_COOLDOWN = 400;

            // Input
            this.keys = {};
        }

        initAliens() {
            this.aliens = [];
            const rows = 5; const cols = 11;
            const startX = 50; const startY = 50;
            for (let r = 0; r < rows; r++) {
                let sprite = (r === 0) ? ALIEN_SPRITE_TOP : (r <= 2) ? ALIEN_SPRITE_MID : ALIEN_SPRITE_BOTTOM;
                let sW = sprite[0].length * PIXEL_SIZE;
                let sH = sprite.length * PIXEL_SIZE;
                for (let c = 0; c < cols; c++) {
                    this.aliens.push({
                        x: startX + c * (sW + 15), y: startY + r * (sH + 15),
                        width: sW, height: sH, sprite: sprite, alive: true, row: r
                    });
                }
            }
        }

        start() {
            this.running = true;
            this.initAliens();
            this.loop();
        }

        stop() {
            this.running = false;
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        }

        resetGame() {
            this.score = 0;
            this.lives = 3;
            this.gameOver = false;
            this.bullets = [];
            this.alienDirection = 1;
            this.player.x = CANVAS_WIDTH / 2 - 15;
            this.initAliens();
            
            // Synchro Svelte UI
            score = this.score;
            lives = this.lives;
            isGameOver = this.gameOver;
        }

        handleKey(code, isDown) {
            this.keys[code] = isDown;
            
            if (isDown) {
                if (code === "Space" && !this.gameOver) this.playerShoot();
                if (code === "Enter" && this.gameOver) this.resetGame();
            }
        }

        playerShoot() {
            const now = Date.now();
            if (now - this.lastShotTime > this.SHOOT_COOLDOWN) {
                this.bullets.push({
                    x: this.player.x + this.player.width / 2 - 2, y: this.player.y,
                    width: 4, height: 10, dy: -this.PLAYER_BULLET_SPEED, isPlayerBullet: true
                });
                this.lastShotTime = now;
            }
        }

        alienShoot() {
            if (Math.random() < 0.015) { 
                const livingAliens = this.aliens.filter(a => a.alive);
                if (livingAliens.length > 0) {
                    const shooter = livingAliens[Math.floor(Math.random() * livingAliens.length)];
                    this.bullets.push({
                        x: shooter.x + shooter.width / 2 - 2,
                        y: shooter.y + shooter.height,
                        width: 4, height: 10,
                        dy: this.ALIEN_BULLET_SPEED,
                        isPlayerBullet: false
                    });
                }
            }
        }

        checkCollision(r1, r2) {
            return (r1.x < r2.x + r2.width && r1.x + r1.width > r2.x &&
                    r1.y < r2.y + r2.height && r1.y + r1.height > r2.y);
        }

        update() {
            if (this.gameOver) {
                // Même en Game Over, on synchro l'état UI une dernière fois
                if (!isGameOver) isGameOver = true;
                return;
            }

            // --- Joueur ---
            if (this.keys["ArrowLeft"]) this.player.dx = -this.player.speed;
            else if (this.keys["ArrowRight"]) this.player.dx = this.player.speed;
            else this.player.dx = 0;

            this.player.x += this.player.dx;
            if (this.player.x < 0) this.player.x = 0;
            if (this.player.x + this.player.width > CANVAS_WIDTH) this.player.x = CANVAS_WIDTH - this.player.width;

            // --- Aliens Move ---
            this.alienMoveCooldown++;
            if (this.alienMoveCooldown > 25) {
                let living = this.aliens.filter(a => a.alive);
                if (living.length === 0) { 
                    this.initAliens(); 
                    // Bonus de niveau nettoyé ? Optionnel, ici on respawn juste
                } 

                let touchEdge = false;
                living.forEach(a => {
                    if ((this.alienDirection === 1 && a.x + a.width > CANVAS_WIDTH - 10) ||
                        (this.alienDirection === -1 && a.x < 10)) touchEdge = true;
                });

                if (touchEdge) {
                    this.alienDirection *= -1;
                    this.aliens.forEach(a => a.y += 20);
                } else {
                    this.aliens.forEach(a => a.x += this.alienDirection * 10);
                }
                this.alienMoveCooldown = 0;

                living.forEach(a => { if(a.y + a.height >= this.player.y) this.gameOver = true; });
            }

            // --- Aliens Shoot ---
            this.alienShoot();

            // --- Balles ---
            this.bullets.forEach(b => b.y += b.dy);
            this.bullets = this.bullets.filter(b => b.y + b.height > 0 && b.y < CANVAS_HEIGHT);

            // --- Collisions ---
            for (let i = this.bullets.length - 1; i >= 0; i--) {
                let b = this.bullets[i];
                
                if (b.isPlayerBullet) {
                    let hit = false;
                    for (let a of this.aliens) {
                        if (a.alive && this.checkCollision(b, a)) {
                            a.alive = false;
                            this.score += (5 - a.row) * 10;
                            hit = true; break;
                        }
                    }
                    if (hit) this.bullets.splice(i, 1);
                } 
                else {
                    if (this.checkCollision(b, this.player)) {
                        this.lives--;
                        this.bullets.splice(i, 1);
                        if (this.lives <= 0) this.gameOver = true;
                    }
                }
            }

            // Synchro Svelte
            score = this.score;
            lives = this.lives;
            isGameOver = this.gameOver;
        }

        draw() {
            const ctx = this.ctx;
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            
            // Couleur rétro
            ctx.fillStyle = RETRO_GREEN;

            // Joueur
            ctx.fillRect(this.player.x, this.player.y + 8, this.player.width, this.player.height - 8);
            ctx.fillRect(this.player.x + this.player.width/2 - 4, this.player.y, 8, 8);

            // Aliens
            this.aliens.forEach(a => {
                if (a.alive) {
                    for (let r = 0; r < a.sprite.length; r++) {
                        for (let c = 0; c < a.sprite[r].length; c++) {
                            if (a.sprite[r][c]) 
                                ctx.fillRect(a.x + c*PIXEL_SIZE, a.y + r*PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
                        }
                    }
                }
            });

            // Balles
            this.bullets.forEach(b => {
                ctx.fillRect(b.x, b.y, b.width, b.height);
            });
        }

        loop() {
            if (!this.running) return;
            this.update();
            this.draw();
            animationFrameId = requestAnimationFrame(() => this.loop());
        }
    }

    // --- Lifecycle ---
    onMount(() => {
        engine = new SpaceInvadersEngine(canvasEl);
        engine.start();
    });

    onDestroy(() => {
        if (engine) engine.stop();
    });

    function handleKeydown(e) {
        if(["ArrowLeft","ArrowRight","Space","Enter"].includes(e.code)) e.preventDefault();
        if(engine) engine.handleKey(e.code, true);
    }

    function handleKeyup(e) {
        if(engine) engine.handleKey(e.code, false);
    }

</script>

<svelte:head>
    <title>Retro Space Invaders</title>
</svelte:head>

<svelte:window on:keydown={handleKeydown} on:keyup={handleKeyup} />

<div class="game-container">
    <div class="hud">
        <div class="score">SCORE: {score}</div>
        <div class="lives">LIVES: {lives}</div>
    </div>

    <div class="canvas-wrapper">
        <canvas bind:this={canvasEl} width="600" height="500"></canvas>
        
        {#if isGameOver}
            <div class="overlay">
                <h1>GAME OVER</h1>
                <p>Appuyez sur <span class="blink">ENTRÉE</span> pour rejouer</p>
            </div>
        {/if}
    </div>
</div>

<style>
    /* Import police monospace rétro si besoin, sinon fallback */
    @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');

    :root {
        --retro-green: #00ff00;
        --bg-color: #111;
    }

    .game-container {
        background-color: var(--bg-color);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        height: 100vh;
        width: 100vw;
        margin: 0;
        color: var(--retro-green);
        font-family: 'Courier New', Courier, monospace; /* Ou 'VT323' */
        overflow: hidden;
    }

    .hud {
        width: 600px;
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;
        font-size: 24px;
        font-weight: bold;
        text-shadow: 0 0 5px var(--retro-green);
    }

    .canvas-wrapper {
        position: relative;
        width: 600px;
        height: 500px;
    }

    canvas {
        background-color: #000000;
        border: 4px solid var(--retro-green);
        box-shadow: 0 0 20px rgba(0, 255, 0, 0.2);
        image-rendering: pixelated; /* Garde les pixels nets */
        display: block;
    }

    .overlay {
        position: absolute;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.85);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 10;
    }

    h1 {
        font-size: 60px;
        margin: 0 0 20px 0;
        text-shadow: 4px 4px 0 #005500;
        letter-spacing: 5px;
    }

    p {
        font-size: 24px;
    }

    .blink {
        animation: blinker 1s linear infinite;
        font-weight: bold;
        text-decoration: underline;
    }

    @keyframes blinker {
        50% { opacity: 0; }
    }
</style>