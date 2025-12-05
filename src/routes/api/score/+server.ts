import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { score } = await request.json();

  if (typeof score !== 'number') {
    return json({ error: 'Invalid score' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: locals.user.id }
  });

  if (!user) {
    return json({ error: 'User not found' }, { status: 404 });
  }

  if (score > user.highscore) {
    await prisma.user.update({
      where: { id: user.id },
      data: { highscore: score }
    });
    return json({ success: true, newHighscore: true });
  }

  return json({ success: true, newHighscore: false });
};
