<script>
    import { onMount, onDestroy } from 'svelte';

    // --- Références DOM ---
    let canvasEl;
    let nextCanvasEl;
    
    // --- État Réactif Svelte ---
    let score = 0;
    let topScore = 0;
    let level = 1;

    // --- Variables de gestion ---
    let engine;
    let animationFrameId;

    // --- Constantes et Utilitaires ---
    const COLORS = [
        null,
        '#D73027', // T (Rouge)
        '#4575B4', // J (Bleu foncé)
        '#FDAE61', // Z (Orange clair)
        '#FEE090', // O (Jaune pâle)
        '#ABD9E9', // S (Bleu ciel)
        '#E0F3F8', // L (Gris bleu clair)
        '#313695', // I (Bleu très foncé)
    ];

    const PIECES_STR = 'ILJOTSZ';

    function createPiece(type) {
        if (type === 'I') return [[0, 7, 0, 0],[0, 7, 0, 0],[0, 7, 0, 0],[0, 7, 0, 0]];
        if (type === 'L') return [[0, 6, 0],[0, 6, 0],[0, 6, 6]];
        if (type === 'J') return [[0, 2, 0],[0, 2, 0],[2, 2, 0]];
        if (type === 'O') return [[4, 4],[4, 4]];
        if (type === 'Z') return [[3, 3, 0],[0, 3, 3],[0, 0, 0]];
        if (type === 'S') return [[0, 5, 5],[5, 5, 0],[0, 0, 0]];
        if (type === 'T') return [[0, 1, 0],[1, 1, 1],[0, 0, 0]];
    }

    function createMatrix(w, h) {
        const matrix = [];
        while (h--) matrix.push(new Array(w).fill(0));
        return matrix;
    }

    function collide(arena, player) {
        const m = player.matrix;
        const o = player.pos;
        for (let y = 0; y < m.length; ++y) {
            for (let x = 0; x < m[y].length; ++x) {
                if (m[y][x] !== 0 && (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
                    return true;
                }
            }
        }
        return false;
    }

    // --- Moteur du Jeu ---
    class TetrisEngine {
        constructor(mainCanvas, previewCanvas) {
            this.canvas = mainCanvas;
            this.context = mainCanvas.getContext('2d');
            this.context.scale(20, 20);

            this.nextCanvas = previewCanvas;
            this.nextContext = previewCanvas.getContext('2d');
            this.nextContext.scale(20, 20);

            this.arena = createMatrix(12, 20);
            
            this.player = {
                pos: {x: 0, y: 0},
                matrix: null,
                score: 0
            };

            // Gestion de la prochaine pièce
            this.nextPiece = createPiece(PIECES_STR[PIECES_STR.length * Math.random() | 0]);

            // Gestion du temps
            this.dropCounter = 0;
            this.dropInterval = 1000;
            this.lastTime = 0;
            this.isPaused = false;
            this.running = false;

            // Chargement du High Score
            if (typeof localStorage !== 'undefined') {
                topScore = parseInt(localStorage.getItem('tetrisTopScore')) || 0;
            }
        }

        start() {
            this.running = true;
            this.playerReset();
            this.updateScoreUI();
            this.loop(0);
        }

        stop() {
            this.running = false;
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        }

        loop(time = 0) {
            if (!this.running) return;

            if (!this.isPaused) {
                const deltaTime = time - this.lastTime;
                this.lastTime = time;
                this.dropCounter += deltaTime;
                if (this.dropCounter > this.dropInterval) {
                    this.playerDrop();
                }
                this.draw();
            }
            
            animationFrameId = requestAnimationFrame((t) => this.loop(t));
        }

        drawMatrix(matrix, offset, ctx) {
            matrix.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value !== 0) {
                        // Bloc principal
                        ctx.fillStyle = COLORS[value];
                        ctx.fillRect(x + offset.x, y + offset.y, 1, 1);

                        // Effet pixel
                        ctx.lineWidth = 0.05;
                        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
                        ctx.strokeRect(x + offset.x + 0.025, y + offset.y + 0.025, 0.95, 0.95);

                        // Reflet
                        ctx.fillStyle = "rgba(255,255,255,0.4)";
                        ctx.fillRect(x + offset.x, y + offset.y, 0.2, 0.2);
                    }
                });
            });
        }

        draw() {
            // Effacer le canvas principal
            this.context.fillStyle = '#000';
            this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.drawMatrix(this.arena, {x: 0, y: 0}, this.context);
            this.drawMatrix(this.player.matrix, this.player.pos, this.context);
        }

        drawNextPiece() {
            // Effacer le canvas de prévisualisation
            this.nextContext.fillStyle = '#000';
            this.nextContext.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);

            const matrix = this.nextPiece;
            const offsetX = (4 - matrix[0].length) / 2;
            const offsetY = (4 - matrix.length) / 2;

            this.drawMatrix(matrix, {x: offsetX, y: offsetY}, this.nextContext);
        }

        merge() {
            this.player.matrix.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value !== 0) {
                        this.arena[y + this.player.pos.y][x + this.player.pos.x] = value;
                    }
                });
            });
        }

        rotate(matrix, dir) {
            for (let y = 0; y < matrix.length; ++y) {
                for (let x = 0; x < y; ++x) {
                    [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
                }
            }
            if (dir > 0) matrix.forEach(row => row.reverse());
            else matrix.reverse();
        }

        arenaSweep() {
            let rowCount = 1;
            outer: for (let y = this.arena.length - 1; y > 0; --y) {
                for (let x = 0; x < this.arena[y].length; ++x) {
                    if (this.arena[y][x] === 0) continue outer;
                }
                const row = this.arena.splice(y, 1)[0].fill(0);
                this.arena.unshift(row);
                ++y;
                
                this.player.score += rowCount * 10;
                rowCount *= 2;
            }
        }

        playerReset() {
            this.player.matrix = this.nextPiece;
            this.nextPiece = createPiece(PIECES_STR[PIECES_STR.length * Math.random() | 0]);
            
            this.player.pos.y = 0;
            this.player.pos.x = (this.arena[0].length / 2 | 0) - (this.player.matrix[0].length / 2 | 0);

            this.drawNextPiece();

            if (collide(this.arena, this.player)) {
                // Game Over
                if (this.player.score > topScore) {
                    topScore = this.player.score;
                    if (typeof localStorage !== 'undefined') {
                        localStorage.setItem('tetrisTopScore', topScore);
                    }
                }
                this.arena.forEach(row => row.fill(0));
                this.player.score = 0;
                this.updateScoreUI();
            }
        }

        playerDrop() {
            this.player.pos.y++;
            if (collide(this.arena, this.player)) {
                this.player.pos.y--;
                this.merge();
                this.playerReset();
                this.arenaSweep();
                this.updateScoreUI();
            }
            this.dropCounter = 0;
        }

        playerMove(dir) {
            this.player.pos.x += dir;
            if (collide(this.arena, this.player)) {
                this.player.pos.x -= dir;
            }
        }

        playerRotate(dir) {
            const pos = this.player.pos.x;
            let offset = 1;
            this.rotate(this.player.matrix, dir);
            while (collide(this.arena, this.player)) {
                this.player.pos.x += offset;
                offset = -(offset + (offset > 0 ? 1 : -1));
                if (offset > this.player.matrix[0].length) {
                    this.rotate(this.player.matrix, -dir);
                    this.player.pos.x = pos;
                    return;
                }
            }
        }

        togglePause() {
            this.isPaused = !this.isPaused;
            if (!this.isPaused) this.lastTime = performance.now();
        }

        updateScoreUI() {
            // Mise à jour des variables réactives Svelte
            score = this.player.score;
        }
    }

    // --- Cycle de vie Svelte ---

    onMount(() => {
        engine = new TetrisEngine(canvasEl, nextCanvasEl);
        engine.start();
    });

    onDestroy(() => {
        if (engine) engine.stop();
    });

    // --- Gestion des Contrôles ---

    function handleKeydown(event) {
        if (!engine) return;

        // Espace pour Pause
        if (event.keyCode === 32) {
            event.preventDefault(); // Empêche le scroll
            engine.togglePause();
            return;
        }

        if (engine.isPaused) return;

        if (event.keyCode === 37) { // Gauche
            event.preventDefault();
            engine.playerMove(-1);
        } else if (event.keyCode === 39) { // Droite
            event.preventDefault();
            engine.playerMove(1);
        } else if (event.keyCode === 40) { // Bas
            event.preventDefault();
            engine.playerDrop();
        } else if (event.keyCode === 81) { // Q (Rot Gauche)
            engine.playerRotate(-1);
        } else if (event.keyCode === 38 || event.keyCode === 87) { // Haut ou W (Rot Droite)
            event.preventDefault();
            engine.playerRotate(1);
        }
    }

    // Fonction de formatage pour l'affichage (000123)
    $: formattedScore = score.toString().padStart(6, '0');
    $: formattedTopScore = topScore.toString().padStart(6, '0');
    $: formattedLevel = level.toString().padStart(2, '0');

