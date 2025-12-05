<script lang="ts">
    import './layout.css';
    import favicon from '$lib/assets/favicon.svg';
    import { goto } from '$app/navigation';
    import { tick } from 'svelte';
    import { page } from '$app/stores';

    // --- YOUR EXISTING PROPS ---
    let { children } = $props();

    // --- SOLANGE LOGIC (Svelte 5 Runes) ---
    let isOpen = $state(false);
    let userInput = $state("");
    let isLoading = $state(false);
    
    // Type definition for messages
    type Message = { sender: 'user' | 'solange', text: string };
    let messages = $state<Message[]>([]);
    
    // Reference for auto-scrolling
    let chatMessagesDiv: HTMLDivElement | undefined = $state();

    // 1. The Typing Effect Function
    async function typeWriterEffect(text: string) {
        // Create an empty message for Solange first
        messages = [...messages, { sender: 'solange', text: "" }];
        
        const msgIndex = messages.length - 1;
        
        for (let i = 0; i < text.length; i++) {
            // Update the text of the last message character by character
            messages[msgIndex].text += text[i];
            
            // Auto scroll to bottom
            if (chatMessagesDiv) {
                chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
            }
            
            // Wait a random time between 10ms and 30ms for realism
            await new Promise(r => setTimeout(r, Math.random() * 20 + 10));
        }
    }

    // 2. Send Message Function
    async function sendMessage() {
        if (!userInput.trim()) return;

        const currentPrompt = userInput;
        
        // Add User Message
        messages = [...messages, { sender: 'user', text: currentPrompt }];
        userInput = ""; // Clear input
        isLoading = true;
        
        // Scroll to bottom immediately
        await tick();
        if (chatMessagesDiv) chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: currentPrompt })
            });

            const data = await response.json();
            isLoading = false;

            if (!response.ok) {
                const errorMsg = data.details?.prompt?._errors[0] || data.error || "Erreur inconnue";
                // Type the error too
                await typeWriterEffect(`[Erreur]: ${errorMsg}`);
            } else {
                // Type the success response
                await typeWriterEffect(data.solange_response);
            }
        } catch (e) {
            isLoading = false;
            await typeWriterEffect("*Solange refuse de se connecter (Erreur Réseau)*");
        }
    }
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
</svelte:head>

