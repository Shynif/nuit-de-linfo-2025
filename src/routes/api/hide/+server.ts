import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { isPublic } = await request.json();
  const hide = isPublic;

  if (typeof hide !== 'boolean') {
    return json({ error: '???' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: locals.user.id }
  });

  if (!user) {
    return json({ error: 'User not found' }, { status: 404 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { hidden: hide }
  });
  return json({ success: true });
};
