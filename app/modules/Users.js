const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATES = new Set(['pending', 'active', 'suspended', 'deleted']);
const ROLES = new Set(['user', 'professional', 'admin']);

export class UsersError extends Error {
  constructor(code, message = 'User operation failed') {
    super(message); this.name = 'UsersError'; this.code = code;
  }
}

function dependencies(options) {
  if (!options?.db?.first || !options.db.write || !options?.events?.publish
    || !options?.logger?.info || typeof options.id !== 'function') throw new TypeError('Invalid Users dependencies');
}
function email(value) {
  const result = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (result.length > 254 || !EMAIL.test(result)) throw new UsersError('INVALID_EMAIL', 'Invalid email');
  return result;
}
function privateView(row) {
  if (!row) return null;
  const { password_hash: ignored, ...safe } = row; void ignored;
  return Object.freeze(safe);
}
function publicView(row) {
  if (!row) return null;
  return Object.freeze({ id: row.id, role: row.role, status: row.status,
    createdAt: row.created_at, updatedAt: row.updated_at });
}

export function createUsers(options) {
  dependencies(options);
  const { db, events, logger, id, clock = () => new Date() } = options;
  const emit = (name, userId, correlationId, payload = {}) => events.publish({ name, version: '1.0',
    source: 'Users', id: `evt_${id()}`, occurredAt: clock().toISOString(), payload: { userId, ...payload },
    metadata: correlationId ? { correlationId } : {} });

  async function getById(userId) {
    if (typeof userId !== 'string' || !userId) throw new UsersError('INVALID_USER');
    return privateView(await db.first('SELECT id, email, role, status, email_verified_at, created_at, updated_at FROM users WHERE id = ?', [userId]));
  }
  async function findForAuthentication(value) {
    const row = await db.first('SELECT id, email, password_hash, role, status, email_verified_at, created_at, updated_at FROM users WHERE email = ?', [email(value)]);
    return row ? Object.freeze({ ...row }) : null;
  }
  async function create(input, context = {}) {
    if (!input || typeof input.passwordHash !== 'string' || input.passwordHash.length < 32) throw new UsersError('INVALID_USER');
    const normalizedEmail = email(input.email); const role = input.role ?? 'user';
    if (!ROLES.has(role)) throw new UsersError('INVALID_ROLE');
    if (await db.first('SELECT id FROM users WHERE email = ?', [normalizedEmail])) throw new UsersError('EMAIL_EXISTS', 'Email already registered');
    const userId = `usr_${id()}`; const now = clock().toISOString();
    await db.write('INSERT INTO users (id, email, password_hash, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, normalizedEmail, input.passwordHash, role, 'pending', now, now]);
    logger.info('User created', { operation: 'users.create', status: 'completed', userId });
    await emit('UserCreated', userId, context.correlationId, { role });
    return getById(userId);
  }
  async function update(userId, input, context = {}) {
    if (!input || Object.keys(input).some((key) => !['email'].includes(key))) throw new UsersError('PROTECTED_FIELD', 'Protected user field');
    const normalizedEmail = email(input.email); const duplicate = await db.first('SELECT id FROM users WHERE email = ? AND id <> ?', [normalizedEmail, userId]);
    if (duplicate) throw new UsersError('EMAIL_EXISTS', 'Email already registered');
    await db.write('UPDATE users SET email = ?, updated_at = ? WHERE id = ? AND status <> ?', [normalizedEmail, clock().toISOString(), userId, 'deleted']);
    await emit('UserUpdated', userId, context.correlationId, { fields: ['email'] });
    return getById(userId);
  }
  async function setState(userId, state, context = {}) {
    if (!STATES.has(state) || state === 'pending') throw new UsersError('INVALID_STATE');
    const current = await getById(userId); if (!current) throw new UsersError('NOT_FOUND', 'User not found');
    if (current.status === 'deleted' && state !== 'deleted') throw new UsersError('INVALID_TRANSITION');
    await db.write('UPDATE users SET status = ?, updated_at = ? WHERE id = ?', [state, clock().toISOString(), userId]);
    await emit('UserStateChanged', userId, context.correlationId, { from: current.status, to: state });
    return getById(userId);
  }
  async function markEmailVerified(userId, context = {}) {
    const now = clock().toISOString();
    await db.write('UPDATE users SET email_verified_at = COALESCE(email_verified_at, ?), status = CASE WHEN status = ? THEN ? ELSE status END, updated_at = ? WHERE id = ?',
      [now, 'pending', 'active', now, userId]);
    await emit('UserEmailVerified', userId, context.correlationId);
    return getById(userId);
  }
  async function replacePasswordHash(userId, passwordHash) {
    if (typeof passwordHash !== 'string' || passwordHash.length < 32) throw new UsersError('INVALID_PASSWORD_HASH');
    await db.write('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ? AND status <> ?', [passwordHash, clock().toISOString(), userId, 'deleted']);
    return true;
  }
  return Object.freeze({ create, getById, findForAuthentication, update, activate: (userId, ctx) => setState(userId, 'active', ctx),
    suspend: (userId, ctx) => setState(userId, 'suspended', ctx), close: (userId, ctx) => setState(userId, 'deleted', ctx),
    markEmailVerified, replacePasswordHash, toPrivate: privateView, toPublic: publicView });
}
