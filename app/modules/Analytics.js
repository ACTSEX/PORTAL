const CAPABILITY = "management.analytics.global";
const GRANULARITIES = Object.freeze({ day: "%Y-%m-%d", week: "%Y-%W", month: "%Y-%m" });
const MAX_DAYS = 366;
const MAX_POINTS = 100;
const MAX_GROUPS = 20;

export class AnalyticsError extends Error {
  constructor(code) { super("Analytics operation failed"); this.name = "AnalyticsError"; this.code = code; }
}

const METRICS = Object.freeze({
  listings_by_status: { groups: true, period: false, sql: (admin) => `SELECT status AS dimension, COUNT(*) AS value FROM listings${admin ? "" : " WHERE owner_id = ?"} GROUP BY status ORDER BY status ASC LIMIT ?` },
  contacts_over_time: { groups: false, period: true, sql: (admin, grain) => `SELECT strftime('${grain}', created_at) AS point, COUNT(*) AS value FROM contacts WHERE ${admin ? "" : "recipient_user_id = ? AND "}created_at >= ? AND created_at < ? GROUP BY point ORDER BY point ASC LIMIT ?` },
  leads_by_status: { groups: true, period: false, sql: (admin) => `SELECT status AS dimension, COUNT(*) AS value FROM leads${admin ? "" : " WHERE assigned_user_id = ?"} GROUP BY status ORDER BY status ASC LIMIT ?` },
  reviews_aggregate: { groups: true, period: false, sql: (admin) => `SELECT status AS dimension, COUNT(*) AS value, ROUND(AVG(rating), 2) AS average FROM reviews${admin ? "" : " WHERE subject_user_id = ?"} GROUP BY status ORDER BY status ASC LIMIT ?` },
  payments_by_status: { groups: true, period: false, financial: true, sql: (admin) => `SELECT p.status AS dimension, COUNT(*) AS value, SUM(p.amount_minor) AS amount_minor FROM payments p JOIN subscriptions s ON s.id = p.subscription_id${admin ? "" : " WHERE s.user_id = ?"} GROUP BY p.status ORDER BY p.status ASC LIMIT ?` },
});

function authorize(input, context) {
  if (!context?.userId) throw new AnalyticsError("UNAUTHENTICATED");
  if (input.scope === "admin" && !(Array.isArray(context.capabilities) && context.capabilities.includes(CAPABILITY)))
    throw new AnalyticsError("FORBIDDEN");
}

function validate(input, clock) {
  const fields = new Set(["metric", "scope", "from", "to", "granularity", "filters", "limit"]);
  if (!input || Object.keys(input).some((key) => !fields.has(key)) || !METRICS[input.metric]
    || !["owner", "admin"].includes(input.scope) || (input.filters && Object.keys(input.filters).length))
    throw new AnalyticsError("INVALID_INPUT");
  const metric = METRICS[input.metric];
  if (metric.period && !GRANULARITIES[input.granularity]) throw new AnalyticsError("INVALID_GRANULARITY");
  if (!metric.period && input.granularity !== undefined) throw new AnalyticsError("INVALID_GRANULARITY");
  const limit = Number(input.limit ?? (metric.groups ? MAX_GROUPS : MAX_POINTS));
  if (!Number.isInteger(limit) || limit < 1 || limit > (metric.groups ? MAX_GROUPS : MAX_POINTS)) throw new AnalyticsError("INVALID_LIMIT");
  if (!metric.period) return { metric, limit, range: null };
  const from = new Date(input.from), to = new Date(input.to);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to || to > clock()
    || to.getTime() - from.getTime() > MAX_DAYS * 86400000) throw new AnalyticsError("INVALID_PERIOD");
  return { metric, limit, range: Object.freeze({ from: from.toISOString(), to: to.toISOString(), timezone: "UTC" }) };
}

export function createAnalytics({ db, logger, clock = () => new Date() } = {}) {
  if (!db?.all || !logger?.info) throw new TypeError("Invalid Analytics dependencies");
  async function query(input, context = {}) {
    authorize(input ?? {}, context);
    const { metric, limit, range } = validate(input, clock);
    const admin = input.scope === "admin", parameters = [];
    if (!admin) parameters.push(context.userId);
    if (range) parameters.push(range.from, range.to);
    parameters.push(limit);
    const sql = metric.sql(admin, GRANULARITIES[input.granularity]);
    const result = await db.all(sql, parameters);
    const data = Object.freeze((result?.results ?? []).map((row) => Object.freeze({ ...row })));
    logger.info("Analytics read", { operation: "analytics.query", module: "Analytics", metric: input.metric,
      period: range, quantity: data.length, status: "success", correlationId: context.correlationId });
    return Object.freeze({ metric: input.metric, scope: input.scope, granularity: input.granularity ?? null,
      period: range, quantity: data.length, data, limits: Object.freeze({ points: MAX_POINTS, groups: MAX_GROUPS }) });
  }
  return Object.freeze({ query, metrics: Object.freeze(Object.keys(METRICS)), granularities: Object.freeze(Object.keys(GRANULARITIES)) });
}
