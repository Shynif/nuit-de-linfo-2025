import type { Handle } from '@sveltejs/kit';
import { verifyJWT } from '$lib/server/auth';
import { prisma } from '$lib/server/prisma';

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get('session');

  if (token) {
    const payload = verifyJWT<{ userId: string }>(token);
    if (payload) {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, name: true, hidden: true, highscore: true }
      });

      if (user) {
        event.locals.user = user;
      }
    }
  }

  return resolve(event);
};
