const PROVIDER = "asaas";
const STATUSES = new Set(["disabled", "active", "error"]);
export class IntegrationsError extends Error {
  constructor(code) { super("Integration operation failed"); this.name = "IntegrationsError"; this.code = code; }
}
const view = (row) => row && Object.freeze({ id: row.id, provider: row.provider, status: row.status,
  lastSyncedAt: row.last_synced_at, createdAt: row.created_at, updatedAt: row.updated_at });
export function createIntegrations({ db, events, logger, id, clock = () => new Date() } = {}) {
  if (!db?.first || !db?.write || !events?.publish || !logger?.info || !id) throw new TypeError("Invalid Integrations dependencies");
  const get = async () => view(await db.first("SELECT * FROM integrations WHERE provider = ?", [PROVIDER]));
  async function configure(context = {}) {
    if (context.isAdmin !== true) throw new IntegrationsError("FORBIDDEN");
    const current = await get(); if (current) return current;
    const integrationId = `int_${id()}`, now = clock().toISOString();
    await db.write("INSERT INTO integrations (id, provider, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      [integrationId, PROVIDER, "disabled", now, now]);
    await events.publish({ name: "IntegrationConfigured", version: "1.0", source: "Integrations", id: `evt_${id()}`,
      occurredAt: now, payload: { integrationId, provider: PROVIDER }, metadata: context.correlationId ? { correlationId: context.correlationId } : {} });
    return get();
  }
  async function setStatus(status, context = {}) {
    if (context.isAdmin !== true) throw new IntegrationsError("FORBIDDEN");
    if (!STATUSES.has(status)) throw new IntegrationsError("INVALID_STATUS");
    const current = await get(); if (!current) throw new IntegrationsError("NOT_FOUND");
    const now = clock().toISOString();
    await db.write("UPDATE integrations SET status = ?, last_synced_at = ?, updated_at = ? WHERE provider = ?",
      [status, status === "active" ? now : current.lastSyncedAt, now, PROVIDER]);
    logger.info("Integration state changed", { operation: "integrations.status", entityId: current.id, status, correlationId: context.correlationId });
    return get();
  }
  return Object.freeze({ provider: PROVIDER, get, configure, setStatus });
}
