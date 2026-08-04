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
export class ContactsError extends Error {
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

export function createContacts({
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
