const STATES = Object.freeze(["new", "contacted", "qualified", "won", "lost"]);
const NEXT = {
  new: ["contacted", "lost"],
  contacted: ["qualified", "lost"],
  qualified: ["won", "lost"],
  won: [],
  lost: [],
};
export class LeadsError extends Error {
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
export function createLeads({
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
