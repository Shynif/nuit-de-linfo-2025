import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { prisma } from '$lib/server/prisma';
import { hashPassword, verifyPassword, signJWT } from '$lib/server/auth';
import { randomUUID } from 'crypto';

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) {
    throw redirect(302, '/');
  }
};

export const actions: Actions = {
  login: async ({ request, cookies }) => {
    const data = await request.formData();
    const username = data.get('username') as string;
    const password = data.get('password') as string;

    if (!username || !password) {
      return fail(400, { error: 'Missing username or password' });
    }

    const user = await prisma.user.findFirst({
      where: { name: username }
    });

    if (!user || !(await verifyPassword(password, user.password))) {
      return fail(400, { error: 'Invalid username or password' });
    }

    const token = signJWT({ userId: user.id });
    cookies.set('session', token, {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7 // 1 week
    });

    throw redirect(302, '/');
  },

  register: async ({ request, cookies }) => {
    const data = await request.formData();
    const username = data.get('username') as string;
    const password = data.get('password') as string;

    if (!username || !password) {
      return fail(400, { error: 'Missing username or password' });
    }

    const existingUser = await prisma.user.findFirst({
      where: { name: username }
    });

    if (existingUser) {
      return fail(400, { error: 'Username already taken' });
    }

    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        name: username,
        password: hashedPassword,
        highscore: 0,
        hidden: true
      }
    });

    const token = signJWT({ userId: user.id });
    cookies.set('session', token, {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7 // 1 week
    });

    throw redirect(302, '/');
  }
};
