import type { AuditLogEntry, BackupRecord } from "@/types";

/**
 * Storage adapter contract for the small amount of state this app persists
 * (backup records + audit log entries). Kept intentionally narrow so a
 * Vercel-compatible database (Postgres, Redis, etc.) can be dropped in
 * later without touching call sites — see store/memory-store.ts for the
 * default implementation and its limitations.
 */
export interface PersistenceAdapter {
  addBackup(record: BackupRecord): Promise<BackupRecord>;
  listBackups(): Promise<BackupRecord[]>;
  addAuditEntry(entry: AuditLogEntry): Promise<AuditLogEntry>;
  listAuditEntries(): Promise<AuditLogEntry[]>;
}
