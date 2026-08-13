import { caseFold } from 'unicode-case-folding';

const CategoriesScope = (() => {
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

class CategoriesError extends Error {
  constructor(code, message = 'Category operation failed') { super(message); this.name = 'CategoriesError'; this.code = code; }
}

const clean = (value) => typeof value === 'string' ? value.trim() : '';
function categoryView(row) {
  return row && Object.freeze({ id: row.id, parentId: row.parent_id, slug: row.slug, name: row.name,
    description: row.description, active: Boolean(row.active), createdAt: row.created_at, updatedAt: row.updated_at });
}
function validate(input, partial = false) {
  const output = {};
  if (!partial || input.name !== undefined) { output.name = clean(input.name); if (output.name.length < 2 || output.name.length > 120) throw new CategoriesError('INVALID_CATEGORY'); }
  if (!partial || input.slug !== undefined) { output.slug = clean(input.slug).toLowerCase(); if (output.slug.length > 120 || !SLUG.test(output.slug)) throw new CategoriesError('INVALID_CATEGORY'); }
  if (!partial || input.description !== undefined) { output.description = input.description == null ? null : clean(input.description); if (output.description?.length > 2000) throw new CategoriesError('INVALID_CATEGORY'); }
  if (!partial || input.parentId !== undefined) { output.parentId = input.parentId == null ? null : clean(input.parentId); if (output.parentId !== null && !output.parentId) throw new CategoriesError('INVALID_CATEGORY'); }
  if (!Object.keys(output).length) throw new CategoriesError('NO_CHANGES');
  return output;
}

function createCategories(options) {
  if (!options?.db?.first || !options.db.write || !options.db.all || !options?.events?.publish || typeof options.id !== 'function') throw new TypeError('Invalid Categories dependencies');
  const { db, events, logger, id, clock = () => new Date() } = options;
  const emit = (name, categoryId, context = {}, payload = {}) => events.publish({ name, version: '1.0', source: 'Categories', id: `evt_${id()}`,
    occurredAt: clock().toISOString(), payload: { categoryId, ...payload }, metadata: context.correlationId ? { correlationId: context.correlationId } : {} });
  const getById = async (categoryId) => categoryView(await db.first('SELECT * FROM categories WHERE id = ?', [categoryId]));
  const getBySlug = async (slug) => categoryView(await db.first('SELECT * FROM categories WHERE slug = ?', [clean(slug).toLowerCase()]));
  async function ensureSlug(slug, exceptId = '') { const found = await db.first('SELECT id FROM categories WHERE slug = ? AND id <> ?', [slug, exceptId]); if (found) throw new CategoriesError('SLUG_EXISTS'); }
  async function ensureParent(categoryId, parentId) {
    if (parentId === null) return;
    if (parentId === categoryId) throw new CategoriesError('HIERARCHY_CYCLE');
    if (!await getById(parentId)) throw new CategoriesError('PARENT_NOT_FOUND');
    let cursor = parentId; const visited = new Set();
    while (cursor) { if (cursor === categoryId || visited.has(cursor)) throw new CategoriesError('HIERARCHY_CYCLE'); visited.add(cursor); const row = await db.first('SELECT parent_id FROM categories WHERE id = ?', [cursor]); cursor = row?.parent_id ?? null; }
  }
  async function create(input, context = {}) {
    const data = validate(input); await ensureSlug(data.slug); await ensureParent('', data.parentId);
    const categoryId = `cat_${id()}`; const now = clock().toISOString();
    await db.write('INSERT INTO categories (id, parent_id, slug, name, description, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [categoryId, data.parentId, data.slug, data.name, data.description, 1, now, now]);
    logger.info('Category created', { operation: 'categories.create', status: 'completed', categoryId }); await emit('CategoryCreated', categoryId, context); return getById(categoryId);
  }
  async function update(categoryId, input, context = {}) {
    const current = await getById(categoryId); if (!current) throw new CategoriesError('NOT_FOUND'); const changes = validate(input, true);
    const data = { name: changes.name ?? current.name, slug: changes.slug ?? current.slug, description: changes.description !== undefined ? changes.description : current.description, parentId: changes.parentId !== undefined ? changes.parentId : current.parentId };
    await ensureSlug(data.slug, categoryId); await ensureParent(categoryId, data.parentId); const now = clock().toISOString();
    await db.write('UPDATE categories SET parent_id = ?, slug = ?, name = ?, description = ?, updated_at = ? WHERE id = ?', [data.parentId, data.slug, data.name, data.description, now, categoryId]);
    await emit('CategoryUpdated', categoryId, context); return getById(categoryId);
  }
  async function setActive(categoryId, active, context = {}) { if (!await getById(categoryId)) throw new CategoriesError('NOT_FOUND'); await db.write('UPDATE categories SET active = ?, updated_at = ? WHERE id = ?', [active ? 1 : 0, clock().toISOString(), categoryId]); await emit(active ? 'CategoryActivated' : 'CategoryDeactivated', categoryId, context); return getById(categoryId); }
  async function remove(categoryId, context = {}) { if (await db.first('SELECT id FROM listings WHERE category_id = ? LIMIT 1', [categoryId])) throw new CategoriesError('CATEGORY_IN_USE'); if (await db.first('SELECT id FROM categories WHERE parent_id = ? LIMIT 1', [categoryId])) throw new CategoriesError('CATEGORY_HAS_CHILDREN'); const result = await db.write('DELETE FROM categories WHERE id = ?', [categoryId]); if (!result.meta?.changes) throw new CategoriesError('NOT_FOUND'); await emit('CategoryDeleted', categoryId, context); return true; }
  async function list({ active } = {}) { const filtered = typeof active === 'boolean'; const result = await db.all(`SELECT * FROM categories${filtered ? ' WHERE active = ?' : ''} ORDER BY name, slug, id`, filtered ? [active ? 1 : 0] : []); return Object.freeze(result.results.map(categoryView)); }
  const listPublic = () => list({ active: true });
  const validatePublic = async (categoryId) => Boolean((await getById(categoryId))?.active);
  return Object.freeze({ create, getById, getBySlug, list, listPublic, update, activate: (value, ctx) => setActive(value, true, ctx), deactivate: (value, ctx) => setActive(value, false, ctx), remove, validatePublic, toPublic: (row) => { const value = categoryView(row); return value?.active ? value : null; } });
}

return { CategoriesError, createCategories };
})();
export const { CategoriesError, createCategories } = CategoriesScope;

const CompareScope = (() => {
const FIELDS = Object.freeze(['categoryId', 'listingType', 'priceMinor', 'currency', 'location.countryCode', 'location.region', 'location.city', 'location.district', 'attributes']);
class CompareError extends Error { constructor(code, message = 'Comparison operation failed') { super(message); this.name = 'CompareError'; this.code = code; } }
const valueAt = (item, field) => field.split('.').reduce((value, key) => value?.[key], item);
const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);
function safe(item) { const output = { id: item.id, categoryId: item.categoryId, slug: item.slug, title: item.title, listingType: item.listingType, priceMinor: item.priceMinor, currency: item.currency,
  location: item.location && { countryCode: item.location.countryCode, region: item.location.region, city: item.location.city, district: item.location.district }, attributes: item.attributes, publishedAt: item.publishedAt }; return Object.freeze(output); }

function createCompare({ getPublicListing, minItems = 2, maxItems = 4, events = null, id = null, clock = () => new Date() } = {}) {
  if (typeof getPublicListing !== 'function' || !Number.isInteger(minItems) || !Number.isInteger(maxItems) || minItems < 2 || maxItems < minItems) throw new TypeError('Invalid Compare dependencies');
  async function compare(ids, context = {}) {
    if (!Array.isArray(ids) || ids.some((value) => typeof value !== 'string' || !value.trim())) throw new CompareError('INVALID_IDS');
    const unique = [...new Set(ids.map((value) => value.trim()))]; if (unique.length < minItems || unique.length > maxItems) throw new CompareError('INVALID_QUANTITY');
    const loaded = await Promise.all(unique.map((listingId) => getPublicListing(listingId)));
    if (loaded.some((item) => !item)) throw new CompareError('LISTING_NOT_FOUND'); if (loaded.some((item) => item.status !== 'published' || !item.publishedAt)) throw new CompareError('LISTING_NOT_ELIGIBLE');
    const items = loaded.map(safe); const fields = Object.fromEntries(FIELDS.map((field) => { const values = items.map((item) => valueAt(item, field)); return [field, Object.freeze({ values: Object.freeze(values), same: values.every((value) => equal(value, values[0])) })]; }));
    const result = Object.freeze({ ids: Object.freeze(unique), items: Object.freeze(items), fields: Object.freeze(fields), similarities: Object.freeze(FIELDS.filter((field) => fields[field].same)), differences: Object.freeze(FIELDS.filter((field) => !fields[field].same)) });
    if (events?.publish && typeof id === 'function') await events.publish({ name: 'ComparisonCreated', version: '1.0', source: 'Compare', id: `evt_${id()}`, occurredAt: clock().toISOString(), payload: { listingIds: unique }, metadata: context.correlationId ? { correlationId: context.correlationId } : {} });
    return result;
  }
  return Object.freeze({ compare, fields: FIELDS, minItems, maxItems });
}

return { CompareError, createCompare };
})();
export const { CompareError, createCompare } = CompareScope;

