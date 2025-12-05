<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { spring } from 'svelte/motion';

  import type { Question } from '$lib/types';

  export let question: Question;

  const dispatch = createEventDispatcher();

  let x = spring(0);
  let y = spring(0);
  let rotate = spring(0);

  let startX: number;
  let startY: number;

  $: swipeOpacity = Math.min(Math.abs($x) / 100, 1);
  $: currentChoice = $x > 0 ? question.choixDroite : question.choixGauche;
  $: choiceColor = '#2ecc71'; // Green for right, Red for left

  function onMove(dx: number, dy: number) {
    x.set(dx);
    y.set(dy);
    rotate.set(dx / 20);
    dispatch('swiping', { dx });
  }

  function onEnd(dx: number) {
    if (Math.abs(dx) > window.screen.width/4) {
      const direction = dx > 0 ? 'right' : 'left';
      const distance = direction === 'right' ? 500 : -500;
      
      // Animate off-screen
      x.set(distance);
      y.set(-100);
      rotate.set(direction === 'right' ? 25 : -25);

      // Reset and dispatch
      setTimeout(() => {
        dispatch('swipe', { direction });
        x.set(0, { hard: true });
        y.set(0, { hard: true });
        rotate.set(0, { hard: true });
      }, 300);
    } else {
      x.set(0);
      y.set(0);
      rotate.set(0);
      dispatch('swiping', { dx: 0 });
    }
  }

  export function triggerSwipe(direction: 'left' | 'right') {
    const distance = direction === 'right' ? 500 : -500;
    x.set(distance);
    y.set(-100);
    rotate.set(direction === 'right' ? 25 : -25);
    
    setTimeout(() => {
      dispatch('swipe', { direction });
      x.set(0, { hard: true });
      y.set(0, { hard: true });
      rotate.set(0, { hard: true });
    }, 300);
  }

  function handleMousedown(event: MouseEvent) {
    startX = event.clientX;
    startY = event.clientY;

    function handleMousemove(event: MouseEvent) {
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      onMove(dx, dy);
    }

    function handleMouseup(event: MouseEvent) {
      const dx = event.clientX - startX;
      onEnd(dx);
      window.removeEventListener('mousemove', handleMousemove);
      window.removeEventListener('mouseup', handleMouseup);
    }

    window.addEventListener('mousemove', handleMousemove);
    window.addEventListener('mouseup', handleMouseup);
  }

  function handleTouchstart(event: TouchEvent) {
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;

    function handleTouchmove(event: TouchEvent) {
      const dx = event.touches[0].clientX - startX;
      const dy = event.touches[0].clientY - startY;
      onMove(dx, dy);
    }

    function handleTouchend(event: TouchEvent) {
      const dx = event.changedTouches[0].clientX - startX;
      onEnd(dx);
      window.removeEventListener('touchmove', handleTouchmove);
      window.removeEventListener('touchend', handleTouchend);
    }

    window.addEventListener('touchmove', handleTouchmove);
    window.addEventListener('touchend', handleTouchend);
  }
</script>

<div
  class="card"
  style="transform: translate({$x}px, {$y}px) rotate({$rotate}deg); background-image: url('/{question.id}.png'); background-size: cover; background-position: center;"
  on:mousedown={handleMousedown}
  on:touchstart={handleTouchstart}
>
  <div class="content">
    
    <div class="choice-container" style="opacity: {swipeOpacity};">
        <div class="choice" style="border-color: {choiceColor}; color: {choiceColor};">
            {currentChoice}
        </div>
    </div>
  </div>
</div>

<style>
  .card {
    position: absolute;
    width: 300px;
    height: 400px;
    background-color: white;
    border-radius: 10px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: grab;
    user-select: none;
    overflow: hidden; /* Ensure content stays inside */
  }

  .content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between; /* Push choice to bottom */
    height: 100%;
    width: 100%;
    padding: 20px;
    text-align: center;
    box-sizing: border-box;
  }

  h2 {
    margin-top: 40px; /* Give some space from top */
  }

  .choice-container {
    width: 100%;
    display: flex;
    justify-content: center;
    padding-bottom: 20px;
  }

  .choice {
    font-size: 1.2em;
    font-weight: bold;
    padding: 10px 20px;
    border: 2px solid;
    border-radius: 5px;
    background-color: rgba(255, 255, 255, 0.9); /* Slight background to ensure readability over card content if needed */
  }
</style>