<header>
    <nav>
        <a href="/">Home</a>
        <a href="/game">Game</a>
        <a href="/leaderboard">Leaderboard</a>
        {#if $page.url.pathname.includes('minijeux')}
            <a href="/minijeux/snake">Snake</a>
            <a href="/minijeux/tetris">Tetris</a>
            <a href="/minijeux/pacman">Pacman</a>
            <a href="/minijeux/space">Space Invader</a>
        {/if}
    </nav>
    <button class="settings-btn" on:click={() => goto('/settings')}>⚙️</button>
</header>

{@render children()}

<div class="solange-widget">
    {#if isOpen}
        <div class="chat-window">
            <div class="chat-header">
                <div class="header-title">
                    <span class="avatar">🧐</span>
                    <span>Pr. Solange</span>
                </div>
                <button on:click={() => isOpen = false} class="close-btn">×</button>
            </div>
            
            <div class="chat-messages" bind:this={chatMessagesDiv}>
                {#if messages.length === 0}
                    <p class="intro">Je vous écoute, mais faites vite.</p>
                {/if}
                
                {#each messages as msg}
                    <div class="message-row {msg.sender}">
                        <div class="message-bubble">
                            {msg.text}
                        </div>
                    </div>
                {/each}

                {#if isLoading}
                    <div class="message-row solange">
                        <div class="message-bubble loading">
                            <span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>
                        </div>
                    </div>
                {/if}
            </div>

            <div class="chat-input-area">
                <input 
                    type="text" 
                    bind:value={userInput} 
                    on:keydown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Dites quelque chose..."
                    disabled={isLoading}
                />
                <button class="send-btn" on:click={sendMessage} disabled={isLoading}>
                    ➤
                </button>
            </div>
        </div>
    {/if}

    {#if !isOpen}
        <button class="toggle-btn" on:click={() => isOpen = true}>
            🧐
        </button>
    {/if}
</div>

<style>
    /* ========================================= */
    /* 1. YOUR EXISTING STYLES (UNCHANGED)       */
    /* ========================================= */
    header {
        background-color: #1a1a2e;
        border-bottom: 2px solid #00c7e2;
        padding: 0.75rem 1.5rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    nav {
        display: flex;
        gap: 2rem;
        font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif;
        font-weight: 500;
    }

    .settings-btn {
        background: none;
        border: none;
        font-size: 1.5em;
        cursor: pointer;
        transition: transform 0.2s ease;
        padding: 0.25rem;
    }

    .settings-btn:hover {
        transform: rotate(20deg);
    }

    nav a {
        color: #ffffff;
        text-decoration: none;
        position: relative;
        padding: 0.25rem 0;
        transition: color 0.3s ease-in-out;
    }

    nav a::after {
        content: '';
        position: absolute;
        bottom: -5px;
        left: 0;
        width: 0;
        height: 3px;
        background-color: #00c7e2;
        transition: width 0.3s ease-in-out;
    }

    nav a:hover {
        color: #00c7e2;
    }

    nav a:hover::after {
        width: 100%;
    }
    
    nav a.active {
        color: #00c7e2;
    }

    nav a.active::after {
        width: 100%;
    }

    /* ========================================= */
    /* 2. SOLANGE WIDGET STYLES (Adapted)        */
    /* ========================================= */
    
    .solange-widget {
        position: fixed;
        bottom: 30px;
        right: 30px;
        z-index: 9999;
        font-family: 'Segoe UI', sans-serif;
    }

    /* Round Toggle Button */
    .toggle-btn {
        width: 60px;
        height: 60px;
        background: linear-gradient(135deg, #00c7e2, #008ba3); /* Matches your cyan theme */
        color: white;
        border-radius: 50%;
        border: none;
        cursor: pointer;
        font-size: 2rem;
        box-shadow: 0 4px 15px rgba(0, 199, 226, 0.4);
        transition: transform 0.2s, box-shadow 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .toggle-btn:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(0, 199, 226, 0.6);
    }

    /* Chat Window Container */
    .chat-window {
        width: 320px;
        height: 450px;
        background: #1a1a2e; /* Matches your header background */
        border: 1px solid #00c7e2;
        border-radius: 12px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }

    /* Header */
    .chat-header {
        background: #00c7e2; /* Cyan accent */
        color: #1a1a2e; /* Dark text for contrast */
        padding: 12px 15px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: bold;
    }

    .header-title {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .close-btn {
        background: none;
        border: none;
        color: #1a1a2e;
        font-size: 1.5rem;
        cursor: pointer;
        line-height: 1;
    }

    /* Messages Area */
    .chat-messages {
        flex: 1;
        padding: 15px;
        overflow-y: auto;
        background-color: #131322; /* Slightly darker than container */
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .intro {
        text-align: center;
        color: #888;
        font-size: 0.9rem;
        margin-top: 50%;
        transform: translateY(-50%);
        font-style: italic;
    }

    .message-row {
        display: flex;
        width: 100%;
    }

    .message-row.user {
        justify-content: flex-end;
    }

    .message-row.solange {
        justify-content: flex-start;
    }

    .message-bubble {
        max-width: 80%;
        padding: 10px 14px;
        border-radius: 12px;
        font-size: 0.95rem;
        line-height: 1.4;
        word-wrap: break-word;
    }

    .user .message-bubble {
        background-color: #00c7e2;
        color: #1a1a2e;
        border-bottom-right-radius: 2px;
    }

    .solange .message-bubble {
        background-color: #2a2a40;
        color: #e0e0e0;
        border: 1px solid #444;
        border-bottom-left-radius: 2px;
    }

    /* Input Area */
    .chat-input-area {
        padding: 10px;
        background: #1a1a2e;
        border-top: 1px solid #333;
        display: flex;
        gap: 8px;
    }

    .chat-input-area input {
        flex: 1;
        background: #131322;
        border: 1px solid #333;
        color: white;
        padding: 10px;
        border-radius: 20px;
        outline: none;
    }

    .chat-input-area input:focus {
        border-color: #00c7e2;
    }

    .send-btn {
        background: none;
        border: none;
        color: #00c7e2;
        font-size: 1.2rem;
        cursor: pointer;
        padding: 0 5px;
    }

    .send-btn:disabled {
        color: #555;
    }

    /* Loading dots animation */
    .dot {
        animation: blink 1.4s infinite both;
    }
    .dot:nth-child(2) { animation-delay: 0.2s; }
    .dot:nth-child(3) { animation-delay: 0.4s; }

    @keyframes blink {
        0% { opacity: 0.2; }
        20% { opacity: 1; }
        100% { opacity: 0.2; }
    }
</style>