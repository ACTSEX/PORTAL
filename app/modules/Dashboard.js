const PERIODS = Object.freeze({ 7: 7, 30: 30, 90: 90 });
const OWNER_INDICATORS = new Set(["listings", "contacts", "leads", "reviews", "subscription", "payments"]);
const ADMIN_INDICATORS = new Set(["listings", "contacts", "leads", "reviews"]);
const ADMIN_CAPABILITY = "management.dashboard.global";

export class DashboardError extends Error {
  constructor(code) { super("Dashboard operation failed"); this.name = "DashboardError"; this.code = code; }
}

function authenticated(context) {
  if (!context?.userId) throw new DashboardError("UNAUTHENTICATED");
}

function administrative(context) {
  return Array.isArray(context?.capabilities) && context.capabilities.includes(ADMIN_CAPABILITY);
}

function period(input, clock) {
  const days = Number(input?.periodDays ?? 30);
  if (!PERIODS[days]) throw new DashboardError("INVALID_PERIOD");
  const end = clock();
  if (!(end instanceof Date) || Number.isNaN(end.getTime())) throw new DashboardError("INVALID_CLOCK");
  return Object.freeze({ days, from: new Date(end.getTime() - days * 86400000).toISOString(), to: end.toISOString(), timezone: "UTC" });
}

function validateInput(input, context, allowed) {
  const fields = new Set(["scope", "periodDays", "indicators"]);
  if (!input || Object.keys(input).some((key) => !fields.has(key))) throw new DashboardError("INVALID_INPUT");
  if (input.scope !== "owner" && input.scope !== "admin") throw new DashboardError("INVALID_SCOPE");
  if (input.scope === "admin" && !administrative(context)) throw new DashboardError("FORBIDDEN");
  if (!Array.isArray(input.indicators) || input.indicators.length < 1 || input.indicators.length > allowed.size
    || input.indicators.some((item) => !allowed.has(item)) || new Set(input.indicators).size !== input.indicators.length)
    throw new DashboardError("INVALID_INDICATOR");
}

const SQL = Object.freeze({
  owner: Object.freeze({
    listings: ["SELECT status, COUNT(*) AS total FROM listings WHERE owner_id = ? GROUP BY status ORDER BY status ASC LIMIT ?", (u, p) => [u, 10]],
    contacts: ["SELECT status, COUNT(*) AS total FROM contacts WHERE recipient_user_id = ? AND created_at >= ? AND created_at < ? GROUP BY status ORDER BY status ASC LIMIT ?", (u, p) => [u, p.from, p.to, 10]],
    leads: ["SELECT status, COUNT(*) AS total FROM leads WHERE assigned_user_id = ? GROUP BY status ORDER BY status ASC LIMIT ?", (u) => [u, 10]],
    reviews: ["SELECT status, COUNT(*) AS total, ROUND(AVG(rating), 2) AS average_rating FROM reviews WHERE subject_user_id = ? GROUP BY status ORDER BY status ASC LIMIT ?", (u) => [u, 10]],
    subscription: ["SELECT status, starts_at, current_period_ends_at FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?", (u) => [u, 1]],
    payments: ["SELECT p.status, COUNT(*) AS total FROM subscriptions s INDEXED BY idx_subscriptions_user_status JOIN payments p INDEXED BY idx_payments_subscription_status ON p.subscription_id = s.id WHERE s.user_id = ? GROUP BY p.status ORDER BY p.status ASC LIMIT ?", (u) => [u, 10]],
  }),
  admin: Object.freeze({
    listings: ["SELECT category_id, status, COUNT(*) AS total FROM listings INDEXED BY idx_listings_category_status GROUP BY category_id, status ORDER BY category_id ASC, status ASC LIMIT ?", () => [100]],
    contacts: ["SELECT status, COUNT(*) AS total FROM contacts WHERE created_at >= ? AND created_at < ? GROUP BY status ORDER BY status ASC LIMIT ?", (_, p) => [p.from, p.to, 10]],
    leads: ["SELECT status, COUNT(*) AS total FROM leads GROUP BY status ORDER BY status ASC LIMIT ?", () => [10]],
    reviews: ["SELECT status, COUNT(*) AS total, ROUND(AVG(rating), 2) AS average_rating FROM reviews GROUP BY status ORDER BY status ASC LIMIT ?", () => [10]],
  }),
});

export function createDashboard({ db, logger, clock = () => new Date() } = {}) {
  if (!db?.all || !logger?.info) throw new TypeError("Invalid Dashboard dependencies");
  async function get(input, context = {}) {
    authenticated(context);
    const allowed = input?.scope === "admin" ? ADMIN_INDICATORS : OWNER_INDICATORS;
    validateInput(input, context, allowed);
    const selectedPeriod = period(input, clock);
    const indicators = {};
    for (const name of input.indicators) {
      const [sql, parameters] = SQL[input.scope][name];
      const result = await db.all(sql, parameters(context.userId, selectedPeriod));
      indicators[name] = Object.freeze((result?.results ?? []).map((row) => Object.freeze({ ...row })));
    }
    logger.info("Dashboard read", { operation: "dashboard.read", module: "Dashboard", period: selectedPeriod.days,
      quantity: input.indicators.length, status: "success", correlationId: context.correlationId });
    return Object.freeze({ scope: input.scope, period: selectedPeriod, indicators: Object.freeze(indicators) });
  }
  return Object.freeze({ get, periods: Object.freeze(Object.keys(PERIODS).map(Number)), timezone: "UTC" });
}
