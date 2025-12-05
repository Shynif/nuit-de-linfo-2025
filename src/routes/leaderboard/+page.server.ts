import { prisma } from '$lib/server/prisma';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
    return {
        post: await prisma.user.findMany({
            select: {
                name: true,
                highscore: true
            },
            // On trie par highscore décroissant (descending)
            orderBy: {
                highscore: 'desc'
            },
            // Remove les hidden
            where: {
                hidden:true
            }
        })
    };
};