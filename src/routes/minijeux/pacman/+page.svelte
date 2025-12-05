<script>
    import { onMount, onDestroy } from 'svelte';

    // --- Références & État ---
    let canvasEl;
    let score = 0;
    let statusText = "";
    let statusColor = "";

    let engine;
    let animationFrameId;

    // --- Constantes ---
    const TILE = 20;
    const SPEED = 2;
    
    // 1=Mur, 0=Pastille, 2=Vide, 3=SUPER, 9=Porte Fantômes
    const RAW_MAP = [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,3,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,3,1,1],
        [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1,1],
        [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
        [1,0,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,0,1,1],
        [1,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,1,1],
        [1,1,1,1,0,1,1,1,2,1,2,1,1,1,0,1,1,1,1,1],
        [1,1,1,1,0,1,2,2,2,2,2,2,2,1,0,1,1,1,1,1], 
        [1,1,1,1,0,1,2,1,1,9,1,1,2,1,0,1,1,1,1,1],
        [1,0,0,0,0,0,0,1,2,2,2,1,0,0,0,0,0,0,1,1],
        [1,0,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,0,1,1],
        [1,0,0,1,0,1,0,0,0,1,0,0,0,1,0,1,0,0,1,1],
        [1,1,0,1,0,1,1,1,0,1,0,1,1,1,0,1,0,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
        [1,0,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,0,1,1],
        [1,3,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,3,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], 
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ];

    // --- Classes du Jeu ---

    class Entity {
        constructor(x, y, color, game) {
            this.startX = x;
            this.startY = y;
            this.x = x * TILE;
            this.y = y * TILE;
            this.color = color;
            this.game = game; // Référence au moteur pour accéder à la map
            this.dx = 0; this.dy = 0;
            this.nextDx = 0; this.nextDy = 0;
        }

        resetPos() {
            this.x = this.startX * TILE;
            this.y = this.startY * TILE;
            this.dx = 0; this.dy = 0;
            this.nextDx = 0; this.nextDy = 0;
        }

        isCentered() {
            return this.x % TILE === 0 && this.y % TILE === 0;
        }

        getTileX() { return Math.round(this.x / TILE); }
        getTileY() { return Math.round(this.y / TILE); }

        canMove(dx, dy, isPlayer) {
            const tx = this.getTileX() + dx;
            const ty = this.getTileY() + dy;
            // Vérification des limites du tableau
            if (!this.game.map[ty] || typeof this.game.map[ty][tx] === 'undefined') return false;
            
            const cell = this.game.map[ty][tx];
            
            if (cell === 1) return false; // Mur
            if (isPlayer && cell === 9) return false; // Porte fantôme
            return true;
        }

        move(isPlayer) {
            if (this.isCentered()) {
                // Essayer nouvelle direction
                if (this.nextDx !== 0 || this.nextDy !== 0) {
                    if (this.canMove(this.nextDx, this.nextDy, isPlayer)) {
                        this.dx = this.nextDx;
                        this.dy = this.nextDy;
                        this.nextDx = 0; this.nextDy = 0;
                    }
                }
                // Stop si mur devant
                if (!this.canMove(this.dx, this.dy, isPlayer)) {
                    this.dx = 0; this.dy = 0;
                }
            }
            this.x += this.dx * SPEED;
            this.y += this.dy * SPEED;
        }
    }

    class Pacman extends Entity {
        constructor(x, y, game) {
            super(x, y, "yellow", game);
            this.mouthOpen = 0;
            this.mouthSpeed = 0.2;
            this.rotation = 0;
        }

        update() {
            this.move(true);

            // Rotation visuelle
            if (this.dx === 1) this.rotation = 0;
            if (this.dx === -1) this.rotation = Math.PI;
            if (this.dy === -1) this.rotation = -Math.PI/2;
            if (this.dy === 1) this.rotation = Math.PI/2;

            // Manger
            if (this.isCentered()) {
                const tx = this.getTileX();
                const ty = this.getTileY();
                const cell = this.game.map[ty][tx];

                if (cell === 0 || cell === 3) {
                    if (cell === 3) { // SUPER
                        this.game.addScore(50);
                        this.game.activatePowerMode();
                    } else { // NORMAL
                        this.game.addScore(10);
                    }
                    this.game.map[ty][tx] = 2; // Vide
                    this.game.dotsRemaining--;
                    
                    if (this.game.dotsRemaining === 0) {
                        this.game.nextLevel();
                    }
                }
            }

            // Anim bouche
            this.mouthOpen += this.mouthSpeed;
            if (this.mouthOpen > 0.25 * Math.PI || this.mouthOpen < 0) this.mouthSpeed = -this.mouthSpeed;
        }

        draw(ctx) {
            ctx.save();
            ctx.translate(this.x + TILE/2, this.y + TILE/2);
            ctx.rotate(this.rotation);
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(0, 0, TILE/2 - 2, this.mouthOpen, 2 * Math.PI - this.mouthOpen);
            ctx.lineTo(0, 0);
            ctx.fill();
            ctx.restore();
        }
    }

    class Ghost extends Entity {
        constructor(x, y, color, game) {
            super(x, y, color, game);
            this.baseColor = color;
        }

        update() {
            // Ralentissement fantôme quand ils ont peur (1 frame sur 2)
            if (this.game.powerMode && this.game.frameCount % 2 !== 0) return;

            if (this.isCentered()) {
                const possibleDirs = [];
                if (this.canMove(0, -1, false) && this.dy !== 1) possibleDirs.push({dx:0, dy:-1}); 
                if (this.canMove(0, 1, false) && this.dy !== -1) possibleDirs.push({dx:0, dy:1});
                if (this.canMove(-1, 0, false) && this.dx !== 1) possibleDirs.push({dx:-1, dy:0});
                if (this.canMove(1, 0, false) && this.dx !== -1) possibleDirs.push({dx:1, dy:0});

                if (possibleDirs.length > 0) {
                    // IA "Intelligente" simple : éviter de se retourner tout le temps
                    const keepGoing = possibleDirs.find(d => d.dx === this.dx && d.dy === this.dy);
                    // 80% de chance de continuer tout droit si possible
                    if (keepGoing && possibleDirs.length > 1 && Math.random() > 0.2) {
                        // continue
                    } else {
                        const rand = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
                        this.dx = rand.dx;
                        this.dy = rand.dy;
                    }
                } else {
                    // Cul de sac
                    this.dx = -this.dx;
                    this.dy = -this.dy;
                }
            }
            this.x += this.dx * SPEED;
            this.y += this.dy * SPEED;
        }

        draw(ctx) {
            const gx = this.x;
            const gy = this.y;
            ctx.fillStyle = this.game.powerMode ? "#2121ff" : this.baseColor;
            
            // Clignote blanc avant la fin du bonus
            if (this.game.powerMode && this.game.powerTimer < 1500 && Math.floor(Date.now() / 200) % 2 === 0) {
                 ctx.fillStyle = "white"; 
            }

            ctx.beginPath();
            ctx.arc(gx + TILE/2, gy + TILE/2, TILE/2 - 2, Math.PI, 0);
            ctx.lineTo(gx + TILE - 2, gy + TILE);
            ctx.lineTo(gx + 2, gy + TILE);
            ctx.fill();

            if (!this.game.powerMode) {
                // Yeux
                ctx.fillStyle = "white";
                ctx.beginPath();
                ctx.arc(gx + 6, gy + 8, 4, 0, Math.PI * 2);
                ctx.arc(gx + 14, gy + 8, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "black";
                ctx.beginPath();
                ctx.arc(gx + 6 + this.dx*2, gy + 8 + this.dy*2, 2, 0, Math.PI * 2);
                ctx.arc(gx + 14 + this.dx*2, gy + 8 + this.dy*2, 2, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Bouche peur
                ctx.fillStyle = "#ffcccc";
                ctx.fillRect(gx+6, gy+12, 3, 2);
                ctx.fillRect(gx+11, gy+12, 3, 2);
            }
        }
    }

    class PacmanEngine {
        constructor(canvas) {
            this.canvas = canvas;
            this.ctx = canvas.getContext("2d");
            this.FPS = 42;
            
            this.map = [];
            this.score = 0;
            this.level = 1;
            this.dotsRemaining = 0;
            this.gameOver = false;
            this.gameWon = false;
            this.powerMode = false;
            this.powerTimer = 0;
            this.frameCount = 0;
            this.powerTimeoutIdx = null; // Stocke l'ID du timer pour le nettoyer

            this.lastTime = 0;
            this.running = false;
        }

        initGame(resetScore = true) {
            if (resetScore) {
                this.score = 0;
                this.level = 1;
                this.FPS = 42;
                score = 0; // Update Svelte state
            }
            
            // Deep copy de la carte
            this.map = RAW_MAP.map(row => [...row]);
            this.dotsRemaining = 0;
            
            for (let y=0; y<this.map.length; y++) {
                for (let x=0; x<this.map[y].length; x++) {
                    if (this.map[y][x] === 0 || this.map[y][x] === 3) this.dotsRemaining++;
                }
            }

            this.gameOver = false;
            this.gameWon = false;
            this.powerMode = false;
            
            this.updateStatus("NIVEAU " + this.level, "yellow");
            
            this.player = new Pacman(10, 15, this);
            this.ghosts = [
                new Ghost(9, 8, "red", this),
                new Ghost(10, 8, "pink", this),
                new Ghost(9, 9, "#00FFFF", this),
                new Ghost(10, 9, "#FFB852", this)
            ];

            // Délai de démarrage
            setTimeout(() => { 
                if(!this.gameOver && !this.gameWon) this.updateStatus("", ""); 
            }, 2000);
        }

        start() {
            this.running = true;
            this.initGame(true);
            this.loop(0);
        }

        stop() {
            this.running = false;
            if(this.powerTimeoutIdx) clearTimeout(this.powerTimeoutIdx);
            if(animationFrameId) cancelAnimationFrame(animationFrameId);
        }

        loop(timestamp) {
            if (!this.running) return;

            if (!this.lastTime) this.lastTime = timestamp;
            const frameDelay = 1000 / this.FPS;
            const deltaTime = timestamp - this.lastTime;
            
            if (deltaTime >= frameDelay) {
                this.lastTime = timestamp - (deltaTime % frameDelay);

                if (!this.gameOver && !this.gameWon) {
                    this.update();
                    this.draw();
                }
            }
            animationFrameId = requestAnimationFrame(t => this.loop(t));
        }

        update() {
            this.frameCount++;
            this.player.update();
            this.ghosts.forEach(g => g.update());
            this.checkCollisions();
        }

        draw() {
            const ctx = this.ctx;
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            // Carte
            for (let y = 0; y < this.map.length; y++) {
                for (let x = 0; x < this.map[y].length; x++) {
                    const cell = this.map[y][x];
                    if (cell === 1) {
                        ctx.fillStyle = "#1919A6"; 
                        ctx.fillRect(x*TILE, y*TILE, TILE, TILE);
                        ctx.strokeStyle = "#5555FF"; 
                        ctx.strokeRect(x*TILE+4, y*TILE+4, TILE-8, TILE-8);
                    } else if (cell === 0) {
                        ctx.fillStyle = "#ffb8ae"; 
                        ctx.fillRect(x*TILE + 9, y*TILE + 9, 3, 3);
                    } else if (cell === 3) {
                        if (Math.floor(Date.now() / 200) % 2 === 0) {
                            ctx.fillStyle = "#ffb8ae";
                            ctx.beginPath();
                            ctx.arc(x*TILE+10, y*TILE+10, 7, 0, Math.PI*2);
                            ctx.fill();
                        }
                    } else if (cell === 9) {
                        ctx.fillStyle = "pink";
                        ctx.fillRect(x*TILE, y*TILE+9, TILE, 2);
                    }
                }
            }

            this.player.draw(ctx);
            this.ghosts.forEach(g => g.draw(ctx));
        }

        addScore(val) {
            this.score += val;
            score = this.score; // Sync Svelte UI
        }

        updateStatus(text, color) {
            statusText = text;
            statusColor = color;
        }

        activatePowerMode() {
            this.powerMode = true;
            this.updateStatus("CHASSE !", "cyan");
            
            const startTime = Date.now();
            
            const checkTimer = () => {
                if (!this.powerMode || !this.running) return;
                const elapsed = Date.now() - startTime;
                this.powerTimer = 6000 - elapsed;
                
                if (elapsed >= 6000) {
                    this.powerMode = false;
                    this.updateStatus("", "");
                } else {
                   this.powerTimeoutIdx = requestAnimationFrame(checkTimer);
                }
            };
            checkTimer();
        }

        checkCollisions() {
            const hitDist = TILE * 0.6;
            this.ghosts.forEach(g => {
                if (Math.abs(this.player.x - g.x) < hitDist && Math.abs(this.player.y - g.y) < hitDist) {
                    if (this.powerMode) {
                        g.x = 10 * TILE; g.y = 9 * TILE; // Retour cage
                        this.addScore(200);
                    } else {
                        this.gameOver = true;
                        this.updateStatus("PERDU ! (ESPACE)", "red");
                    }
                }
            });
        }

        nextLevel() {
            this.gameWon = true;
            this.level++;
            this.FPS += 2;
            this.updateStatus("NIVEAU TERMINÉ !", "#00ff00");
            
            setTimeout(() => {
                if(this.running) this.initGame(false);
            }, 2000);
        }

        handleInput(key) {
            if (key === "ArrowLeft") { this.player.nextDx = -1; this.player.nextDy = 0; }
            if (key === "ArrowRight") { this.player.nextDx = 1; this.player.nextDy = 0; }
            if (key === "ArrowUp") { this.player.nextDx = 0; this.player.nextDy = -1; }
            if (key === "ArrowDown") { this.player.nextDx = 0; this.player.nextDy = 1; }
            
            if (key === " " && this.gameOver) {
                this.initGame(true);
            }
        }
    }

    // --- Lifecycle ---
    onMount(() => {
        engine = new PacmanEngine(canvasEl);
        engine.start();
    });

    onDestroy(() => {
        if(engine) engine.stop();
    });

    function handleKeydown(e) {
        if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight", " "].indexOf(e.key) > -1) {
            e.preventDefault();
        }
        if(engine) engine.handleInput(e.key);
    }

</script>

<svelte:head>
    <title>Pac-Man Arcade</title>
</svelte:head>

<svelte:window on:keydown={handleKeydown} />

<div class="game-container">
    <h1>PAC-MAN ARCADE</h1>
    
    <div id="game-wrapper">
        <canvas bind:this={canvasEl} width="400" height="420"></canvas>
    </div>

    <div id="ui">
        <span>SCORE: <span>{score}</span></span>
        <span id="status" style="color: {statusColor}">{statusText}</span>
    </div>
    
    <div class="controls">
        FLÈCHES pour jouer<br>
        ESPACE pour recommencer
    </div>
</div>

<style>
    .game-container {
        background-color: #111;
        color: white;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        margin: 0;
        font-family: 'Courier New', monospace;
        overflow: hidden;
        user-select: none;
        width: 100vw;
    }

    h1 {
        color: #FFD700;
        text-shadow: 4px 4px 0px #900;
        margin-bottom: 10px;
        font-size: 32px;
        text-transform: uppercase;
        letter-spacing: 2px;
        text-align: center;
    }

    #game-wrapper {
        position: relative;
        border: 6px double #1919A6;
        box-shadow: 0 0 20px #1919A6, inset 0 0 50px rgba(0,0,0,0.8);
        background: black;
        padding: 2px;
    }

    canvas { display: block; }

    #ui {
        width: 400px;
        display: flex;
        justify-content: space-between;
        margin-top: 15px;
        font-size: 18px;
        font-weight: bold;
        font-family: monospace;
        text-transform: uppercase;
    }

    #status {
        text-align: right;
        min-height: 1.2em; /* Empêche le saut si vide */
    }

    .controls {
        margin-top: 15px;
        font-size: 14px;
        color: #666;
        text-align: center;
        line-height: 1.5;
    }
</style>