const ContactsScope = (() => {
const STATUSES = new Set(["new", "read", "archived"]);
const ALLOWED = new Set([
  "listingId",
  "senderName",
  "senderEmail",
  "senderPhone",
  "message",
  "consent",
  "idempotencyKey",
]);
const clean = (value) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
class ContactsError extends Error {
  constructor(code) {
    super("Contact operation failed");
    this.name = "ContactsError";
    this.code = code;
  }
}
const view = (row) =>
  row &&
  Object.freeze({
    id: row.id,
    listingId: row.listing_id,
    recipientUserId: row.recipient_user_id,
    senderName: row.sender_name,
    senderEmail: row.sender_email,
    senderPhone: row.sender_phone,
    message: row.message,
    consentAt: row.consent_at,
    status: row.status,
    createdAt: row.created_at,
  });

function createContacts({
  db,
  events,
  logger,
  id,
  clock = () => new Date(),
  hash,
  resolveRecipient,
} = {}) {
  if (
    !db?.first ||
    !db?.write ||
    !db?.all ||
    !db?.batch ||
    !events?.publish ||
    !logger?.info ||
    !id ||
    !hash ||
    !resolveRecipient
  )
    throw new TypeError("Invalid Contacts dependencies");
  const emit = (name, contactId, context, payload = {}) =>
    events.publish({
      name,
      version: "1.0",
      source: "Contacts",
      id: `evt_${id()}`,
      occurredAt: clock().toISOString(),
      payload: { contactId, ...payload },
      metadata: context.correlationId
        ? { correlationId: context.correlationId }
        : {},
    });
  const owner = (row, context) => {
    if (!row) throw new ContactsError("NOT_FOUND");
    if (!context?.userId || row.recipient_user_id !== context.userId)
      throw new ContactsError("FORBIDDEN");
  };
  async function create(input, context = {}) {
    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      Object.keys(input).some((key) => !ALLOWED.has(key))
    )
      throw new ContactsError("INVALID_INPUT");
    const data = {
      listingId: input.listingId ?? null,
      senderName: clean(input.senderName),
      senderEmail: clean(input.senderEmail).toLowerCase(),
      senderPhone: input.senderPhone == null ? null : clean(input.senderPhone),
      message: clean(input.message),
      consent: input.consent === true,
      key: clean(input.idempotencyKey),
    };
    if (
      data.senderName.length < 2 ||
      data.senderName.length > 120 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.senderEmail) ||
      data.senderEmail.length > 254 ||
      data.senderPhone?.length > 32 ||
      data.message.length < 10 ||
      data.message.length > 5000 ||
      !data.consent ||
      data.key.length < 8 ||
      data.key.length > 128
    )
      throw new ContactsError("INVALID_INPUT");
    const recipient = await resolveRecipient(data.listingId, context);
    if (
      !recipient?.userId ||
      (data.listingId && recipient.listingExists !== true)
    )
      throw new ContactsError(
        data.listingId ? "INVALID_LISTING" : "INVALID_RECIPIENT",
      );
    const keyHash = await hash(data.key);
    const requestHash = await hash(
      JSON.stringify([
        recipient.userId,
        data.listingId,
        data.senderEmail,
        data.message,
      ]),
    );
    const prior = await db.first(
      "SELECT resource_id, request_hash FROM idempotency_records WHERE scope = ? AND idempotency_key_hash = ?",
      ["contacts.create", keyHash],
    );
    if (prior) {
      if (prior.request_hash !== requestHash)
        throw new ContactsError("IDEMPOTENCY_CONFLICT");
      return get(prior.resource_id, { userId: recipient.userId });
    }
    const contactId = `cnt_${id()}`;
    const now = clock().toISOString();
    await db.batch([
      {
        sql: "INSERT INTO contacts (id, listing_id, recipient_user_id, sender_name, sender_email, sender_phone, message, consent_at, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        parameters: [
          contactId,
          data.listingId,
          recipient.userId,
          data.senderName,
          data.senderEmail,
          data.senderPhone,
          data.message,
          now,
          "new",
          now,
        ],
      },
      {
        sql: "INSERT INTO idempotency_records (scope, idempotency_key_hash, request_hash, response_status, resource_type, resource_id, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        parameters: [
          "contacts.create",
          keyHash,
          requestHash,
          201,
          "contact",
          contactId,
          new Date(clock().getTime() + 86400000).toISOString(),
          now,
        ],
      },
    ]);
    logger.info("Contact created", {
      operation: "contacts.create",
      entityId: contactId,
      status: "completed",
      correlationId: context.correlationId,
    });
    await emit("ContactCreated", contactId, context, {
      recipientUserId: recipient.userId,
      listingId: data.listingId,
    });
    return get(contactId, { userId: recipient.userId });
  }
  async function get(contactId, context = {}) {
    const row = await db.first("SELECT * FROM contacts WHERE id = ?", [
      contactId,
    ]);
    owner(row, context);
    return view(row);
  }
  async function list(filters = {}, context = {}) {
    if (!context.userId) throw new ContactsError("FORBIDDEN");
    const page = filters.page ?? 1;
    const size = filters.pageSize ?? 20;
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      !Number.isSafeInteger(size) ||
      size < 1 ||
      size > 100 ||
      (filters.status && !STATUSES.has(filters.status))
    )
      throw new ContactsError("INVALID_FILTER");
    const params = [context.userId];
    let where = "recipient_user_id = ?";
    if (filters.status) {
      where += " AND status = ?";
      params.push(filters.status);
    }
    params.push(size, (page - 1) * size);
    const rows = await db.all(
      `SELECT * FROM contacts WHERE ${where} ORDER BY created_at DESC, id LIMIT ? OFFSET ?`,
      params,
    );
    return Object.freeze({
      page,
      pageSize: size,
      items: Object.freeze(rows.results.map(view)),
    });
  }
  async function setStatus(contactId, status, context = {}) {
    if (!STATUSES.has(status)) throw new ContactsError("INVALID_STATUS");
    const current = await db.first("SELECT * FROM contacts WHERE id = ?", [
      contactId,
    ]);
    owner(current, context);
    if (current.status === status) return view(current);
    await db.write(
      "UPDATE contacts SET status = ? WHERE id = ? AND recipient_user_id = ?",
      [status, contactId, context.userId],
    );
    await emit("ContactStatusChanged", contactId, context, {
      from: current.status,
      to: status,
    });
    return get(contactId, context);
  }
  return Object.freeze({
    create,
    get,
    list,
    setStatus,
    statuses: Object.freeze([...STATUSES]),
  });
}

return { ContactsError, createContacts };
})();
export const { ContactsError, createContacts } = ContactsScope;

