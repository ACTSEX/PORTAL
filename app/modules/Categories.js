const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CategoriesError extends Error {
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

export function createCategories(options) {
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
