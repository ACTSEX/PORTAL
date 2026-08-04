const STATUSES = new Set(["pending", "sent", "failed", "read"]);
const CHANNEL = "internal";
export class NotificationsError extends Error {
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
export function createNotifications({
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