const DashboardScope = (() => {
const PERIODS = Object.freeze({ 7: 7, 30: 30, 90: 90 });
const OWNER_INDICATORS = new Set(["listings", "contacts", "leads", "reviews", "subscription", "payments"]);
const ADMIN_INDICATORS = new Set(["listings", "contacts", "leads", "reviews"]);
const ADMIN_CAPABILITY = "management.dashboard.global";

class DashboardError extends Error {
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

function createDashboard({ db, logger, clock = () => new Date() } = {}) {
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

return { DashboardError, createDashboard };
})();
export const { DashboardError, createDashboard } = DashboardScope;

const FavoritesScope = (() => {
class FavoritesError extends Error { constructor(code, message = 'Favorite operation failed') { super(message); this.name = 'FavoritesError'; this.code = code; } }
const identifier = (value) => typeof value === 'string' && value.trim() ? value.trim() : null;

function createFavorites({ db, events, logger, id, clock = () => new Date(), validateListing } = {}) {
  if (!db?.first || !db?.write || !db?.all || !events?.publish || typeof logger?.info !== 'function' || typeof id !== 'function' || typeof validateListing !== 'function') throw new TypeError('Invalid Favorites dependencies');
  const user = (context) => { const userId = identifier(context?.userId); if (!userId) throw new FavoritesError('USER_REQUIRED'); return userId; };
  const listing = (value) => { const listingId = identifier(value); if (!listingId) throw new FavoritesError('INVALID_LISTING'); return listingId; };
  const emit = (name, listingId, context) => events.publish({ name, version: '1.0', source: 'Favorites', id: `evt_${id()}`, occurredAt: clock().toISOString(), payload: { listingId }, metadata: context.correlationId ? { correlationId: context.correlationId } : {} });
  async function has(listingId, context = {}) { const userId = user(context); listingId = listing(listingId); return Boolean(await db.first('SELECT listing_id FROM favorites WHERE user_id = ? AND listing_id = ?', [userId, listingId])); }
  async function add(listingId, context = {}) {
    const userId = user(context); listingId = listing(listingId); if (!await validateListing(listingId)) throw new FavoritesError('LISTING_NOT_ELIGIBLE');
    if (await db.first('SELECT listing_id FROM favorites WHERE user_id = ? AND listing_id = ?', [userId, listingId])) return Object.freeze({ userId, listingId, added: false });
    await db.write('INSERT INTO favorites (user_id, listing_id, created_at) VALUES (?, ?, ?)', [userId, listingId, clock().toISOString()]); logger.info('Favorite added', { operation: 'favorites.add', status: 'completed' }); await emit('FavoriteAdded', listingId, context); return Object.freeze({ userId, listingId, added: true });
  }
  async function remove(listingId, context = {}) {
    const userId = user(context); listingId = listing(listingId); const result = await db.write('DELETE FROM favorites WHERE user_id = ? AND listing_id = ?', [userId, listingId]); const removed = Boolean(result.meta?.changes);
    if (removed) { logger.info('Favorite removed', { operation: 'favorites.remove', status: 'completed' }); await emit('FavoriteRemoved', listingId, context); } return removed;
  }
  async function list(options = {}, context = {}) {
    const userId = user(context); const page = options.page ?? 1; const pageSize = options.pageSize ?? 20;
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new FavoritesError('INVALID_PAGINATION');
    const result = await db.all('SELECT listing_id, created_at FROM favorites WHERE user_id = ? ORDER BY created_at DESC, listing_id LIMIT ? OFFSET ?', [userId, pageSize, (page - 1) * pageSize]);
    return Object.freeze({ page, pageSize, items: Object.freeze(result.results.map((row) => Object.freeze({ listingId: row.listing_id, createdAt: row.created_at }))) });
  }
  return Object.freeze({ add, remove, has, list });
}

return { FavoritesError, createFavorites };
})();
export const { FavoritesError, createFavorites } = FavoritesScope;

const LeadsScope = (() => {
const STATES = Object.freeze(["new", "contacted", "qualified", "won", "lost"]);
const NEXT = {
  new: ["contacted", "lost"],
  contacted: ["qualified", "lost"],
  qualified: ["won", "lost"],
  won: [],
  lost: [],
};
class LeadsError extends Error {
  constructor(code) {
    super("Lead operation failed");
    this.name = "LeadsError";
    this.code = code;
  }
}
const view = (r) =>
  r &&
  Object.freeze({
    id: r.id,
    contactId: r.contact_id,
    assignedUserId: r.assigned_user_id,
    status: r.status,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  });
function createLeads({
  db,
  events,
  logger,
  id,
  clock = () => new Date(),
} = {}) {
  if (
    !db?.first ||
    !db?.write ||
    !db?.all ||
    !events?.publish ||
    !logger?.info ||
    !id
  )
    throw new TypeError("Invalid Leads dependencies");
  const emit = (name, leadId, context, payload = {}) =>
    events.publish({
      name,
      version: "1.0",
      source: "Leads",
      id: `evt_${id()}`,
      occurredAt: clock().toISOString(),
      payload: { leadId, ...payload },
      metadata: context.correlationId
        ? { correlationId: context.correlationId }
        : {},
    });
  const own = (row, ctx) => {
    if (!row) throw new LeadsError("NOT_FOUND");
    if (!ctx?.userId || row.assigned_user_id !== ctx.userId)
      throw new LeadsError("FORBIDDEN");
  };
  async function get(leadId, ctx = {}) {
    const row = await db.first("SELECT * FROM leads WHERE id = ?", [leadId]);
    own(row, ctx);
    return view(row);
  }
  async function create(input, ctx = {}) {
    if (
      !ctx.userId ||
      !input ||
      Object.keys(input).some((k) => !["contactId", "notes"].includes(k))
    )
      throw new LeadsError("INVALID_INPUT");
    const notes = input.notes == null ? null : input.notes.trim();
    if (!input.contactId || notes?.length > 5000)
      throw new LeadsError("INVALID_INPUT");
    const contact = await db.first(
      "SELECT id, recipient_user_id, listing_id FROM contacts WHERE id = ?",
      [input.contactId],
    );
    if (!contact) throw new LeadsError("INVALID_CONTACT");
    if (contact.recipient_user_id !== ctx.userId)
      throw new LeadsError("CONTACT_OWNER_MISMATCH");
    const prior = await db.first("SELECT * FROM leads WHERE contact_id = ?", [
      input.contactId,
    ]);
    if (prior) {
      own(prior, ctx);
      return view(prior);
    }
    const leadId = `led_${id()}`;
    const now = clock().toISOString();
    await db.write(
      "INSERT INTO leads (id, contact_id, assigned_user_id, status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [leadId, input.contactId, ctx.userId, "new", notes, now, now],
    );
    logger.info("Lead created", {
      operation: "leads.create",
      entityId: leadId,
      status: "completed",
      correlationId: ctx.correlationId,
    });
    await emit("LeadCreated", leadId, ctx, { contactId: input.contactId });
    return get(leadId, ctx);
  }
  async function transition(leadId, status, ctx = {}) {
    if (!STATES.includes(status)) throw new LeadsError("INVALID_STATUS");
    const row = await db.first("SELECT * FROM leads WHERE id = ?", [leadId]);
    own(row, ctx);
    if (row.status === status) return view(row);
    if (!NEXT[row.status]?.includes(status))
      throw new LeadsError("INVALID_TRANSITION");
    await db.write(
      "UPDATE leads SET status = ?, updated_at = ? WHERE id = ? AND assigned_user_id = ?",
      [status, clock().toISOString(), leadId, ctx.userId],
    );
    await emit("LeadStatusChanged", leadId, ctx, {
      from: row.status,
      to: status,
    });
    return get(leadId, ctx);
  }
  async function updateNotes(leadId, notes, ctx = {}) {
    if (typeof notes !== "string" || notes.trim().length > 5000)
      throw new LeadsError("INVALID_NOTES");
    const row = await db.first("SELECT * FROM leads WHERE id = ?", [leadId]);
    own(row, ctx);
    await db.write(
      "UPDATE leads SET notes = ?, updated_at = ? WHERE id = ? AND assigned_user_id = ?",
      [notes.trim(), clock().toISOString(), leadId, ctx.userId],
    );
    await emit("LeadNotesUpdated", leadId, ctx);
    return get(leadId, ctx);
  }
  async function list(filters = {}, ctx = {}) {
    if (!ctx.userId) throw new LeadsError("FORBIDDEN");
    const page = filters.page ?? 1,
      size = filters.pageSize ?? 20;
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      !Number.isSafeInteger(size) ||
      size < 1 ||
      size > 100 ||
      (filters.status && !STATES.includes(filters.status))
    )
      throw new LeadsError("INVALID_FILTER");
    const p = [ctx.userId];
    let where = "assigned_user_id = ?";
    for (const [key, op] of [
      ["status", "="],
      ["from", ">="],
      ["to", "<="],
    ])
      if (filters[key]) {
        where += ` AND ${key === "status" ? "status" : "created_at"} ${op} ?`;
        p.push(filters[key]);
      }
    p.push(size, (page - 1) * size);
    const result = await db.all(
      `SELECT * FROM leads WHERE ${where} ORDER BY created_at DESC, id LIMIT ? OFFSET ?`,
      p,
    );
    return Object.freeze({
      page,
      pageSize: size,
      items: Object.freeze(result.results.map(view)),
    });
  }
  return Object.freeze({
    create,
    get,
    list,
    transition,
    updateNotes,
    states: STATES,
  });
}

return { LeadsError, createLeads };
})();
export const { LeadsError, createLeads } = LeadsScope;

const ListingsScope = (() => {

const STATES = Object.freeze(['draft', 'pending', 'published', 'archived', 'deleted']);
const TYPES = new Set(['sale', 'rent']); const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/; const CURRENCY = /^[A-Z]{3}$/; const COUNTRY = /^[A-Z]{2}$/;
class ListingsError extends Error { constructor(code, message = 'Listing operation failed') { super(message); this.name = 'ListingsError'; this.code = code; } }
const text = (value) => typeof value === 'string' ? value.trim() : '';
const parse = (value) => { try { const result = JSON.parse(value ?? '{}'); return result && typeof result === 'object' && !Array.isArray(result) ? result : {}; } catch { return {}; } };
const CITY_CANONICALIZATION_VERSION = 'unicode-17.0.0-v1';
const CITY_COMPONENT = /^[a-z0-9]+(?: [a-z0-9]+)*$/;
function canonicalizeCityLocation(input, version = CITY_CANONICALIZATION_VERSION) {
  if (version !== CITY_CANONICALIZATION_VERSION) throw new ListingsError('UNKNOWN_CANONICALIZATION_VERSION');
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ListingsError('INVALID_CITY');
  const countryCode = input.countryCode;
  if (typeof countryCode !== 'string' || !COUNTRY.test(countryCode)) throw new ListingsError('INVALID_CITY');
  const canonicalize = (value, publicLimit) => {
    if (typeof value !== 'string' || [...value].length < 1 || [...value].length > publicLimit || /[\p{Cc}\p{Cs}\p{Cn}\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u.test(value)) throw new ListingsError('INVALID_CITY');
    const publicName = value.normalize('NFC').replace(/\s+/gu, ' ').trim();
    let key = caseFold(publicName.normalize('NFKD').replace(/\p{M}/gu, ''));
    key = key.replace(/[‐‑‒–—―−]/gu, '-').replace(/[’‘‛′`´]/gu, "'");
    key = key.replace(/[\p{P}\p{Z}\s]+/gu, ' ');
    if (/[^a-z0-9 ]/u.test(key)) throw new ListingsError('INVALID_CITY');
    key = key.replace(/ +/g, ' ').trim();
    if (!publicName || [...publicName].length > publicLimit || !key || key.length > 80 || !CITY_COMPONENT.test(key)) throw new ListingsError('INVALID_CITY');
    return { publicName, key };
  };
  const region = canonicalize(input.region, 120); const city = canonicalize(input.city, 120);
  return Object.freeze({ countryCode, regionKey: region.key, cityKey: city.key, publicName: city.publicName,
    canonicalKey: `${countryCode}|${region.key}|${city.key}`, canonicalizationVersion: version });
}
async function createCitySlug(canonicalKey) {
  if (typeof canonicalKey !== 'string' || canonicalKey.length < 5 || canonicalKey.length > 170) throw new ListingsError('INVALID_CITY');
  const parts = canonicalKey.split('|'); if (parts.length !== 3 || !COUNTRY.test(parts[0]) || !CITY_COMPONENT.test(parts[1]) || !CITY_COMPONENT.test(parts[2])) throw new ListingsError('INVALID_CITY');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalKey));
  const suffix = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 12);
  const stem = parts.join('-').toLowerCase().replace(/ +/g, '-'); return `${stem.slice(0, 87).replace(/-+$/g, '')}-${suffix}`;
}
function view(row) { return row && Object.freeze({ id: row.id, ownerId: row.owner_id, categoryId: row.category_id, cityId: row.city_id, slug: row.slug, title: row.title,
  description: row.description, listingType: row.listing_type, status: row.status, priceMinor: row.price_minor, currency: row.currency,
  location: Object.freeze({ countryCode: row.country_code, region: row.region, city: row.city, district: row.district, addressLine: row.address_line, postalCode: row.postal_code, latitude: row.latitude, longitude: row.longitude }),
  attributes: Object.freeze(parse(row.attributes_json)), publishedAt: row.published_at, createdAt: row.created_at, updatedAt: row.updated_at }); }
function normalized(input) {
  const location = input?.location ?? {}; const attributes = input?.attributes;
  const data = { categoryId: text(input?.categoryId), slug: text(input?.slug).toLowerCase(), title: text(input?.title), description: text(input?.description), listingType: input?.listingType,
    priceMinor: input?.priceMinor, currency: input?.currency ?? 'BRL', countryCode: location.countryCode ?? 'BR', region: text(location.region), city: text(location.city), district: location.district == null ? null : text(location.district), addressLine: location.addressLine == null ? null : text(location.addressLine), postalCode: location.postalCode == null ? null : text(location.postalCode), latitude: location.latitude ?? null, longitude: location.longitude ?? null, attributes };
  if (!data.categoryId || !SLUG.test(data.slug) || data.slug.length > 120 || data.title.length < 5 || data.title.length > 160 || data.description.length < 20 || data.description.length > 10000 || !TYPES.has(data.listingType)
    || !Number.isSafeInteger(data.priceMinor) || data.priceMinor < 0 || !CURRENCY.test(data.currency) || !COUNTRY.test(data.countryCode) || data.region.length < 2 || data.region.length > 120 || data.city.length < 2 || data.city.length > 120
    || data.district?.length > 120 || data.addressLine?.length > 240 || data.postalCode?.length > 20 || (data.latitude !== null && (typeof data.latitude !== 'number' || data.latitude < -90 || data.latitude > 90)) || (data.longitude !== null && (typeof data.longitude !== 'number' || data.longitude < -180 || data.longitude > 180))
    || !attributes || typeof attributes !== 'object' || Array.isArray(attributes) || Object.keys(attributes).length > 100) throw new ListingsError('INVALID_LISTING');
  try { JSON.stringify(attributes); } catch { throw new ListingsError('INVALID_LISTING'); } return data;
}
function validateShape(input, partial = false) {
  const allowed = new Set(['categoryId', 'slug', 'title', 'description', 'listingType', 'priceMinor', 'currency', 'location', 'attributes']);
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some((key) => !allowed.has(key))) throw new ListingsError('INVALID_LISTING');
  const locationAllowed = new Set(['countryCode', 'region', 'city', 'district', 'addressLine', 'postalCode', 'latitude', 'longitude']);
  if (input.location !== undefined && (!input.location || typeof input.location !== 'object' || Array.isArray(input.location) || Object.keys(input.location).some((key) => !locationAllowed.has(key)))) throw new ListingsError('INVALID_LISTING');
  if (!partial && [...allowed].some((key) => !['currency'].includes(key) && input[key] === undefined)) throw new ListingsError('INVALID_LISTING');
}
function publicView(item, media = []) { if (!item || item.status !== 'published') return null; return Object.freeze({ id: item.id, categoryId: item.categoryId, slug: item.slug, title: item.title, description: item.description, listingType: item.listingType, priceMinor: item.priceMinor, currency: item.currency, location: item.location, attributes: item.attributes, publishedAt: item.publishedAt, media: Object.freeze(media) }); }
function createListings(options) {
  if (!options?.db?.first || !options.db.write || !options.db.all || !options?.events?.publish || typeof options.id !== 'function' || typeof options.validateCategory !== 'function' || typeof options.listMedia !== 'function') throw new TypeError('Invalid Listings dependencies');
  const { db, events, logger, id, clock = () => new Date(), validateCategory, listMedia } = options;
  const emit = (name, listingId, context = {}, payload = {}) => events.publish({ name, version: '1.0', source: 'Listings', id: `evt_${id()}`, occurredAt: clock().toISOString(), payload: { listingId, ...payload }, metadata: context.correlationId ? { correlationId: context.correlationId } : {} });
  const getById = async (listingId) => view(await db.first('SELECT * FROM listings WHERE id = ?', [listingId]));
  const owner = (item, context) => { if (!item) throw new ListingsError('NOT_FOUND'); if (!context?.userId || item.ownerId !== context.userId) throw new ListingsError('FORBIDDEN'); };
  async function validateData(input, exceptId = '') { const data = normalized(input); if (!await validateCategory(data.categoryId)) throw new ListingsError('INVALID_CATEGORY'); if (await db.first('SELECT id FROM listings WHERE slug = ? AND id <> ?', [data.slug, exceptId])) throw new ListingsError('SLUG_EXISTS'); return data; }
  async function resolveCity(data) {
    const canonical = canonicalizeCityLocation(data); const slug = await createCitySlug(canonical.canonicalKey);
    let city = await db.first('SELECT * FROM cities WHERE canonical_key = ?', [canonical.canonicalKey]);
    if (!city) {
      const cityId = `city_${id()}`; const now = clock().toISOString();
      try { await db.write('INSERT INTO cities (id, country_code, region_key, city_key, canonical_key, public_name, slug, canonicalization_version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [cityId, canonical.countryCode, canonical.regionKey, canonical.cityKey, canonical.canonicalKey, canonical.publicName, slug, canonical.canonicalizationVersion, now, now]); }
      catch { city = await db.first('SELECT * FROM cities WHERE canonical_key = ?', [canonical.canonicalKey]); if (!city) throw new ListingsError('CITY_CONFLICT'); }
      city ??= await db.first('SELECT * FROM cities WHERE canonical_key = ?', [canonical.canonicalKey]);
    }
    if (!city || city.slug !== slug || city.canonicalization_version !== canonical.canonicalizationVersion || city.country_code !== canonical.countryCode || city.region_key !== canonical.regionKey || city.city_key !== canonical.cityKey) throw new ListingsError('CITY_CONFLICT');
    if (city.active !== 1) throw new ListingsError('INACTIVE_CITY');
    try { await db.write("INSERT INTO city_publication_state (city_id, status) VALUES (?, 'idle')", [city.id]); } catch { if (!await db.first('SELECT city_id FROM city_publication_state WHERE city_id = ?', [city.id])) throw new ListingsError('CITY_CONFLICT'); }
    return city.id;
  }
  async function create(input, context = {}) {
    if (!context.userId) throw new ListingsError('OWNER_REQUIRED'); validateShape(input); const data = await validateData(input); const cityId = await resolveCity(data); const listingId = `lst_${id()}`; const now = clock().toISOString();
    await db.write('INSERT INTO listings (id, owner_id, category_id, city_id, slug, title, description, listing_type, status, price_minor, currency, country_code, region, city, district, address_line, postal_code, latitude, longitude, attributes_json, published_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [listingId, context.userId, data.categoryId, cityId, data.slug, data.title, data.description, data.listingType, 'draft', data.priceMinor, data.currency, data.countryCode, data.region, data.city, data.district, data.addressLine, data.postalCode, data.latitude, data.longitude, JSON.stringify(data.attributes), null, now, now]);
    logger.info('Listing created', { operation: 'listings.create', status: 'completed', listingId }); await emit('ListingCreated', listingId, context); return getById(listingId);
  }
  async function update(listingId, input, context = {}) {
    const current = await getById(listingId); owner(current, context); if (current.status !== 'draft') throw new ListingsError('IMMUTABLE_STATE');
    const protectedFields = ['id', 'ownerId', 'status', 'publishedAt', 'createdAt', 'updatedAt']; if (protectedFields.some((key) => key in input)) throw new ListingsError('PROTECTED_FIELD');
    validateShape(input, true);
    const merged = { ...current, ...input, location: { ...current.location, ...(input.location ?? {}) }, attributes: input.attributes ?? current.attributes }; const data = await validateData(merged, listingId); const now = clock().toISOString();
    const locationChanged = input.location !== undefined && (data.countryCode !== current.location.countryCode || data.region !== current.location.region || data.city !== current.location.city);
    const cityId = locationChanged || !current.cityId ? await resolveCity(data) : current.cityId;
    await db.write('UPDATE listings SET category_id = ?, city_id = ?, slug = ?, title = ?, description = ?, listing_type = ?, price_minor = ?, currency = ?, country_code = ?, region = ?, city = ?, district = ?, address_line = ?, postal_code = ?, latitude = ?, longitude = ?, attributes_json = ?, updated_at = ? WHERE id = ?', [data.categoryId, cityId, data.slug, data.title, data.description, data.listingType, data.priceMinor, data.currency, data.countryCode, data.region, data.city, data.district, data.addressLine, data.postalCode, data.latitude, data.longitude, JSON.stringify(data.attributes), now, listingId]);
    await emit('ListingUpdated', listingId, context); return getById(listingId);
  }
  async function transition(listingId, expected, target, eventName, context = {}) {
    const current = await getById(listingId); owner(current, context); if (!expected.includes(current.status)) throw new ListingsError('INVALID_TRANSITION');
    if (target === 'pending') normalized(current); const publishedAt = target === 'published' ? clock().toISOString() : current.publishedAt;
    await db.write('UPDATE listings SET status = ?, published_at = ?, updated_at = ? WHERE id = ?', [target, publishedAt, clock().toISOString(), listingId]); await emit(eventName, listingId, context, { from: current.status, to: target }); return getById(listingId);
  }
  async function list(filters = {}) { const page = Number.isSafeInteger(filters.page) && filters.page > 0 ? filters.page : 1; const pageSize = Number.isSafeInteger(filters.pageSize) && filters.pageSize > 0 && filters.pageSize <= 100 ? filters.pageSize : 20; const clauses = []; const parameters = [];
    for (const [key, column] of Object.entries({ ownerId: 'owner_id', categoryId: 'category_id', status: 'status', listingType: 'listing_type', region: 'region', city: 'city', currency: 'currency' })) if (filters[key] !== undefined) { if (key === 'status' && !STATES.includes(filters[key])) throw new ListingsError('INVALID_FILTER'); clauses.push(`${column} = ?`); parameters.push(filters[key]); }
    parameters.push(pageSize, (page - 1) * pageSize); const result = await db.all(`SELECT * FROM listings${clauses.length ? ` WHERE ${clauses.join(' AND ')}` : ''} ORDER BY created_at DESC, id LIMIT ? OFFSET ?`, parameters); return Object.freeze({ page, pageSize, items: Object.freeze(result.results.map(view)) });
  }
  async function getPrivate(listingId, context) { const item = await getById(listingId); owner(item, context); return Object.freeze({ ...item, media: Object.freeze(await listMedia(listingId, context)) }); }
  async function getPublicBySlug(slug) { const item = view(await db.first('SELECT * FROM listings WHERE slug = ? AND status = ?', [text(slug).toLowerCase(), 'published'])); return publicView(item, item ? await listMedia(item.id, {}) : []); }
  const publish = (value, context = {}) => { if (context.canPublish !== true) throw new ListingsError('FORBIDDEN'); return transition(value, ['pending'], 'published', 'ListingPublished', context); };
  return Object.freeze({ create, update, getById, getPrivate, getPublicBySlug, list, submit: (value, ctx) => transition(value, ['draft'], 'pending', 'ListingUpdated', ctx), publish, archive: (value, ctx) => transition(value, ['draft', 'pending', 'published'], 'archived', 'ListingArchived', ctx), remove: (value, ctx) => transition(value, ['draft', 'pending', 'published', 'archived'], 'deleted', 'ListingDeleted', ctx), validateOwner: async (listingId, ownerId) => (await getById(listingId))?.ownerId === ownerId, toPublic: publicView, states: STATES });
}

return { ListingsError, CITY_CANONICALIZATION_VERSION, canonicalizeCityLocation, createCitySlug, createListings };
})();
export const { ListingsError, CITY_CANONICALIZATION_VERSION, canonicalizeCityLocation, createCitySlug, createListings } = ListingsScope;

const MediaScope = (() => {
const TYPES = new Set(['image', 'video', 'document']);
const MIME = /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/i;
const KEY = /^(?!\/)(?!.*(?:^|\/)\.\.?(?:\/|$))[^\\\u0000-\u001f]{1,512}$/;
class MediaError extends Error { constructor(code, message = 'Media operation failed') { super(message); this.name = 'MediaError'; this.code = code; } }
const view = (row) => row && Object.freeze({ id: row.id, ownerId: row.owner_id, listingId: row.listing_id, r2Key: row.r2_key,
  mediaType: row.media_type, mimeType: row.mime_type, byteSize: row.byte_size, checksumSha256: row.checksum_sha256,
  width: row.width, height: row.height, altText: row.alt_text, sortOrder: row.sort_order, createdAt: row.created_at });
function technical(input) {
  if (!input || !KEY.test(input.r2Key ?? '') || !TYPES.has(input.mediaType) || !MIME.test(input.mimeType ?? '')
    || !Number.isSafeInteger(input.byteSize) || input.byteSize <= 0 || !/^[a-f0-9]{64}$/i.test(input.checksumSha256 ?? '')
    || (input.width != null && (!Number.isSafeInteger(input.width) || input.width <= 0))
    || (input.height != null && (!Number.isSafeInteger(input.height) || input.height <= 0))) throw new MediaError('INVALID_MEDIA');
}
function mutable(input) {
  const data = {};
  if (input.listingId !== undefined) data.listingId = input.listingId === null ? null : String(input.listingId);
  if (input.altText !== undefined) { data.altText = input.altText === null ? null : String(input.altText).trim(); if (data.altText?.length > 300) throw new MediaError('INVALID_MEDIA'); }
  if (input.sortOrder !== undefined) { if (!Number.isSafeInteger(input.sortOrder) || input.sortOrder < 0) throw new MediaError('INVALID_MEDIA'); data.sortOrder = input.sortOrder; }
  if (!Object.keys(data).length) throw new MediaError('NO_CHANGES'); return data;
}
function createMedia(options) {
  if (!options?.db?.first || !options.db.write || !options.db.all || !options?.events?.publish || typeof options.id !== 'function' || typeof options.validateListingOwner !== 'function') throw new TypeError('Invalid Media dependencies');
  const { db, events, logger, id, clock = () => new Date(), validateListingOwner } = options;
  const emit = (name, mediaId, context = {}, payload = {}) => events.publish({ name, version: '1.0', source: 'Media', id: `evt_${id()}`, occurredAt: clock().toISOString(), payload: { mediaId, ...payload }, metadata: context.correlationId ? { correlationId: context.correlationId } : {} });
  const lookup = async (mediaId) => view(await db.first('SELECT * FROM media WHERE id = ?', [mediaId]));
  const assertOwner = (item, ownerId) => { if (!item) throw new MediaError('NOT_FOUND'); if (item.ownerId !== ownerId) throw new MediaError('FORBIDDEN'); };
  async function ensureListing(listingId, ownerId) { if (listingId !== null && !await validateListingOwner(listingId, ownerId)) throw new MediaError('INVALID_LISTING_OWNER'); }
  async function register(input, context = {}) {
    technical(input); const ownerId = input.ownerId ?? context.userId; if (!ownerId) throw new MediaError('OWNER_REQUIRED'); await ensureListing(input.listingId ?? null, ownerId);
    if (await db.first('SELECT id FROM media WHERE r2_key = ?', [input.r2Key])) throw new MediaError('R2_KEY_EXISTS'); const mediaId = `med_${id()}`; const createdAt = clock().toISOString();
    await db.write('INSERT INTO media (id, owner_id, listing_id, r2_key, media_type, mime_type, byte_size, checksum_sha256, width, height, alt_text, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [mediaId, ownerId, input.listingId ?? null, input.r2Key, input.mediaType, input.mimeType.toLowerCase(), input.byteSize, input.checksumSha256.toLowerCase(), input.width ?? null, input.height ?? null, input.altText ?? null, input.sortOrder ?? 0, createdAt]);
    logger.info('Media registered', { operation: 'media.register', status: 'completed', mediaId }); await emit('MediaCreated', mediaId, context, { ownerId }); return lookup(mediaId);
  }
  async function update(mediaId, input, context = {}) {
    const current = await lookup(mediaId); assertOwner(current, context.userId); const changes = mutable(input); const listingId = changes.listingId !== undefined ? changes.listingId : current.listingId; await ensureListing(listingId, current.ownerId);
    await db.write('UPDATE media SET listing_id = ?, alt_text = ?, sort_order = ? WHERE id = ?', [listingId, changes.altText !== undefined ? changes.altText : current.altText, changes.sortOrder ?? current.sortOrder, mediaId]);
    const changedAssociation = listingId !== current.listingId; await emit(changedAssociation ? (listingId ? 'MediaAttached' : 'MediaDetached') : 'MediaUpdated', mediaId, context, { listingId }); return lookup(mediaId);
  }
  async function list(column, value) { const result = await db.all(`SELECT * FROM media WHERE ${column} = ? ORDER BY sort_order, created_at, id`, [value]); return Object.freeze(result.results.map(view)); }
  async function getById(mediaId, context = {}) { const item = await lookup(mediaId); assertOwner(item, context.userId); return item; }
  return Object.freeze({ register, getById, update, attach: (mediaId, listingId, context) => update(mediaId, { listingId }, context), detach: (mediaId, context) => update(mediaId, { listingId: null }, context), listByOwner: (ownerId) => list('owner_id', ownerId), listByListing: (listingId) => list('listing_id', listingId), toReference: (row) => { const item = view(row); return item && Object.freeze({ id: item.id, r2Key: item.r2Key, mediaType: item.mediaType, mimeType: item.mimeType, width: item.width, height: item.height, altText: item.altText, sortOrder: item.sortOrder }); } });
}

return { MediaError, createMedia };
})();
export const { MediaError, createMedia } = MediaScope;

const NotificationsScope = (() => {
const STATUSES = new Set(["pending", "sent", "failed", "read"]);
const CHANNEL = "internal";
class NotificationsError extends Error {
  constructor(code) {
    super("Notification operation failed");
    this.name = "NotificationsError";
    this.code = code;
  }
}
const view = (r) =>
  r &&
  Object.freeze({
    id: r.id,
    userId: r.user_id,
    kind: r.kind,
    channel: CHANNEL,
    title: r.title,
    body: r.body,
    status: r.status,
    readAt: r.read_at,
    sentAt: r.sent_at,
    createdAt: r.created_at,
  });
function createNotifications({
  db,
  events,
  logger,
  id,
  clock = () => new Date(),
  hash,
} = {}) {
  if (
    !db?.first ||
    !db?.write ||
    !db?.all ||
    !db?.batch ||
    !events?.publish ||
    !logger?.info ||
    !id ||
    !hash
  )
    throw new TypeError("Invalid Notifications dependencies");
  const emit = (name, notificationId, context, payload = {}) =>
    events.publish({
      name,
      version: "1.0",
      source: "Notifications",
      id: `evt_${id()}`,
      occurredAt: clock().toISOString(),
      payload: { notificationId, ...payload },
      metadata: context.correlationId
        ? { correlationId: context.correlationId }
        : {},
    });
  const own = (row, ctx) => {
    if (!row) throw new NotificationsError("NOT_FOUND");
    if (!ctx?.userId || row.user_id !== ctx.userId)
      throw new NotificationsError("FORBIDDEN");
  };
  async function get(notificationId, context = {}) {
    const row = await db.first("SELECT * FROM notifications WHERE id = ?", [
      notificationId,
    ]);
    own(row, context);
    return view(row);
  }
  async function preferences(userId) {
    const row = await db.first(
      "SELECT value_json FROM settings WHERE key = ?",
      [`notification.preferences.${userId}`],
    );
    try {
      return Object.freeze(JSON.parse(row?.value_json ?? "{}"));
    } catch {
      return Object.freeze({});
    }
  }
  async function setPreferences(input, context = {}) {
    if (
      !context.userId ||
      !input ||
      Object.keys(input).some((key) => key !== CHANNEL) ||
      typeof input.internal !== "boolean"
    )
      throw new NotificationsError("INVALID_PREFERENCES");
    const key = `notification.preferences.${context.userId}`;
    const json = JSON.stringify({ internal: input.internal });
    await db.write(
      "INSERT INTO settings (key, value_json, visibility, description, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at",
      [
        key,
        json,
        "private",
        "Preferências internas de notificação",
        clock().toISOString(),
      ],
    );
    await emit("NotificationPreferencesChanged", context.userId, context);
    return Object.freeze({ internal: input.internal });
  }
  async function create(input, context = {}) {
    if (
      context.canNotify !== true ||
      !input ||
      Object.keys(input).some(
        (key) =>
          ![
            "userId",
            "kind",
            "title",
            "body",
            "channel",
            "idempotencyKey",
          ].includes(key),
      )
    )
      throw new NotificationsError("FORBIDDEN");
    const data = {
      userId: input.userId?.trim(),
      kind: input.kind?.trim(),
      title: input.title?.trim(),
      body: input.body?.trim(),
      key: input.idempotencyKey?.trim(),
      channel: input.channel ?? CHANNEL,
    };
    if (
      !data.userId ||
      !data.kind ||
      data.kind.length < 2 ||
      data.kind.length > 64 ||
      !data.title ||
      data.title.length > 160 ||
      !data.body ||
      data.body.length > 2000 ||
      data.channel !== CHANNEL ||
      !data.key ||
      data.key.length < 8 ||
      data.key.length > 128
    )
      throw new NotificationsError("INVALID_INPUT");
    const pref = await preferences(data.userId);
    if (pref.internal === false)
      return Object.freeze({ created: false, reason: "preference-disabled" });
    const keyHash = await hash(data.key),
      requestHash = await hash(JSON.stringify(data));
    const prior = await db.first(
      "SELECT resource_id, request_hash FROM idempotency_records WHERE scope = ? AND idempotency_key_hash = ?",
      ["notifications.create", keyHash],
    );
    if (prior) {
      if (prior.request_hash !== requestHash)
        throw new NotificationsError("IDEMPOTENCY_CONFLICT");
      return get(prior.resource_id, { userId: data.userId });
    }
    const notificationId = `ntf_${id()}`,
      now = clock().toISOString();
    await db.batch([
      {
        sql: "INSERT INTO notifications (id, user_id, kind, title, body, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        parameters: [
          notificationId,
          data.userId,
          data.kind,
          data.title,
          data.body,
          "pending",
          now,
        ],
      },
      {
        sql: "INSERT INTO idempotency_records (scope, idempotency_key_hash, request_hash, response_status, resource_type, resource_id, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        parameters: [
          "notifications.create",
          keyHash,
          requestHash,
          201,
          "notification",
          notificationId,
          new Date(clock().getTime() + 604800000).toISOString(),
          now,
        ],
      },
    ]);
    logger.info("Notification created", {
      operation: "notifications.create",
      entityId: notificationId,
      status: "completed",
      correlationId: context.correlationId,
    });
    await emit("NotificationCreated", notificationId, context, {
      userId: data.userId,
      kind: data.kind,
      channel: CHANNEL,
    });
    return get(notificationId, { userId: data.userId });
  }
  async function change(
    notificationId,
    target,
    context = {},
    errorCode = null,
  ) {
    if (!STATUSES.has(target)) throw new NotificationsError("INVALID_STATUS");
    const row = await db.first("SELECT * FROM notifications WHERE id = ?", [
      notificationId,
    ]);
    own(row, context);
    if (row.status === target) return view(row);
    const readAt = target === "read" ? clock().toISOString() : row.read_at,
      sentAt = target === "sent" ? clock().toISOString() : row.sent_at;
    await db.write(
      "UPDATE notifications SET status = ?, read_at = ?, sent_at = ? WHERE id = ? AND user_id = ?",
      [target, readAt, sentAt, notificationId, context.userId],
    );
    await emit(
      target === "read"
        ? "NotificationRead"
        : target === "failed"
          ? "NotificationFailed"
          : "NotificationStatusChanged",
      notificationId,
      context,
      errorCode ? { errorCode } : { to: target },
    );
    return get(notificationId, context);
  }
  async function list(filters = {}, context = {}) {
    if (!context.userId) throw new NotificationsError("FORBIDDEN");
    const page = filters.page ?? 1,
      size = filters.pageSize ?? 20;
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      !Number.isSafeInteger(size) ||
      size < 1 ||
      size > 100 ||
      (filters.status && !STATUSES.has(filters.status))
    )
      throw new NotificationsError("INVALID_FILTER");
    const p = [context.userId];
    let extra = "";
    if (filters.status) {
      extra = " AND status = ?";
      p.push(filters.status);
    }
    p.push(size, (page - 1) * size);
    const rows = await db.all(
      `SELECT * FROM notifications WHERE user_id = ?${extra} ORDER BY created_at DESC, id LIMIT ? OFFSET ?`,
      p,
    );
    return Object.freeze({
      page,
      pageSize: size,
      items: Object.freeze(rows.results.map(view)),
    });
  }
  return Object.freeze({
    create,
    get,
    list,
    preferences,
    setPreferences,
    markRead: (id, ctx) => change(id, "read", ctx),
    archive: (id, ctx) => change(id, "read", ctx),
    recordSent: (id, ctx) => change(id, "sent", ctx),
    recordFailure: (id, code, ctx) =>
      change(id, "failed", ctx, String(code).slice(0, 64)),
    retry: (id, ctx) => change(id, "pending", ctx),
  });
}

return { NotificationsError, createNotifications };
})();
export const { NotificationsError, createNotifications } = NotificationsScope;

const ReportsScope = (() => {
const ADMIN_CAPABILITY = "management.reports.global";
const MAX_DAYS = 366;
const MAX_ROWS = 500;
const MAX_COLUMNS = 8;
const MAX_CSV_BYTES = 512000;
const FORMATS = new Set(["json", "csv"]);

class ReportsError extends Error {
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

function encodeReportCsv(headers, rows) {
  if (!Array.isArray(headers) || headers.length < 1 || headers.length > MAX_COLUMNS) throw new ReportsError("CSV_COLUMNS_EXCEEDED");
  const lines = [headers.map(safeCell).join(",")];
  for (const row of rows) lines.push(headers.map((header) => safeCell(row[header])).join(","));
  const csv = `\uFEFF${lines.join("\r\n")}`;
  if (new TextEncoder().encode(csv).byteLength > MAX_CSV_BYTES) throw new ReportsError("CSV_SIZE_EXCEEDED");
  return csv;
}

function createReports({ db, logger, clock = () => new Date() } = {}) {
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

return { ReportsError, encodeReportCsv, createReports };
})();
export const { ReportsError, encodeReportCsv, createReports } = ReportsScope;

const ReviewsScope = (() => {
const PUBLIC = "published";
const STATUSES = new Set(["pending", PUBLIC, "rejected"]);
class ReviewsError extends Error {
  constructor(code) {
    super("Review operation failed");
    this.name = "ReviewsError";
    this.code = code;
  }
}
const view = (row) =>
  row &&
  Object.freeze({
    id: row.id,
    authorId: row.author_id,
    subjectUserId: row.subject_user_id,
    listingId: row.listing_id,
    rating: row.rating,
    body: row.body,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
const publicView = (row) =>
  Object.freeze({
    id: row.id,
    rating: row.rating,
    comment: row.body,
    publicName: row.display_name ?? "Visitante",
    date: row.created_at,
  });

function createReviews({
  db,
  events,
  logger,
  id,
  clock = () => new Date(),
  resolveSubject,
} = {}) {
  if (
    !db?.first ||
    !db?.write ||
    !db?.all ||
    !events?.publish ||
    !logger?.info ||
    !id ||
    !resolveSubject
  )
    throw new TypeError("Invalid Reviews dependencies");
  const emit = (name, reviewId, context, payload = {}) =>
    events.publish({
      name,
      version: "1.0",
      source: "Reviews",
      id: `evt_${id()}`,
      occurredAt: clock().toISOString(),
      payload: { reviewId, ...payload },
      metadata: context.correlationId
        ? { correlationId: context.correlationId }
        : {},
    });
  async function get(reviewId) {
    return view(
      await db.first("SELECT * FROM reviews WHERE id = ?", [reviewId]),
    );
  }
  async function submit(input, context = {}) {
    if (
      !context.userId ||
      !input ||
      Object.keys(input).some(
        (key) =>
          !["subjectUserId", "listingId", "rating", "comment"].includes(key),
      )
    )
      throw new ReviewsError("INVALID_INPUT");
    const comment =
      typeof input.comment === "string"
        ? input.comment.trim().replace(/\s+/g, " ")
        : "";
    if (
      !input.subjectUserId ||
      input.subjectUserId === context.userId ||
      !Number.isInteger(input.rating) ||
      input.rating < 1 ||
      input.rating > 5 ||
      comment.length < 3 ||
      comment.length > 3000
    )
      throw new ReviewsError(
        input.subjectUserId === context.userId
          ? "SELF_REVIEW"
          : "INVALID_INPUT",
      );
    const subject = await resolveSubject(
      input.subjectUserId,
      input.listingId ?? null,
    );
    if (
      !subject?.valid ||
      (input.listingId && subject.ownerId !== input.subjectUserId)
    )
      throw new ReviewsError("INVALID_SUBJECT");
    const prior = await db.first(
      "SELECT * FROM reviews WHERE author_id = ? AND subject_user_id = ? AND listing_id IS ?",
      [context.userId, input.subjectUserId, input.listingId ?? null],
    );
    if (prior) return view(prior);
    const reviewId = `rev_${id()}`,
      now = clock().toISOString();
    await db.write(
      "INSERT INTO reviews (id, author_id, subject_user_id, listing_id, rating, body, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        reviewId,
        context.userId,
        input.subjectUserId,
        input.listingId ?? null,
        input.rating,
        comment,
        "pending",
        now,
        now,
      ],
    );
    logger.info("Review submitted", {
      operation: "reviews.submit",
      entityId: reviewId,
      status: "completed",
      correlationId: context.correlationId,
    });
    await emit("ReviewSubmitted", reviewId, context, {
      subjectUserId: input.subjectUserId,
    });
    return get(reviewId);
  }
  async function moderate(reviewId, status, context = {}) {
    if (
      context.canModerate !== true ||
      !STATUSES.has(status) ||
      status === "pending"
    )
      throw new ReviewsError("FORBIDDEN");
    const current = await db.first(
      "SELECT r.*, l.city, l.region FROM reviews r LEFT JOIN listings l ON l.id = r.listing_id WHERE r.id = ?",
      [reviewId],
    );
    if (!current) throw new ReviewsError("NOT_FOUND");
    if (current.status === status) return view(current);
    await db.write(
      "UPDATE reviews SET status = ?, updated_at = ? WHERE id = ?",
      [status, clock().toISOString(), reviewId],
    );
    const name = status === PUBLIC ? "ReviewApproved" : "ReviewRejected";
    await emit(name, reviewId, context, {
      subjectUserId: current.subject_user_id,
    });
    if ((status === PUBLIC || current.status === PUBLIC) && current.city)
      await emit("CityPublicationRequested", reviewId, context, {
        city: current.city,
        region: current.region,
        reason: "review.public-status-changed",
      });
    return get(reviewId);
  }
  async function hide(reviewId, context = {}) {
    return moderate(reviewId, "rejected", context);
  }
  async function listModeration(filters = {}, context = {}) {
    if (context.canModerate !== true) throw new ReviewsError("FORBIDDEN");
    const page = filters.page ?? 1,
      size = filters.pageSize ?? 20;
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      !Number.isSafeInteger(size) ||
      size < 1 ||
      size > 100 ||
      (filters.status && !STATUSES.has(filters.status))
    )
      throw new ReviewsError("INVALID_FILTER");
    const params = [];
    let where = "";
    if (filters.status) {
      where = " WHERE status = ?";
      params.push(filters.status);
    }
    params.push(size, (page - 1) * size);
    const rows = await db.all(
      `SELECT * FROM reviews${where} ORDER BY created_at DESC, id LIMIT ? OFFSET ?`,
      params,
    );
    return Object.freeze({
      page,
      pageSize: size,
      items: Object.freeze(rows.results.map(view)),
    });
  }
  async function listPublic(subjectUserId, options = {}) {
    const size =
      Number.isSafeInteger(options.pageSize) &&
      options.pageSize > 0 &&
      options.pageSize <= 100
        ? options.pageSize
        : 20;
    const rows = await db.all(
      "SELECT r.id, r.rating, r.body, r.created_at, p.display_name FROM reviews r LEFT JOIN profiles p ON p.user_id = r.author_id WHERE r.subject_user_id = ? AND r.status = ? ORDER BY r.created_at DESC, r.id LIMIT ?",
      [subjectUserId, PUBLIC, size],
    );
    return Object.freeze(rows.results.map(publicView));
  }
  async function aggregate(subjectUserId) {
    const row = await db.first(
      "SELECT COUNT(*) AS review_count, AVG(rating) AS average_rating FROM reviews WHERE subject_user_id = ? AND status = ?",
      [subjectUserId, PUBLIC],
    );
    return Object.freeze({
      count: Number(row?.review_count ?? 0),
      average:
        row?.average_rating == null
          ? null
          : Number(Number(row.average_rating).toFixed(2)),
    });
  }
  return Object.freeze({
    submit,
    get,
    approve: (id, ctx) => moderate(id, PUBLIC, ctx),
    reject: (id, ctx) => moderate(id, "rejected", ctx),
    hide,
    listModeration,
    listPublic,
    aggregate,
  });
}

return { ReviewsError, createReviews };
})();
export const { ReviewsError, createReviews } = ReviewsScope;

const SearchScope = (() => {
const TYPES = new Set(['sale', 'rent']); const SORTS = new Set(['published-desc', 'price-asc', 'price-desc', 'title-asc']);
const clean = (value) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
class SearchError extends Error { constructor(code, message = 'Search operation failed') { super(message); this.name = 'SearchError'; this.code = code; } }

function normalizeSearchCriteria(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new SearchError('INVALID_CRITERIA');
  const allowed = new Set(['text', 'categoryId', 'listingType', 'countryCode', 'region', 'city', 'currency', 'minPriceMinor', 'maxPriceMinor', 'attributes', 'page', 'pageSize', 'sort']);
  if (Object.keys(input).some((key) => !allowed.has(key))) throw new SearchError('UNSUPPORTED_FILTER');
  const criteria = { text: clean(input.text).toLocaleLowerCase('pt-BR'), categoryId: clean(input.categoryId) || null, listingType: input.listingType ?? null,
    countryCode: clean(input.countryCode).toUpperCase() || null, region: clean(input.region) || null, city: clean(input.city) || null, currency: clean(input.currency).toUpperCase() || null,
    minPriceMinor: input.minPriceMinor ?? null, maxPriceMinor: input.maxPriceMinor ?? null, attributes: input.attributes ?? {}, page: input.page ?? 1, pageSize: input.pageSize ?? 20, sort: input.sort ?? 'published-desc' };
  if ((criteria.listingType && !TYPES.has(criteria.listingType)) || (criteria.countryCode && !/^[A-Z]{2}$/.test(criteria.countryCode)) || (criteria.currency && !/^[A-Z]{3}$/.test(criteria.currency))
    || !Number.isSafeInteger(criteria.page) || criteria.page < 1 || !Number.isSafeInteger(criteria.pageSize) || criteria.pageSize < 1 || criteria.pageSize > 100 || !SORTS.has(criteria.sort)
    || [criteria.minPriceMinor, criteria.maxPriceMinor].some((value) => value !== null && (!Number.isSafeInteger(value) || value < 0)) || (criteria.minPriceMinor !== null && criteria.maxPriceMinor !== null && criteria.minPriceMinor > criteria.maxPriceMinor)
    || !criteria.attributes || typeof criteria.attributes !== 'object' || Array.isArray(criteria.attributes)) throw new SearchError('INVALID_CRITERIA');
  return Object.freeze({ ...criteria, attributes: Object.freeze({ ...criteria.attributes }) });
}
function eligible(item) { return item && item.status === 'published' && item.publishedAt && typeof item.priceMinor === 'number'; }
function matches(item, criteria) {
  const location = item.location ?? {}; const haystack = `${item.title ?? ''} ${item.description ?? ''}`.toLocaleLowerCase('pt-BR');
  return (!criteria.text || haystack.includes(criteria.text)) && (!criteria.categoryId || item.categoryId === criteria.categoryId) && (!criteria.listingType || item.listingType === criteria.listingType)
    && (!criteria.countryCode || location.countryCode === criteria.countryCode) && (!criteria.region || location.region === criteria.region) && (!criteria.city || location.city === criteria.city)
    && (!criteria.currency || item.currency === criteria.currency) && (criteria.minPriceMinor === null || item.priceMinor >= criteria.minPriceMinor) && (criteria.maxPriceMinor === null || item.priceMinor <= criteria.maxPriceMinor)
    && Object.entries(criteria.attributes).every(([key, value]) => item.attributes?.[key] === value);
}
function compare(sort) { return (left, right) => { if (sort === 'price-asc' || sort === 'price-desc') { const delta = left.priceMinor - right.priceMinor; if (delta) return sort === 'price-asc' ? delta : -delta; }
  if (sort === 'title-asc') { const delta = left.title.localeCompare(right.title, 'pt-BR'); if (delta) return delta; } else { const delta = String(right.publishedAt).localeCompare(String(left.publishedAt)); if (delta) return delta; } return left.id.localeCompare(right.id); }; }
function safe(item) { const { id, categoryId, slug, title, description, listingType, priceMinor, currency, attributes, publishedAt, media } = item; const source = item.location ?? {};
  const location = Object.freeze({ countryCode: source.countryCode, region: source.region, city: source.city, district: source.district ?? null });
  return Object.freeze({ id, categoryId, slug, title, description, listingType, priceMinor, currency, location, attributes, publishedAt, media: Object.freeze(media ?? []) }); }

function createSearch({ listPublished, events = null, id = null, clock = () => new Date() } = {}) {
  if (typeof listPublished !== 'function') throw new TypeError('Invalid Search dependencies');
  async function search(input = {}, context = {}) {
    const criteria = normalizeSearchCriteria(input); const supplied = await listPublished(criteria); if (!Array.isArray(supplied)) throw new SearchError('INVALID_SOURCE');
    const all = supplied.filter(eligible).filter((item) => matches(item, criteria)).sort(compare(criteria.sort)); const start = (criteria.page - 1) * criteria.pageSize;
    const result = Object.freeze({ criteria, page: criteria.page, pageSize: criteria.pageSize, total: all.length, items: Object.freeze(all.slice(start, start + criteria.pageSize).map(safe)) });
    if (events?.publish && typeof id === 'function') await events.publish({ name: 'SearchPerformed', version: '1.0', source: 'Search', id: `evt_${id()}`, occurredAt: clock().toISOString(), payload: { resultCount: result.items.length }, metadata: context.correlationId ? { correlationId: context.correlationId } : {} });
    return result;
  }
  return Object.freeze({ search, normalizeCriteria: normalizeSearchCriteria, sorts: Object.freeze([...SORTS]) });
}

return { SearchError, normalizeSearchCriteria, createSearch };
})();
export const { SearchError, normalizeSearchCriteria, createSearch } = SearchScope;

const UploadScope = (() => {
const FORMATS = Object.freeze({ 'image/jpeg': { extension: 'jpg', type: 'image', signatures: [[0xff, 0xd8, 0xff]] }, 'image/png': { extension: 'png', type: 'image', signatures: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]] }, 'image/webp': { extension: 'webp', type: 'image', signatures: [[0x52, 0x49, 0x46, 0x46]] }, 'application/pdf': { extension: 'pdf', type: 'document', signatures: [[0x25, 0x50, 0x44, 0x46]] }, 'video/mp4': { extension: 'mp4', type: 'video', signatures: [[0x00, 0x00, 0x00]] } });
class UploadError extends Error { constructor(code, message = 'Upload failed') { super(message); this.name = 'UploadError'; this.code = code; } }
const safeName = (name) => typeof name === 'string' && name.length <= 240 && !/[\\/\u0000-\u001f]/.test(name) && name !== '.' && name !== '..';
const bytesOf = async (file) => file instanceof Uint8Array ? file : file instanceof ArrayBuffer ? new Uint8Array(file) : file?.arrayBuffer ? new Uint8Array(await file.arrayBuffer()) : null;
const matches = (bytes, format, mime) => format.signatures.some((signature) => signature.every((value, index) => bytes[index] === value)) && (mime !== 'image/webp' || String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') && (mime !== 'video/mp4' || String.fromCharCode(...bytes.slice(4, 8)) === 'ftyp');
async function digest(bytes, cryptoApi) { const value = await cryptoApi.subtle.digest('SHA-256', bytes); return [...new Uint8Array(value)].map((byte) => byte.toString(16).padStart(2, '0')).join(''); }
function createUpload(options) {
  if (!options?.storage?.put || !options.storage.delete || !options?.events?.publish || typeof options.registerMedia !== 'function' || !options.crypto?.subtle || typeof options.crypto.randomUUID !== 'function') throw new TypeError('Invalid Upload dependencies');
  const { storage, events, logger, registerMedia, crypto: cryptoApi, clock = () => new Date(), id = () => cryptoApi.randomUUID(), maxBytes = 20 * 1024 * 1024 } = options; const completed = new Map();
  const emit = (name, uploadId, context = {}, payload = {}) => events.publish({ name, version: '1.0', source: 'Upload', id: `evt_${id()}`, occurredAt: clock().toISOString(), payload: { uploadId, ...payload }, metadata: context.correlationId ? { correlationId: context.correlationId } : {} });
  async function upload(input, context = {}) {
    if (!context.userId) throw new UploadError('UNAUTHENTICATED'); if (!safeName(input?.name)) throw new UploadError('INVALID_NAME'); const format = FORMATS[input.mimeType]; if (!format) throw new UploadError('UNSUPPORTED_TYPE');
    const bytes = await bytesOf(input.file); if (!bytes || !bytes.length || bytes.length > maxBytes) throw new UploadError(bytes?.length ? 'FILE_TOO_LARGE' : 'INVALID_FILE'); if (!matches(bytes, format, input.mimeType)) throw new UploadError('CONTENT_MISMATCH');
    const checksumSha256 = await digest(bytes, cryptoApi); const requestKey = input.idempotencyKey ? `${context.userId}:${input.idempotencyKey}` : null; if (requestKey && completed.has(requestKey)) return completed.get(requestKey);
    const uploadId = `upl_${id()}`; const key = `uploads/${format.type}/${cryptoApi.randomUUID()}.${format.extension}`; await emit('UploadStarted', uploadId, context, { mediaType: format.type });
    try {
      await storage.put(key, bytes, { contentType: input.mimeType, metadata: { ownerId: context.userId, checksumSha256 } });
      let media; try { media = await registerMedia({ ownerId: context.userId, listingId: input.listingId ?? null, r2Key: key, mediaType: format.type, mimeType: input.mimeType, byteSize: bytes.length, checksumSha256, width: input.width, height: input.height, altText: input.altText, sortOrder: input.sortOrder }, context); } catch (error) { await storage.delete(key); throw error; }
      const result = Object.freeze({ uploadId, media, checksumSha256, byteSize: bytes.length, mimeType: input.mimeType }); if (requestKey) completed.set(requestKey, result); logger.info('Upload completed', { operation: 'upload.store', status: 'completed', uploadId, byteSize: bytes.length, mimeType: input.mimeType }); await emit('UploadCompleted', uploadId, context, { mediaId: media.id, byteSize: bytes.length, mimeType: input.mimeType }); return result;
    } catch (error) { logger.error('Upload failed', { operation: 'upload.store', status: 'failed', uploadId }); await emit('UploadFailed', uploadId, context, { reason: 'technical_failure' }); if (error instanceof UploadError) throw error; throw new UploadError('TECHNICAL_FAILURE'); }
  }
  return Object.freeze({ upload, allowedTypes: Object.freeze(Object.keys(FORMATS)), maxBytes });
}

return { UploadError, createUpload };
})();
export const { UploadError, createUpload } = UploadScope;

const AnalyticsScope = (() => {
const CAPABILITY = "management.analytics.global";
const GRANULARITIES = Object.freeze({ day: "%Y-%m-%d", week: "%Y-%W", month: "%Y-%m" });
const MAX_DAYS = 366;
const MAX_POINTS = 100;
const MAX_GROUPS = 20;

class AnalyticsError extends Error {
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

function createAnalytics({ db, logger, clock = () => new Date() } = {}) {
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

return { AnalyticsError, createAnalytics };
})();
export const { AnalyticsError, createAnalytics } = AnalyticsScope;
