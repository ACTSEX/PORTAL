export class IdentityError extends Error { constructor(code, message = 'Identity operation failed') { super(message); this.name = 'IdentityError'; this.code = code; } }
const PURPOSES = new Set(['session', 'verify', 'recovery']);
function validate(options) {
  if (!options?.db?.first || !options.db.write || !options?.events?.publish || !options?.users?.create
    || !options?.technicalAuth?.issue || !options.technicalAuth.validate || !options?.passwords?.hash
    || !options.passwords.verify || !options?.logger?.info || typeof options.id !== 'function') throw new TypeError('Invalid Auth domain dependencies');
}
const permissions = (role) => role === 'admin' ? ['admin'] : role === 'professional' ? ['professional'] : ['user'];
const parseSubject = (subject) => { const [purpose, recordId, userId, ...extra] = String(subject).split(':'); if (extra.length || !PURPOSES.has(purpose) || !recordId || !userId) throw new IdentityError('INVALID_TOKEN', 'Invalid or expired token'); return { purpose, recordId, userId }; };
export function createIdentityAuth(options) {
  validate(options);
  const { db, events, users, technicalAuth, passwords, logger, id, delivery,
    clock = () => new Date(), sessionLifetime = 3600, actionLifetime = 900 } = options;
  const now = () => clock().toISOString();
  const emit = (name, userId, correlationId, payload = {}) => events.publish({ name, version: '1.0', source: 'Auth', id: `evt_${id()}`,
    occurredAt: now(), payload: { userId, ...payload }, metadata: correlationId ? { correlationId } : {} });
  async function issueRecord(userId, purpose, lifetime, metadata = {}) {
    const recordId = `ses_${id()}`; const expiresAt = new Date(clock().getTime() + lifetime * 1000).toISOString();
    await db.write('INSERT INTO sessions (id, user_id, expires_at, last_seen_at, ip_hash, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [recordId, userId, expiresAt, now(), metadata.ipHash ?? null, metadata.userAgent ?? null, now()]);
    const token = await technicalAuth.issue({ id: `${purpose}:${recordId}:${userId}`, permissions: purpose === 'session' ? metadata.permissions : [] }, lifetime);
    return Object.freeze({ token, expiresAt });
  }
  async function consume(token, expectedPurpose, revoke = true) {
    let identity; try { identity = await technicalAuth.validate({ scheme: 'bearer', value: token }); } catch { throw new IdentityError('INVALID_TOKEN', 'Invalid or expired token'); }
    const subject = parseSubject(identity.id); if (subject.purpose !== expectedPurpose) throw new IdentityError('INVALID_TOKEN', 'Invalid or expired token');
    const record = await db.first('SELECT id, user_id, expires_at, revoked_at FROM sessions WHERE id = ? AND user_id = ?', [subject.recordId, subject.userId]);
    if (!record || record.revoked_at || Date.parse(record.expires_at) <= clock().getTime()) throw new IdentityError('INVALID_TOKEN', 'Invalid or expired token');
    if (revoke) await db.write('UPDATE sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL', [now(), record.id]);
    return Object.freeze({ ...subject, identity });
  }
  async function register(input, context = {}) {
    if (typeof input?.password !== 'string' || input.password.length < 10 || input.password.length > 256) throw new IdentityError('INVALID_REGISTRATION');
    const passwordHash = await passwords.hash(input.password); let user;
    try { user = await users.create({ email: input.email, passwordHash, role: input.role ?? 'user' }, context); }
    catch (error) { if (error.code === 'EMAIL_EXISTS') throw new IdentityError('REGISTRATION_REJECTED', 'Registration rejected'); throw error; }
    const verification = await issueRecord(user.id, 'verify', actionLifetime); await emit('IdentityRegistered', user.id, context.correlationId);
    if (delivery?.deliverVerification) await delivery.deliverVerification({ userId: user.id, token: verification.token, expiresAt: verification.expiresAt });
    return Object.freeze({ user, verificationRequired: true });
  }
  async function login(input, context = {}) {
    let user = null; try { user = await users.findForAuthentication(input?.email); } catch { /* normalized denial */ }
    const validPassword = user ? await passwords.verify(input?.password ?? '', user.password_hash) : false;
    if (!user || !validPassword) { logger.info('Domain login denied', { operation: 'identity.login', status: 'denied' }); throw new IdentityError('INVALID_CREDENTIALS', 'Invalid credentials'); }
    if (user.status !== 'active') throw new IdentityError('ACCOUNT_UNAVAILABLE', 'Account unavailable');
    const session = await issueRecord(user.id, 'session', sessionLifetime, { permissions: permissions(user.role), ipHash: context.ipHash, userAgent: context.userAgent });
    logger.info('Domain login succeeded', { operation: 'identity.login', status: 'completed', userId: user.id }); await emit('IdentityLoggedIn', user.id, context.correlationId);
    return Object.freeze({ user: users.toPrivate(user), credential: session.token, expiresAt: session.expiresAt });
  }
  async function validateSession(token) {
    const subject = await consume(token, 'session', false); const user = await users.getById(subject.userId);
    if (!user || user.status !== 'active') throw new IdentityError('ACCOUNT_UNAVAILABLE', 'Account unavailable');
    await db.write('UPDATE sessions SET last_seen_at = ? WHERE id = ?', [now(), subject.recordId]);
    return Object.freeze({ authenticated: true, user, permissions: subject.identity.permissions, sessionId: subject.recordId });
  }
  async function logout(token, context = {}) { const subject = await consume(token, 'session'); await emit('IdentityLoggedOut', subject.userId, context.correlationId); return true; }
  async function verifyAccount(token, context = {}) { const subject = await consume(token, 'verify'); const user = await users.markEmailVerified(subject.userId, context); await emit('IdentityVerified', subject.userId, context.correlationId); return user; }
  async function requestRecovery(email, context = {}) {
    let user = null; try { user = await users.findForAuthentication(email); } catch { /* prevent enumeration */ }
    if (user && user.status !== 'deleted') { const recovery = await issueRecord(user.id, 'recovery', actionLifetime); await emit('IdentityRecoveryRequested', user.id, context.correlationId); if (delivery?.deliverRecovery) await delivery.deliverRecovery({ userId: user.id, token: recovery.token, expiresAt: recovery.expiresAt }); }
    return Object.freeze({ accepted: true });
  }
  async function resetPassword(token, password, context = {}) { if (typeof password !== 'string' || password.length < 10 || password.length > 256) throw new IdentityError('INVALID_PASSWORD'); const subject = await consume(token, 'recovery'); await users.replacePasswordHash(subject.userId, await passwords.hash(password)); await revokeAll(subject.userId); await emit('IdentityPasswordReset', subject.userId, context.correlationId); return true; }
  async function changePassword(userId, currentPassword, password, context = {}) { const user = await users.findForAuthentication((await users.getById(userId))?.email); if (!user || !await passwords.verify(currentPassword, user.password_hash) || typeof password !== 'string' || password.length < 10) throw new IdentityError('INVALID_PASSWORD'); await users.replacePasswordHash(userId, await passwords.hash(password)); await revokeAll(userId); await emit('IdentityPasswordChanged', userId, context.correlationId); return true; }
  async function revokeAll(userId, context = {}) { await db.write('UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL', [now(), userId]); await emit('IdentitySessionsRevoked', userId, context.correlationId); return true; }
  return Object.freeze({ register, login, logout, validateSession, verifyAccount, requestRecovery, resetPassword, changePassword, revokeAll });
}