</script>

<svelte:head>
    <title>Tetris NES</title>
    <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
</svelte:head>

<svelte:window on:keydown={handleKeydown} />

<div class="tetris-wrapper">
    <div id="main-container">
        <div id="game-panel" class="nes-panel">
            <div class="panel-title">LINES-000</div>
            <canvas bind:this={canvasEl} width="240" height="400"></canvas>
        </div>
    
        <div id="sidebar">
            <div id="score-panel" class="nes-panel">
                <span class="score-label">TOP</span>
                <span class="score-value">{formattedTopScore}</span>
                <span class="score-label">SCORE</span>
                <span class="score-value">{formattedScore}</span>
            </div>
    
            <div id="next-piece-panel" class="nes-panel">
                <div class="panel-title">NEXT</div>
                <canvas bind:this={nextCanvasEl} width="80" height="80"></canvas>
            </div>
    
            <div class="nes-panel level-panel">
                <div class="panel-title">LEVEL</div>
                <div style="font-size: 14px;">{formattedLevel}</div>
            </div>
        </div>
    </div>
    
    <div class="controls-info">
        <p>← / → : Bouger | ↓ : Descendre</p>
        <p>↑ ou W : Rotation Droite | Q : Rotation Gauche</p>
        <p>Espace : Pause</p>
    </div>
