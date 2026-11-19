import fs from 'node:fs';
import path from 'node:path';
import type { SchoolDatabase, AuditEntry } from '../types.ts';
import { hashPasscode, type PasscodeHashRecord } from './auth.ts';
import { createSeedDatabase } from './seed.ts';

interface PersistedEnvelope {
  adminPasscode: PasscodeHashRecord;
  db: SchoolDatabase;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'school-db.json');

let cachedEnvelope: PersistedEnvelope | null = null;

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function writeEnvelopeAtomic(envelope: PersistedEnvelope): void {
  ensureDataDir();
  const tmpPath = `${DB_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(envelope, null, 2), 'utf8');
  fs.renameSync(tmpPath, DB_FILE);
}

export function loadEnvelope(): PersistedEnvelope {
  if (cachedEnvelope) return cachedEnvelope;
  ensureDataDir();
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(raw) as PersistedEnvelope;
      if (parsed && parsed.adminPasscode && parsed.db && parsed.db.branding) {
        if (
          parsed.db.branding.schoolName === 'Mustafai School System' &&
          !parsed.db.branding.logoDataUrl
        ) {
          parsed.db.branding.logoDataUrl = '/assets/branding/ang-app-icon.png';
          writeEnvelopeAtomic(parsed);
        }
        cachedEnvelope = parsed;
        return cachedEnvelope;
      }
    } catch {
      // Fall through to re-seed if file corrupted
    }
  }
  const initial: PersistedEnvelope = {
    adminPasscode: hashPasscode('1234'),
    db: createSeedDatabase(),
  };
  writeEnvelopeAtomic(initial);
  cachedEnvelope = initial;
  return cachedEnvelope;
}

export function saveEnvelope(envelope: PersistedEnvelope): void {
  cachedEnvelope = envelope;
  writeEnvelopeAtomic(envelope);
}

export function appendAudit(
  db: SchoolDatabase,
  actorRole: string,
  actorName: string,
  action: string,
  target: string
): void {
  const entry: AuditEntry = {
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    actorRole,
    actorName,
    action,
    target,
  };
  db.auditLog = [entry, ...db.auditLog].slice(0, 120);
}

export function resetSchoolDatabase(preserveBranding = false): PersistedEnvelope {
  const current = loadEnvelope();
  const seeded = createSeedDatabase();
  if (preserveBranding) {
    seeded.branding = current.db.branding;
  }
  const next: PersistedEnvelope = {
    adminPasscode: current.adminPasscode,
    db: seeded,
  };
  appendAudit(next.db, 'Admin', 'System Administrator', 'DATABASE_RESET', preserveBranding ? 'Reset records (branding preserved)' : 'Full demo reset');
  saveEnvelope(next);
  return next;
}
