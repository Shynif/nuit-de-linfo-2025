<script>
    import { onMount, onDestroy } from 'svelte';

    // --- Références DOM ---
    let canvasEl;
    let scoreEl, highEl;
    let overlayEl, titleEl, subtitleEl, restartBtnEl;
    let bsodEl, eventMsgEl, thinkingEl;
    let modeBadgeEl, hudEl;
    let audioEat, audioMode, audioError;

    // --- Variables de gestion ---
    let engine;
    let animationFrameId;

    // --- Utilitaires ---
    const rand = (a, b) => Math.floor(Math.random() * (b - a) + a);
    const chance = (p) => Math.random() < p;

    // --- Classes du Jeu ---

    class GameState {
        constructor() {
            // Vérification SSR pour localStorage
            const storedHigh = typeof localStorage !== 'undefined' ? localStorage.getItem('snakeHigh') : 0;
            this.high = parseInt(storedHigh) || 0;
            this.resetAll();
        }

        resetAll() {
            this.snake = [{x:10,y:10},{x:9,y:10},{x:8,y:10}];
            this.vel = {x:1,y:0};
            this.nextVel = {x:1,y:0};

            this.food = {x:5,y:5};
            this.poison = null;
            this.poisonLifetime = 0;

            this.mode = "windows";
            this.speed = 130;
            this.windowsSlow = false;
            this.linuxBoost = 1;
            this.lag = 0;

            this.rootMode = false;
            this.corruptBlocks = [];
            this.corruptState = "NONE";
            this.portals = null;
            this.portalLifetime = 0;

            this.reverseControls = false;
            this.canTurn = true;

            this.score = 0;
            this.running = false;
            this.paused = false;
            this.waitingForStart = false;

            this.lastMove = 0;
            this.shake = 0;
            this.flash = 0;

            if(thinkingEl) thinkingEl.style.opacity = 0;
            if(bsodEl) bsodEl.style.display = "none";
        }

        saveHighScore() {
            if (this.score > this.high) {
                this.high = this.score;
                if(typeof localStorage !== 'undefined') {
                    localStorage.setItem('snakeHigh', this.high);
                }
                return true;
            }
            return false;
        }
    }

    class Renderer {
        constructor(ctx, canvas) {
            this.ctx = ctx;
            this.canvas = canvas;
            this.animTime = 0;
        }

        updateCanvasStyle(mode, rootMode) {
            const canvas = this.canvas;
            if (rootMode) {
                canvas.style.borderColor = "#ffee44";
                canvas.style.boxShadow = "0 0 30px rgba(255, 238, 68, 0.5)";
            } else if (mode === "linux") {
                canvas.style.borderColor = "#ff0033";
                canvas.style.boxShadow = "0 0 30px rgba(255, 0, 51, 0.5)";
            } else {
                canvas.style.borderColor = "#00f3ff";
                canvas.style.boxShadow = "0 0 30px rgba(0, 243, 255, 0.3)";
            }
        }

        draw(g) {
            const ctx = this.ctx;
            ctx.fillStyle = g.flash > 0 ? "#330000" : (g.mode === "linux" ? "#0a0a0a" : "#050510");
            if (g.flash > 0) g.flash--;

            ctx.fillRect(0, 0, 800, 600);

            ctx.save();
            if (g.shake > 0) {
                ctx.translate((Math.random() - .5) * g.shake, (Math.random() - .5) * g.shake);
                g.shake = Math.max(0, g.shake - 0.5);
            }

            this.grid(g);
            this.corruption(g);
            this.portals(g);
            this.poison(g);
            this.food(g);
            this.snake(g);

            ctx.restore();
            this.scanlines();
        }

        grid(g) {
            const ctx = this.ctx;
            ctx.strokeStyle = g.mode === "linux" ? "rgba(57, 255, 20, 0.1)" : "rgba(0,243,255,0.08)";
            ctx.lineWidth = 1;
            for (let x = 0; x < 800; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 600); ctx.stroke(); }
            for (let y = 0; y < 600; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(800, y); ctx.stroke(); }
        }

        corruption(g) {
            if (g.corruptBlocks.length === 0) return;
            const ctx = this.ctx;
            ctx.shadowBlur = 12;
            const colors = ["#ff0055", "#ff00ff", "#00f3ff"];
            for (const b of g.corruptBlocks) {
                for (let i = 0; i < 4; i++) {
                    for (let j = 0; j < 4; j++) {
                        ctx.fillStyle = colors[rand(0, 3)];
                        ctx.fillRect((b.x + i) * 20 + 1, (b.y + j) * 20 + 1, 18, 18);
                    }
                }
            }
            ctx.shadowBlur = 0;
        }

        portals(g) {
            if (!g.portals) return;
            const ctx = this.ctx;
            ctx.shadowBlur = 15;
            ctx.strokeStyle = "#ffaa00";
            ctx.lineWidth = 3;
            [g.portals.a, g.portals.b].forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x * 20 + 10, p.y * 20 + 10, 12, 0, Math.PI * 2);
                ctx.stroke();
            });
            ctx.shadowBlur = 0;
        }

        poison(g) {
            if (!g.poison) return;
            const ctx = this.ctx;
            ctx.fillStyle = "#00ff44";
            ctx.shadowBlur = 20;
            ctx.shadowColor = "#00ff44";
            ctx.beginPath();
            ctx.arc(g.poison.x * 20 + 10, g.poison.y * 20 + 10, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        food(g) {
            const ctx = this.ctx;
            const X = g.food.x * 20, Y = g.food.y * 20;
            const Cx = X + 10, Cy = Y + 10;
            this.animTime += 0.1;
            const p = Math.sin(this.animTime) * 2;

            ctx.fillStyle = "#ff00ff";
            ctx.shadowBlur = 15;
            ctx.shadowColor = "#ff00ff";

            ctx.beginPath();
            ctx.moveTo(Cx, Y + 2 - p);
            ctx.lineTo(X + 18 + p, Cy);
            ctx.lineTo(Cx, Y + 18 + p);
            ctx.lineTo(X + 2 - p, Cy);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        snake(g) {
            const ctx = this.ctx;
            ctx.shadowBlur = 15;
            let col = g.mode === "linux" ? "#ff0033" : "#00f3ff";
            if (g.rootMode) col = "#ffee44";
            if (g.reverseControls) col = "#00ff44";

            ctx.shadowColor = col;
            g.snake.forEach((s, i) => {
                ctx.fillStyle = i === 0 ? "#ffffff" : col;
                ctx.fillRect(s.x * 20 + 1, s.y * 20 + 1, 18, 18);
            });
            ctx.shadowBlur = 0;
        }

        scanlines() {
            const ctx = this.ctx;
            ctx.fillStyle = "rgba(255,255,255,.03)";
            for (let i = 0; i < 600; i += 4) ctx.fillRect(0, i, 800, 1);
        }
    }

    class GameEngine {
        constructor() {
            this.ctx = canvasEl.getContext("2d");
            this.state = new GameState();
            this.renderer = new Renderer(this.ctx, canvasEl);
            this.modeTimer = null;
            this.firstLaunch = true;
        }

        triggerPopup(text, color="#ff00ff"){
            if(!eventMsgEl) return;
            eventMsgEl.textContent = text;
            eventMsgEl.style.color = color;
            eventMsgEl.style.opacity = 1;
            setTimeout(() => {
                if(eventMsgEl) eventMsgEl.style.opacity = 0;
            }, 1800);
        }

        restart() {
            clearTimeout(this.modeTimer);
            if (animationFrameId) cancelAnimationFrame(animationFrameId);

            this.state.resetAll();
            scoreEl.textContent = 0;
            highEl.textContent = this.state.high;

            if (this.firstLaunch) {
                this.state.waitingForStart = true;
                this.showStartScreen();
                this.firstLaunch = false;
            } else {
                this.state.waitingForStart = false;
                this.start();
            }
        }

        showStartScreen() {
            titleEl.textContent = "🐍 HIDDEN SNAKE 🐍";
            subtitleEl.textContent = "Press SPACE or click START to begin";
            restartBtnEl.textContent = "START";
            restartBtnEl.style.color = "#00ff66";
            restartBtnEl.style.borderColor = "#00ff66";
            overlayEl.style.display = "block";

            this.updateUIColors();
            this.renderer.draw(this.state);
        }

        start() {
            this.state.running = true;
            this.state.waitingForStart = false;
            overlayEl.style.display = "none";
            this.scheduleMode();
            this.updateUIColors();
            this.loop(0);
        }

        loop(t) {
            if (!this.state.running) return;

            if (this.state.paused) {
                this.renderer.draw(this.state);
                animationFrameId = requestAnimationFrame(t => this.loop(t));
                return;
            }

            if (this.state.windowsSlow && this.state.lag > 0) {
                this.state.lag--;
                this.renderer.draw(this.state);
                animationFrameId = requestAnimationFrame(t => this.loop(t));
                return;
            }

            if (!this.state.lastMove || t - this.state.lastMove > this.state.speed) {
                this.update();
                this.state.lastMove = t;
            }

            this.renderer.draw(this.state);
            animationFrameId = requestAnimationFrame(t => this.loop(t));
        }

        update() {
            const g = this.state;
            g.canTurn = true;

            g.vel = { ...g.nextVel };

            let head = { x: g.snake[0].x + g.vel.x, y: g.snake[0].y + g.vel.y };

            if (g.rootMode) {
                if (head.x < 0) head.x = 39;
                if (head.x > 39) head.x = 0;
                if (head.y < 0) head.y = 29;
                if (head.y > 29) head.y = 0;
            } else {
                if (head.x < 0 || head.x > 39 || head.y < 0 || head.y > 29) return this.crash("wall");
            }

            if (!g.rootMode && g.snake.some(s => s.x === head.x && s.y === head.y)) {
                return this.crash("self");
            }

            for (const b of g.corruptBlocks) {
                if (head.x >= b.x && head.x < b.x + 4 && head.y >= b.y && head.y < b.y + 4) {
                    return this.crash("corrupt");
                }
            }

            if (g.portals) {
                if (head.x === g.portals.a.x && head.y === g.portals.a.y) head = { ...g.portals.b };
                else if (head.x === g.portals.b.x && head.y === g.portals.b.y) head = { ...g.portals.a };
            }

            g.snake.unshift(head);

            if (head.x === g.food.x && head.y === g.food.y) {
                audioEat.play().catch(() => {});
                g.score += (g.mode === "linux" ? 20 : 10);
                scoreEl.textContent = g.score;
                this.placeFood();
            }
            else if (g.poison && head.x === g.poison.x && head.y === g.poison.y) {
                g.score = Math.max(0, g.score - 20);
                scoreEl.textContent = g.score;

                g.reverseControls = true;
                g.windowsSlow = true;
                g.lag = 15;
                g.poison = null;

                this.triggerPopup("CRITICAL UPDATE // CONTROLS INVERTED", "#00ff44");
                g.snake.pop();
            }
            else {
                g.snake.pop();
            }
        }

        placeFood() {
            const g = this.state;
            let ok = false, attempts = 0;
            while (!ok && attempts < 100) {
                g.food.x = rand(0, 40);
                g.food.y = rand(0, 30);
                ok = !g.snake.some(s => s.x === g.food.x && s.y === g.food.y)
                    && (!g.poison || (g.food.x !== g.poison.x || g.food.y !== g.poison.y));
                attempts++;
            }
            if (g.mode === "windows" && chance(0.60)) this.spawnPoison();
        }

        spawnPoison() {
            const g = this.state;
            let p = {}, ok = false, attempts = 0;
            while (!ok && attempts < 100) {
                p.x = rand(0, 40); p.y = rand(0, 30);
                ok = !g.snake.some(s => s.x === p.x && s.y === p.y)
                    && !(g.food.x === p.x && g.food.y === p.y)
                    && !g.corruptBlocks.some(b => p.x >= b.x - 1 && p.x < b.x + 5 && p.y >= b.y - 1 && p.y < b.y + 5);
                attempts++;
            }
            if (!ok) return;

            g.poison = p;
            g.poisonLifetime = 3;
            this.triggerPopup("MALWARE DETECTED // Do not eat", "#00ff44");
        }

        scheduleMode() {
            clearTimeout(this.modeTimer);
            const g = this.state;
            const d = g.mode === "windows" ? rand(4000, 7000) : rand(6000, 10000);
            this.modeTimer = setTimeout(() => this.switchMode(), d);
        }

        switchMode() {
            const g = this.state;
            if (g.paused) {
                this.scheduleMode();
                return;
            }
            audioMode.play().catch(() => {});

            if (g.poison) {
                g.poisonLifetime--;
                if (g.poisonLifetime <= 0) { g.poison = null; g.reverseControls = false; }
            }
            if (g.portals) {
                g.portalLifetime--;
                if (g.portalLifetime <= 0) g.portals = null;
            }

            if (g.mode === "windows") {
                this.enterLinux();
                if (g.corruptState === "WINDOWS_CREATED") g.corruptState = "LINUX_ACTIVE";
                else if (g.corruptState === "LINUX_ACTIVE") { g.corruptBlocks = []; g.corruptState = "NONE"; }
            } else {
                this.enterWindows();
            }

            this.scheduleMode();
        }

        enterWindows() {
            const g = this.state;
            g.mode = "windows";
            g.rootMode = false;

            if (chance(0.25)) {
                g.windowsSlow = true; g.speed = 300; g.lag = 20;
                if(thinkingEl){
                    thinkingEl.style.opacity = 1; 
                    setTimeout(() => { if(thinkingEl) thinkingEl.style.opacity = 0; }, 1200);
                }
            } else {
                g.windowsSlow = false; g.speed = 130;
            }

            if (chance(0.70)) { this.spawnCorruption(); g.corruptState = "WINDOWS_CREATED"; }
            if (chance(0.50)) this.spawnPoison();

            this.updateBadge();
            this.updateUIColors();
        }

        enterLinux() {
            const g = this.state;
            g.mode = "linux";
            g.reverseControls = false;

            const r = Math.random();
            if (r < 0.4) { g.linuxBoost = 1.5; g.speed = 80; }
            else if (r < 0.7) { g.linuxBoost = 2; g.speed = 60; }
            else if (r < 0.9) { g.linuxBoost = 3; g.speed = 40; }
            else { this.enableRoot(); }

            if (chance(0.25)) this.spawnPortals();
            this.updateBadge();
            this.updateUIColors();
        }

        enableRoot() {
            const g = this.state;
            g.rootMode = true; g.linuxBoost = 4; g.speed = 30; g.shake = 10;
            this.triggerPopup("SUDO SU // ROOT ACCESS GRANTED", "#ffee44");
        }

        spawnCorruption() {
            const g = this.state;
            g.corruptBlocks = [];
            const n = rand(2, 5);
            for (let i = 0; i < n; i++) {
                let b = { x: rand(0, 36), y: rand(0, 26) };
                if (Math.abs(b.x - g.snake[0].x) > 5 && Math.abs(b.y - g.snake[0].y) > 5)
                    g.corruptBlocks.push(b);
            }
            if (g.corruptBlocks.length > 0) this.triggerPopup("MEMORY DUMP // Corrupted Sectors", "#ff00ff");
        }

        spawnPortals() {
            const g = this.state;
            g.portals = { a: { x: rand(0, 40), y: rand(0, 30) }, b: { x: rand(0, 40), y: rand(0, 30) } };
            g.portalLifetime = 2;
            this.triggerPopup("SSH TUNNEL OPENED", "#ffaa00");
        }

        updateBadge() {
            const g = this.state;
            if (g.mode === "linux") {
                modeBadgeEl.textContent = g.rootMode ? "ROOT USER (#)" : `LINUX // SPEED x${g.linuxBoost}`;
                modeBadgeEl.style.color = g.rootMode ? "#ffee44" : "#ff0033";
                modeBadgeEl.style.borderColor = modeBadgeEl.style.color;
            } else {
                modeBadgeEl.textContent = g.windowsSlow ? "WINDOWS (NOT RESPONDING)" : "WINDOWS // SPEED x1";
                modeBadgeEl.style.color = "#00f3ff";
                modeBadgeEl.style.borderColor = "#00f3ff";
            }
        }

        updateUIColors() {
            const g = this.state;
            if (g.rootMode) {
                hudEl.style.color = "#ffee44";
            } else if (g.mode === "linux") {
                hudEl.style.color = "#ff0033";
            } else {
                hudEl.style.color = "#00f3ff";
            }

            this.renderer.updateCanvasStyle(g.mode, g.rootMode);
        }

        crash(type) {
            const g = this.state;
            g.running = false;
            clearTimeout(this.modeTimer);
            if (animationFrameId) cancelAnimationFrame(animationFrameId);

            g.saveHighScore();
            highEl.textContent = g.high;

            if (g.mode === "windows") {
                audioError.play().catch(() => {});
                bsodEl.style.display = "block";
                setTimeout(() => {
                    bsodEl.style.display = "none";
                    titleEl.textContent = "SYSTEM FAILURE";
                    subtitleEl.textContent = `Final Score: ${g.score} | High Score: ${g.high}`;
                    restartBtnEl.textContent = "REBOOT SYSTEM";
                    restartBtnEl.style.borderColor = "#00f3ff"; restartBtnEl.style.color = "#00f3ff";
                    overlayEl.style.display = "block";
                }, 2500);
            } else {
                titleEl.textContent = "KERNEL PANIC";
                subtitleEl.textContent = `Final Score: ${g.score} | High Score: ${g.high}`;
                restartBtnEl.textContent = "SUDO REBOOT";
                restartBtnEl.style.borderColor = "#ff0033"; restartBtnEl.style.color = "#ff0033";
                overlayEl.style.display = "block";
            }
        }
    }

    // --- Lifecycle ---

    onMount(() => {
        engine = new GameEngine();
        engine.restart();
    });

    onDestroy(() => {
        if(engine) clearTimeout(engine.modeTimer);
        if(animationFrameId) cancelAnimationFrame(animationFrameId);
    });

    // --- Event Handling ---

    function handleKeydown(e) {
        if (!engine) return;
        const g = engine.state;

        if (e.code === "Space") {
            e.preventDefault();
            if (g.waitingForStart) return engine.start();
            if (!g.running && overlayEl.style.display !== "none") return engine.restart();

            g.paused = !g.paused;
            titleEl.textContent = "SYSTEM PAUSED";
            subtitleEl.textContent = "Press SPACE to resume";
            overlayEl.style.display = g.paused ? "block" : "none";
            return;
        }

        if (!g.running || g.paused || !g.canTurn) return;

        const inv = g.reverseControls ? -1 : 1;
        let moved = false;

        if (e.key === "ArrowUp" && g.vel.y === 0) {
            e.preventDefault(); g.nextVel = { x: 0, y: -1 * inv }; moved = true;
        }
        else if (e.key === "ArrowDown" && g.vel.y === 0) {
            e.preventDefault(); g.nextVel = { x: 0, y: 1 * inv }; moved = true;
        }
        else if (e.key === "ArrowLeft" && g.vel.x === 0) {
            e.preventDefault(); g.nextVel = { x: -1 * inv, y: 0 }; moved = true;
        }
        else if (e.key === "ArrowRight" && g.vel.x === 0) {
            e.preventDefault(); g.nextVel = { x: 1 * inv, y: 0 }; moved = true;
        }

        if (moved) g.canTurn = false;
    }

    function handleRestartClick() {
        const g = engine.state;
        if (g.waitingForStart) {
            engine.start();
        } else {
            engine.restart();
        }
    }

</script>

<svelte:head>
    <title>HIDDEN SNAKE</title>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap" rel="stylesheet">
</svelte:head>

<svelte:window on:keydown={handleKeydown} />

<div class="game-container">
    <audio bind:this={audioEat} preload="auto" src="https://cdn.pixabay.com/download/audio/2021/08/09/audio_5668bcb3cc.mp3"></audio>
    <audio bind:this={audioMode} preload="auto" src="https://cdn.pixabay.com/download/audio/2022/03/15/audio_1e1c6fba79.mp3"></audio>
    <audio bind:this={audioError} preload="auto" src="https://cdn.pixabay.com/download/audio/2022/03/15/audio_49cb42cc92.mp3"></audio>

    <div class="ui">
        <h1>HIDDEN SNAKE</h1>
        <div bind:this={modeBadgeEl} class="badge">WINDOWS // SPEED x1</div>
        <div bind:this={hudEl} class="hud">
            <div>SCORE: <span bind:this={scoreEl}>0</span></div>
            <div>HIGH: <span bind:this={highEl}>0</span></div>
        </div>
    </div>

    <div bind:this={thinkingEl} id="thinking">WINDOWS IS THINKING…</div>
    <div bind:this={eventMsgEl} id="eventMsg">EVENT</div>

    <canvas bind:this={canvasEl} width="800" height="600"></canvas>

    <div bind:this={overlayEl} class="overlay">
        <h2 bind:this={titleEl}>SYSTEM PAUSED</h2>
        <p bind:this={subtitleEl} style="margin-top: 15px; font-size: 1.1rem; color: #00f3ff;"></p>
        <button bind:this={restartBtnEl} on:click={handleRestartClick}>RESTART</button>
    </div>

    <div bind:this={bsodEl} id="bsod">
        <h1>:(</h1>
        <p style="font-size:1.5rem">Your PC ran into a problem and needs to restart.</p><br><br>
        <p>FATAL EXCEPTION: SNAKE_PROCESS_DIED</p>
        <p>ERROR CODE : 0x0000-SKILL-ISSUE</p><br>
        <p>Sending crash report to Microsoft... 0%</p>
    </div>
</div>

<style>
    :root {
        --blue: #00f3ff;
        --pink: #ff00ff;
        --red: #ff0033;
        --green: #00ff66;
        --yellow: #ffee44;
        --bg: #050510;
        --error-blue: #0e3aa5;
    }

    /* Le conteneur principal remplace le body de l'original */
    .game-container {
        font-family: 'Orbitron', sans-serif;
        background: var(--bg);
        color: white;
        height: 92vh;
        width: 100vw;
        display: flex;
        justify-content: center;
        align-items: center;
        overflow: hidden;
        position: relative;
    }

    .game-container::after {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
            linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, .25) 50%),
            linear-gradient(90deg, rgba(255, 0, 0, .06), rgba(0, 255, 0, .03), rgba(0, 0, 255, .06));
        background-size: 100% 2px, 3px 100%;
        z-index: 10;
    }

    .ui {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        padding: 20px;
        z-index: 20;
        pointer-events: none;
    }

    h1 {
        text-align: center;
        font-size: 3rem;
        background: linear-gradient(90deg, var(--blue), var(--pink));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        text-shadow: 0 0 20px rgba(0, 243, 255, 0.3);
        margin: 0;
    }

    .badge {
        margin: 10px auto;
        padding: 6px 20px;
        background: rgba(0, 0, 0, .6);
        border: 1px solid var(--blue);
        border-radius: 6px;
        color: var(--blue);
        width: fit-content;
        box-shadow: 0 0 10px rgba(0, 243, 255, 0.2);
        transition: all 0.3s ease;
    }

    .hud {
        display: flex;
        justify-content: space-between;
        font-size: 1.4rem;
        margin-top: 8px;
        transition: color 0.3s ease;
    }

    canvas {
        background: #0e1126;
        display: block;
        transition: border-color 0.3s ease, box-shadow 0.3s ease;
    }

    .overlay {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, .9);
        border: 1px solid var(--pink);
        padding: 40px;
        display: none;
        text-align: center;
        z-index: 200;
        box-shadow: 0 0 30px var(--pink);
    }

    button {
        margin-top: 20px;
        padding: 14px 30px;
        border: 2px solid var(--blue);
        background: transparent;
        color: var(--blue);
        cursor: pointer;
        font-size: 1.2rem;
        transition: .2s;
        font-family: 'Orbitron', sans-serif;
    }

    button:hover {
        background: var(--blue);
        color: black;
        box-shadow: 0 0 20px var(--blue);
    }

    #eventMsg,
    #thinking {
        position: absolute;
        top: 55%;
        left: 50%;
        transform: translate(-50%, -50%);
        opacity: 0;
        font-size: 1.4rem;
        text-align: center;
        z-index: 300;
        transition: .3s;
        pointer-events: none;
        text-shadow: 0 0 10px currentColor;
    }

    #bsod {
        position: absolute;
        inset: 0;
        background: var(--error-blue);
        display: none;
        color: white;
        z-index: 500;
        padding: 40px;
        font-family: 'Courier New', monospace;
    }

    #bsod h1 {
        font-size: 6rem;
        margin-bottom: 20px;
        color: white;
        background: none;
        -webkit-text-fill-color: white;
        text-align: left;
    }
</style>