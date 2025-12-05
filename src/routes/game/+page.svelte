<script lang="ts">
  import Card from './Card.svelte';
  import { onMount, onDestroy } from 'svelte';
  import { scale } from 'svelte/transition';
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import type { Question } from '$lib/types';

  let currentQuestion: Question | null = null;
  let nextQuestion: Question | null = null;
  let cardComponent: Card;
  let loading = true;
  let gameOver = false;
  let gameOverReason = '';
  let score = 0;

  // Stats
  const planete = tweened(50, { duration: 1000, easing: cubicOut });
  const inclusion = tweened(50, { duration: 1000, easing: cubicOut });
  const securite = tweened(50, { duration: 1000, easing: cubicOut });
  const budget = tweened(50, { duration: 1000, easing: cubicOut });

  // Status for colors: 'neutral', 'increase', 'decrease'
  let statStatus = {
    planete: 'neutral',
    inclusion: 'neutral',
    securite: 'neutral',
    budget: 'neutral'
  };

  async function fetchQuestion(id?: number) {
    try {
      const url = id ? `/api/question/${id}` : '/api/question';
      const res = await fetch(url);
      if (res.ok) {
        return await res.json();
      } else {
        console.error('Failed to fetch question');
        return null;
      }
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  async function loadInitialQuestion() {
    loading = true;
    currentQuestion = await fetchQuestion();
    loading = false;
  }

  function updateStats(q: Question, direction: 'left' | 'right') {
    let dPlanete = 0;
    let dInclusion = 0;
    let dSecurite = 0;
    let dBudget = 0;

    if (direction === 'left') {
      dPlanete = q.gPlanete;
      dInclusion = q.gInclusion;
      dSecurite = q.gSecurite;
      dBudget = q.gBudget;
    } else {
      dPlanete = q.dPlanete;
      dInclusion = q.dInclusion;
      dSecurite = q.dSecurite;
      dBudget = q.dBudget;
    }

    // Determine status
    statStatus.planete = dPlanete > 0 ? 'increase' : dPlanete < 0 ? 'decrease' : 'neutral';
    statStatus.inclusion = dInclusion > 0 ? 'increase' : dInclusion < 0 ? 'decrease' : 'neutral';
    statStatus.securite = dSecurite > 0 ? 'increase' : dSecurite < 0 ? 'decrease' : 'neutral';
    statStatus.budget = dBudget > 0 ? 'increase' : dBudget < 0 ? 'decrease' : 'neutral';

    // Calculate new values
    const newPlanete = Math.max(0, Math.min(100, $planete + dPlanete));
    const newInclusion = Math.max(0, Math.min(100, $inclusion + dInclusion));
    const newSecurite = Math.max(0, Math.min(100, $securite + dSecurite));
    const newBudget = Math.max(0, Math.min(100, $budget + dBudget));

    // Update stores
    const p1 = planete.set(newPlanete);
    const p2 = inclusion.set(newInclusion);
    const p3 = securite.set(newSecurite);
    const p4 = budget.set(newBudget);

    // Reset status after animation
    Promise.all([p1, p2, p3, p4]).then(() => {
        statStatus = {
            planete: 'neutral',
            inclusion: 'neutral',
            securite: 'neutral',
            budget: 'neutral'
        };
        checkGameOver();
    });
  }

  function checkGameOver() {
    if ($planete <= 0 || $planete >= 100) {
        gameOver = true;
        gameOverReason = $planete <= 0 ? "La planète est morte." : "La nature a repris ses droits, l'humanité est éteinte.";
    } else if ($inclusion <= 0 || $inclusion >= 100) {
        gameOver = true;
        gameOverReason = $inclusion <= 0 ? "Guerre civile !" : "Anarchie totale.";
    } else if ($securite <= 0 || $securite >= 100) {
        gameOver = true;
        gameOverReason = $securite <= 0 ? "Le pays est envahi." : "État policier.";
    } else if ($budget <= 0 || $budget >= 100) {
        gameOver = true;
        gameOverReason = $budget <= 0 ? "Faillite nationale." : "L'argent n'a plus de valeur.";
    }

    if (gameOver) {
        fetch('/api/score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ score })
        });
    }
  }

  let impacts = { planete: 0, inclusion: 0, securite: 0, budget: 0 };
  let showImpacts = false;

  function handleSwiping(event: CustomEvent) {
    if (!currentQuestion) return;
    const { dx } = event.detail;
    const threshold = window.screen.width/4; // Minimum swipe distance to show impacts

    if (Math.abs(dx) > threshold) {
        showImpacts = true;
        const direction = dx > 0 ? 'right' : 'left';
        if (direction === 'left') {
            impacts = {
                planete: currentQuestion.gPlanete,
                inclusion: currentQuestion.gInclusion,
                securite: currentQuestion.gSecurite,
                budget: currentQuestion.gBudget
            };
        } else {
            impacts = {
                planete: currentQuestion.dPlanete,
                inclusion: currentQuestion.dInclusion,
                securite: currentQuestion.dSecurite,
                budget: currentQuestion.dBudget
            };
        }
    } else {
        showImpacts = false;
        impacts = { planete: 0, inclusion: 0, securite: 0, budget: 0 };
    }
  }

  async function handleSwipe(event: CustomEvent) {
    showImpacts = false; // Hide impacts on swipe end
    if (!currentQuestion || gameOver) return;

    const { direction } = event.detail;
    updateStats(currentQuestion, direction);

    if (gameOver) return;

    score += 1;

    const nextId = direction === 'left' ? currentQuestion.nextIdG : currentQuestion.nextIdD;
    
    // Fetch next question
    if (nextId !== 0) {
        const q = await fetchQuestion(nextId);
        if (q) {
            currentQuestion = q;
        } else {
            // Fallback if specific question fails
             currentQuestion = await fetchQuestion();
        }
    } else {
        currentQuestion = await fetchQuestion();
    }
  }

  function handleKey(e: KeyboardEvent) {
    const target = e.target as HTMLElement | null;
    if (target) {
      const tag = target.tagName;
      const isEditable = target.hasAttribute?.('contenteditable');
      if (tag === 'INPUT' || tag === 'TEXTAREA' || isEditable) return;
    }
    if (gameOver || loading) return;
    if (e.key === 'ArrowLeft') {
      cardComponent?.triggerSwipe('left');
    } else if (e.key === 'ArrowRight') {
      cardComponent?.triggerSwipe('right');
    }
  }

  onMount(() => {
    loadInitialQuestion();
    window.addEventListener('keydown', handleKey);
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', handleKey);
    }
  });
