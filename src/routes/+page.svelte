<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<div class="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
  <div class="w-full max-w-md rounded-lg bg-white p-8 shadow-md text-center">
    {#if data.user}
      <h1 class="mb-4 text-3xl font-bold text-gray-800">Welcome, {data.user.name}!</h1>
      
      <div class="mb-6 space-y-2 text-gray-600">
        <p>Highscore: <span class="font-semibold text-blue-600">{data.user.highscore}</span></p>
        <p>Status: <span class="font-semibold">{data.user.hidden ? 'Hidden' : 'Visible'}</span></p>
      </div>

      <div class="flex flex-col gap-4">
        <a href="/game" class="rounded-md bg-green-600 px-6 py-2 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2">
          Play Game
        </a>
        
        <form action="/logout" method="POST" use:enhance>
          <button
            type="submit"
            class="w-full rounded-md bg-red-600 px-6 py-2 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Logout
          </button>
        </form>
      </div>
    {:else}
      <h1 class="mb-4 text-3xl font-bold text-gray-800">Welcome to the Game!</h1>
      <p class="mb-6 text-gray-600">Please login to play and track your score.</p>
      
      <div class="flex gap-4 justify-center">
        <a href="/login" class="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
          Login
        </a>
        <a href="/leaderboard" class="rounded-md bg-gray-600 px-6 py-2 text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2">
          Leaderboard
        </a>
      </div>
    {/if}
  </div>
</div>