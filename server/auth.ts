import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export interface PasscodeHashRecord {
  salt: string;
  hash: string;
}

export interface SessionPayload {
  role: 'Admin' | 'Teacher' | 'Student' | 'Parent';
  actorId: string;
  actorName: string;
  assignedClass?: string;
  studentId?: string;
  iat: number;
  exp: number;
  nonce: string;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const SECRET_FILE = path.join(DATA_DIR, '.session-secret');

function getSessionSecret(): string {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32) {
    return process.env.SESSION_SECRET;
  }
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(SECRET_FILE)) {
    const existing = fs.readFileSync(SECRET_FILE, 'utf8').trim();
    if (existing.length >= 32) {
      return existing;
    }
  }
  const generated = crypto.randomBytes(48).toString('hex');
  fs.writeFileSync(SECRET_FILE, generated, { mode: 0o600 });
  return generated;
}

const SESSION_SECRET = getSessionSecret();

export function hashPasscode(passcode: string): PasscodeHashRecord {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(passcode, salt, 64).toString('hex');
  return { salt, hash: derived };
}

export function verifyPasscode(passcode: string, record: PasscodeHashRecord): boolean {
  if (!passcode || !record?.salt || !record?.hash) return false;
  try {
    const derived = crypto.scryptSync(passcode, record.salt, 64);
    const stored = Buffer.from(record.hash, 'hex');
    if (derived.length !== stored.length) return false;
    return crypto.timingSafeEqual(derived, stored);
  } catch {
    return false;
  }
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (input.length % 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

export function signSessionToken(payload: Omit<SessionPayload, 'iat' | 'exp' | 'nonce'>): { token: string; fullPayload: SessionPayload } {
  const now = Date.now();
  const fullPayload: SessionPayload = {
    ...payload,
    iat: now,
    exp: now + 12 * 60 * 60 * 1000, // 12-hour session
    nonce: crypto.randomBytes(12).toString('hex'),
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encodedPayload)
    .digest();
  const token = `${encodedPayload}.${base64UrlEncode(signature)}`;
  return { token, fullPayload };
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encodedPayload, encodedSig] = parts;
  if (!encodedPayload || !encodedSig) return null;

  try {
    const expectedSig = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(encodedPayload)
      .digest();
    const expectedEncoded = base64UrlEncode(expectedSig);
    const bufA = Buffer.from(encodedSig, 'utf8');
    const bufB = Buffer.from(expectedEncoded, 'utf8');
    if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
      return null;
    }
    const decoded = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload;
    if (!decoded || typeof decoded.exp !== 'number' || decoded.exp < Date.now()) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

// In-memory sliding window rate limiter for admin passcode brute-force protection
interface AttemptTracker {
  failures: number[];
  lockedUntil: number;
}

const attemptMap = new Map<string, AttemptTracker>();
const MAX_FAILED_ATTEMPTS = 8;
const WINDOW_MS = 5 * 60 * 1000;
const LOCKOUT_MS = 3 * 60 * 1000;

export function checkLoginRateLimit(key: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = attemptMap.get(key);
  if (!entry) return { allowed: true, retryAfterSec: 0 };

  if (entry.lockedUntil > now) {
    return { allowed: false, retryAfterSec: Math.ceil((entry.lockedUntil - now) / 1000) };
  }

  entry.failures = entry.failures.filter(ts => now - ts < WINDOW_MS);
  if (entry.failures.length >= MAX_FAILED_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS;
    return { allowed: false, retryAfterSec: Math.ceil(LOCKOUT_MS / 1000) };
  }
  return { allowed: true, retryAfterSec: 0 };
}

export function recordFailedLogin(key: string): void {
  const now = Date.now();
  const entry = attemptMap.get(key) || { failures: [], lockedUntil: 0 };
  entry.failures = entry.failures.filter(ts => now - ts < WINDOW_MS);
  entry.failures.push(now);
  if (entry.failures.length >= MAX_FAILED_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS;
  }
  attemptMap.set(key, entry);
}

export function resetLoginRateLimit(key: string): void {
  attemptMap.delete(key);
}

export function sanitizeText(value: unknown, maxLen = 500): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, maxLen);
}
