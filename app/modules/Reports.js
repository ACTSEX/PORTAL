const ADMIN_CAPABILITY = "management.reports.global";
const MAX_DAYS = 366;
const MAX_ROWS = 500;
const MAX_COLUMNS = 8;
const MAX_CSV_BYTES = 512000;
const FORMATS = new Set(["json", "csv"]);

export class ReportsError extends Error {
  constructor(code) { super("Report operation failed"); this.name = "ReportsError"; this.code = code; }
}

const DEFINITIONS = Object.freeze({
  owner_listings: Object.freeze({
    scope: "owner", headers: ["id", "title", "listing_type", "status", "price_minor", "currency", "created_at"],
    sql: "SELECT id, title, listing_type, status, price_minor, currency, created_at FROM listings WHERE owner_id = ? AND created_at >= ? AND created_at < ? ORDER BY created_at DESC, id DESC LIMIT ?",
  }),
  owner_leads: Object.freeze({
    scope: "owner", headers: ["id", "status", "created_at", "updated_at"],
    sql: "SELECT id, status, created_at, updated_at FROM leads WHERE assigned_user_id = ? AND created_at >= ? AND created_at < ? ORDER BY created_at DESC, id DESC LIMIT ?",
  }),
  owner_payments: Object.freeze({
    scope: "owner", headers: ["id", "status", "amount_minor", "currency", "due_at", "paid_at", "created_at"],
    sql: "SELECT p.id, p.status, p.amount_minor, p.currency, p.due_at, p.paid_at, p.created_at FROM payments p JOIN subscriptions s ON s.id = p.subscription_id WHERE s.user_id = ? AND p.created_at >= ? AND p.created_at < ? ORDER BY p.created_at DESC, p.id DESC LIMIT ?",
  }),
  admin_listing_summary: Object.freeze({
    scope: "admin", headers: ["status", "total"],
    sql: "SELECT status, COUNT(*) AS total FROM listings WHERE created_at >= ? AND created_at < ? GROUP BY status ORDER BY status ASC LIMIT ?",
  }),
});

function authorize(definition, context) {
  if (!context?.userId) throw new ReportsError("UNAUTHENTICATED");
  if (definition.scope === "admin"
    && !(Array.isArray(context.capabilities) && context.capabilities.includes(ADMIN_CAPABILITY)))
    throw new ReportsError("FORBIDDEN");
}

function validate(input, clock) {
  const fields = new Set(["type", "format", "from", "to", "limit", "filters"]);
  if (!input || Object.keys(input).some((key) => !fields.has(key)) || !DEFINITIONS[input.type])
    throw new ReportsError("INVALID_TYPE");
  if (!FORMATS.has(input.format)) throw new ReportsError("INVALID_FORMAT");
  if (input.filters && Object.keys(input.filters).length) throw new ReportsError("INVALID_FILTER");
  const from = new Date(input.from), to = new Date(input.to), limit = Number(input.limit ?? 100);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to || to > clock()
    || to.getTime() - from.getTime() > MAX_DAYS * 86400000) throw new ReportsError("INVALID_PERIOD");
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_ROWS) throw new ReportsError("INVALID_LIMIT");
  return { definition: DEFINITIONS[input.type], period: Object.freeze({ from: from.toISOString(), to: to.toISOString(), timezone: "UTC" }), limit };
}

function normalize(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value).normalize("NFC");
}

function safeCell(value) {
  let cell = normalize(value);
  if (/^[=+\-@\t\r]/u.test(cell)) cell = `'${cell}`;
  return `"${cell.replaceAll('"', '""').replaceAll("\r\n", "\n").replaceAll("\r", "\n")}"`;
}

export function encodeReportCsv(headers, rows) {
  if (!Array.isArray(headers) || headers.length < 1 || headers.length > MAX_COLUMNS) throw new ReportsError("CSV_COLUMNS_EXCEEDED");
  const lines = [headers.map(safeCell).join(",")];
  for (const row of rows) lines.push(headers.map((header) => safeCell(row[header])).join(","));
  const csv = `\uFEFF${lines.join("\r\n")}`;
  if (new TextEncoder().encode(csv).byteLength > MAX_CSV_BYTES) throw new ReportsError("CSV_SIZE_EXCEEDED");
  return csv;
}

export function createReports({ db, logger, clock = () => new Date() } = {}) {
  if (!db?.all || !logger?.info) throw new TypeError("Invalid Reports dependencies");
  async function generate(input, context = {}) {
    const { definition, period, limit } = validate(input, clock);
    authorize(definition, context);
    const parameters = definition.scope === "owner"
      ? [context.userId, period.from, period.to, limit]
      : [period.from, period.to, limit];
    const result = await db.all(definition.sql, parameters);
    const rows = Object.freeze((result?.results ?? []).slice(0, limit).map((row) =>
      Object.freeze(Object.fromEntries(definition.headers.map((header) => [header, row[header] ?? null])))));
    const content = input.format === "csv" ? encodeReportCsv(definition.headers, rows) : undefined;
    logger.info("Report generated", { operation: "reports.generate", module: "Reports", report: input.type,
      period, quantity: rows.length, status: "success", correlationId: context.correlationId });
    return Object.freeze({ type: input.type, format: input.format, period, quantity: rows.length,
      ...(content === undefined ? { data: rows } : { content }), metadata: Object.freeze({ synchronous: true, persisted: false, maxRows: MAX_ROWS }) });
  }
  return Object.freeze({ generate, types: Object.freeze(Object.keys(DEFINITIONS)), formats: Object.freeze([...FORMATS]) });
}