</div>

<style>
    :root {
        --nes-blue: #50c8ff;
        --nes-border-color: #0000bc;
        --nes-bg-color: #202020;
        --pixel-font: 'Press Start 2P', cursive;
    }

    .tetris-wrapper {
        background: #404040;
        background-image: linear-gradient(45deg, #303030 25%, transparent 25%), linear-gradient(-45deg, #303030 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #303030 75%), linear-gradient(-45deg, transparent 75%, #303030 75%);
        background-size: 20px 20px;
        color: #fff;
        font-family: var(--pixel-font);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        width: 100vw;
        margin: 0;
        image-rendering: pixelated;
    }

    #main-container {
        display: flex;
        gap: 10px;
        padding: 10px;
        background-color: var(--nes-border-color);
        border: 3px solid var(--nes-blue);
        box-shadow: 0 0 15px var(--nes-blue);
    }

    .nes-panel {
        background-color: var(--nes-bg-color);
        border: 3px solid var(--nes-blue);
        padding: 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .panel-title {
        font-size: 12px;
        color: var(--nes-blue);
        margin-bottom: 8px;
        text-align: center;
        text-transform: uppercase;
    }

    canvas {
        display: block;
        background-color: #000;
        border: 2px solid #555;
    }

    #sidebar {
        display: flex;
        flex-direction: column;
        gap: 10px;
        width: 140px;
    }

    #score-panel {
        text-align: right;
        font-size: 12px;
    }

    .score-label {
        color: var(--nes-blue);
        display: block;
        margin-top: 5px;
    }

    .score-value {
        display: block;
        color: #fff;
    }

    #next-piece-panel {
        height: 120px;
        justify-content: flex-start;
    }

    #next-piece-canvas {
        margin-top: 5px;
        background-color: #000;
    }
    
    .level-panel {
        flex-grow: 1; 
        justify-content: center;
    }

    .controls-info {
        margin-top: 20px;
        font-size: 10px;
        color: #ccc;
        text-align: center;
        background-color: rgba(0,0,0,0.7);
        padding: 10px;
        border: 2px solid var(--nes-blue);
    }
</style>