import { randomBytes, scrypt, createHmac, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { env } from '$env/dynamic/private';

const scryptAsync = promisify(scrypt);

const JWT_SECRET = env.JWT_SECRET || 'default-secret-change-me';

// Password Hashing
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [salt, key] = hash.split(':');
  const keyBuffer = Buffer.from(key, 'hex');
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return timingSafeEqual(keyBuffer, derivedKey);
}

// JWT Implementation (HS256)
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return Buffer.from(str, 'base64').toString();
}

export function signJWT(payload: object, expiresIn: string | number = '7d'): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  
  const now = Math.floor(Date.now() / 1000);
  // Simple expiration handling: if string, assume '7d' format (days), else seconds
  let exp = now;
  if (typeof expiresIn === 'string' && expiresIn.endsWith('d')) {
     const days = parseInt(expiresIn);
     exp += days * 24 * 60 * 60;
  } else if (typeof expiresIn === 'number') {
     exp += expiresIn;
  }

  const payloadWithExp = { ...payload, exp };
  const encodedPayload = base64UrlEncode(JSON.stringify(payloadWithExp));

  const signature = createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyJWT<T>(token: string): T | null {
  try {
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature) return null;

    const expectedSignature = createHmac('sha256', JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    if (signature !== expectedSignature) return null;

    const decodedPayload = JSON.parse(base64UrlDecode(payload));
    
    if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return decodedPayload as T;
  } catch (e) {
    return null;
  }
}
