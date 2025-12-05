import { redirect, json } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(302, '/login');
  }
  const user = await prisma.user.findUnique({
    where: { id: locals.user.id }
  });
  if (!user) {
    throw redirect(302, '/login');
  }
  return { name: user.name, hidden: user.hidden };
};
