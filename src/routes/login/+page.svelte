<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();
</script>

<div class="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
  <div class="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
    <h1 class="mb-6 text-center text-2xl font-bold text-gray-800">Login / Register</h1>

    {#if form?.error}
      <div class="mb-4 rounded bg-red-100 p-3 text-red-700">
        {form.error}
      </div>
    {/if}

    {#if form?.success}
      <div class="mb-4 rounded bg-green-100 p-3 text-green-700">
        {form.success}
      </div>
    {/if}

    <form method="POST" action="?/login" use:enhance class="space-y-4">
      <div>
        <label for="username" class="block text-sm font-medium text-gray-700">Username</label>
        <input
          type="text"
          id="username"
          name="username"
          required
          class="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
        <input
          type="password"
          id="password"
          name="password"
          required
          class="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div class="flex gap-4">
        <button
          type="submit"
          class="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Login
        </button>
        <button
          type="submit"
          formaction="?/register"
          class="flex-1 rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Register
        </button>
      </div>
    </form>
  </div>
</div>
