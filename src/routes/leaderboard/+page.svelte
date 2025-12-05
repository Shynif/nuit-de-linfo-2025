<script lang="ts">
    import type { PageProps } from './$types';

    let { data }: PageProps = $props();

    // Plus besoin de trier ici, on utilise data.post directement
    let leaderboard = data.post;

    function getRankEmoji(index: number) {
        if (index === 0) return '🥇';
        if (index === 1) return '🥈';
        if (index === 2) return '🥉';
        return null;
    }
</script>

<div class="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
    <div class="max-w-md mx-auto">
        
        <div class="text-center mb-8">
            <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight">
                Classement
            </h1>
            <p class="mt-2 text-sm text-slate-500">
                Les meilleurs scores de la communauté
            </p>
        </div>

        <div class="bg-white shadow-xl rounded-2xl overflow-hidden border border-slate-100">
            <div class="bg-slate-50 px-6 py-3 border-b border-slate-100 flex justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <span>Rang & Joueur</span>
                <span>Score</span>
            </div>

            <ul class="divide-y divide-slate-100">
                {#each leaderboard as player, i}
                    <li class="group hover:bg-slate-50 transition-colors duration-200 p-4 flex items-center justify-between">
                        
                        <div class="flex items-center gap-4">
                            <div class="flex-shrink-0 w-8 text-center font-bold text-lg">
                                {#if i < 3}
                                    <span class="text-2xl filter drop-shadow-sm">
                                        {getRankEmoji(i)}
                                    </span>
                                {:else}
                                    <span class="text-slate-400 font-mono">
                                        #{i + 1}
                                    </span>
                                {/if}
                            </div>

                            <div class="flex items-center gap-3">
                                <div class="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                    {player.name ? player.name.slice(0, 2).toUpperCase() : '??'}
                                </div>
                                <div>
                                    <p class="text-sm font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">
                                        {player.name}
                                    </p>
                                    {#if i === 0}
                                        <p class="text-[10px] text-indigo-500 font-semibold uppercase tracking-wide">Champion</p>
                                    {/if}
                                </div>
                            </div>
                        </div>

                        <div class="text-right">
                            <span class="block text-lg font-bold text-slate-800 font-mono">
                                {player.highscore?.toLocaleString() ?? 0}
                            </span>
                            <span class="text-[10px] text-slate-400 uppercase">pts</span>
                        </div>

                    </li>
                {:else}
                    <li class="p-8 text-center text-slate-500">
                        Aucun joueur trouvé.
                    </li>
                {/each}
            </ul>
        </div>
    </div>
</div>