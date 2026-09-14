import type { AuditLogEntry, BackupRecord } from "@/types";
import type { PersistenceAdapter } from "@/lib/store/types";
import { mockAddBackup, mockListBackups } from "@/lib/github/mock-data";
import { isMockMode } from "@/lib/config";

/**
 * In-process, non-durable store.
 *
 * IMPORTANT LIMITATION: Vercel serverless functions do not share memory
 * across invocations or regions, and instances are recycled at any time.
 * This adapter is only reliable for local development and for demoing
 * mock mode. Before relying on the audit log or backup records in a real
 * production deployment, swap this adapter for one backed by a persistent
 * store (Postgres, Vercel KV/Redis, etc.) that implements the same
 * PersistenceAdapter interface — no other code needs to change.
 */
class MemoryStore implements PersistenceAdapter {
  private backups: BackupRecord[] = [];
  private audit: AuditLogEntry[] = [];

  async addBackup(record: BackupRecord): Promise<BackupRecord> {
    if (isMockMode()) return mockAddBackup(record);
    this.backups.unshift(record);
    return record;
  }

  async listBackups(): Promise<BackupRecord[]> {
    if (isMockMode()) return mockListBackups();
    return this.backups;
  }

  async addAuditEntry(entry: AuditLogEntry): Promise<AuditLogEntry> {
    this.audit.unshift(entry);
    return entry;
  }

  async listAuditEntries(): Promise<AuditLogEntry[]> {
    return this.audit;
  }
}

// Module-level singleton: persists for the lifetime of one warm serverless
// instance / one local dev process, not across deployments or instances.
const globalForStore = globalThis as unknown as { __appStore?: MemoryStore };
export const store: PersistenceAdapter =
  globalForStore.__appStore ?? (globalForStore.__appStore = new MemoryStore());