</script>

<div class="game-container">
  <div class="stats">
    <div class="stat {statStatus.planete}">
        {#if showImpacts && impacts.planete !== 0}
            <div class="dot" transition:scale style="width: {Math.min(15, Math.abs(impacts.planete))}px; height: {Math.min(15, Math.abs(impacts.planete))}px;"></div>
        {/if}
        🌍 {$planete.toFixed(0)}%
    </div>
    <div class="stat {statStatus.inclusion}">
        {#if showImpacts && impacts.inclusion !== 0}
            <div class="dot" transition:scale style="width: {Math.min(15, Math.abs(impacts.inclusion))}px; height: {Math.min(15, Math.abs(impacts.inclusion))}px;"></div>
        {/if}
        🤝 {$inclusion.toFixed(0)}%
    </div>
    <div class="stat {statStatus.securite}">
        {#if showImpacts && impacts.securite !== 0}
            <div class="dot" transition:scale style="width: {Math.min(15, Math.abs(impacts.securite))}px; height: {Math.min(15, Math.abs(impacts.securite))}px;"></div>
        {/if}
        🛡️ {$securite.toFixed(0)}%
    </div>
    <div class="stat {statStatus.budget}">
        {#if showImpacts && impacts.budget !== 0}
            <div class="dot" transition:scale style="width: {Math.min(15, Math.abs(impacts.budget))}px; height: {Math.min(15, Math.abs(impacts.budget))}px;"></div>
        {/if}
        💰 {$budget.toFixed(0)}%
    </div>
  </div>

  {#if gameOver}
    <div class="game-over">
        <h1>Game Over</h1>
        <p>{gameOverReason}</p>
        <p class="text-2xl font-bold mt-4">Score: {score}</p>
        <button on:click={() => window.location.reload()}>Rejouer</button>
    </div>
  {:else if loading}
    <p>Chargement...</p>
  {:else if currentQuestion}
    <h2 class="question-text">{currentQuestion.question}</h2>
    <div class="card-stack">
        <Card bind:this={cardComponent} question={currentQuestion} on:swipe={handleSwipe} on:swiping={handleSwiping} />
    </div>
    <div class="instructions">
        {#if currentQuestion.choixDroite=='Supprimer les <a href="/minijeux/snake">anciennes sauvegardes</a>'}
          <p>← {currentQuestion.choixGauche} | Supprimer les <a style="color:blueviolet" href="/minijeux/snake">anciennes sauvegardes</a> →</p>
        {:else}
          <p>← {currentQuestion.choixGauche} | {currentQuestion.choixDroite} →</p>
        {/if}
    </div>
  {/if}
</div>

<style>
  .game-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    overflow: hidden;
    background-color: #f0f0f0;
    font-family: 'Arial', sans-serif;
  }

  .stat {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    transition: color 0.3s;
  }

  .stat.increase {
    color: #2ecc71; /* Green */
  }

  .stat.decrease {
    color: #e74c3c; /* Red */
  }

  .dot {
    position: absolute;
    top: -20px;
    background-color: #333;
    border-radius: 50%;
    transition: width 0.2s, height 0.2s;
  }

  .stats {
    display: flex;
    gap: 20px;
    margin-bottom: 40px;
    font-size: 1.2em;
    font-weight: bold;
  }

  .card-stack {
    position: relative;
    width: 300px;
    height: 400px;
    margin-bottom: 20px;
  }

  .instructions {
    text-align: center;
    margin-top: 20px;
    color: #666;
  }

  .game-over {
    text-align: center;
  }

  button {
    padding: 10px 20px;
    font-size: 1.2em;
    cursor: pointer;
    background-color: #333;
    color: white;
    border: none;
    border-radius: 5px;
    margin-top: 20px;
  }

  .question-text {
    font-size: 1.5em;
    font-weight: bold;
    text-align: center;
    margin-bottom: 20px;
    max-width: 600px;
    padding: 0 20px;
  }
</style>