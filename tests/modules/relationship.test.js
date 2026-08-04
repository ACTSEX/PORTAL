import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createContacts } from "../../app/modules/Contacts.js";
import { createLeads } from "../../app/modules/Leads.js";
import { createReviews } from "../../app/modules/Reviews.js";
import { createNotifications } from "../../app/modules/Notifications.js";

const now = "2026-08-04T12:00:00.000Z";
const clock = () => new Date(now);
const hash = async (value) => createHash("sha256").update(value).digest("hex");
const ids = () => {
  let n = 0;
  return () => String(++n).padStart(32, "0");
};
const loggerEntries = [];
const logger = {
  info(message, context) {
    loggerEntries.push({ message, context });
  },
};
const bus = () => ({
  published: [],
  async publish(event) {
    this.published.push(event);
  },
});
function database(rows = []) {
  const calls = [];
  return {
    calls,
    async first(sql, parameters) {
      calls.push({ sql, parameters });
      return rows.shift() ?? null;
    },
    async write(sql, parameters) {
      calls.push({ sql, parameters });
      return { meta: { changes: 1 } };
    },
    async all(sql, parameters) {
      calls.push({ sql, parameters });
      return { results: rows.shift() ?? [] };
    },
    async batch(commands) {
      calls.push(...commands);
      return commands.map(() => ({ meta: { changes: 1 } }));
    },
  };
}
const contact = (changes = {}) => ({
  id: "cnt_1",
  listing_id: "lst_1",
  recipient_user_id: "usr_owner",
  sender_name: "Visitante",
  sender_email: "v@example.com",
  sender_phone: "11999999999",
  message: "Quero mais informações",
  consent_at: now,
  status: "new",
  created_at: now,
  ...changes,
});
const lead = (changes = {}) => ({
  id: "led_1",
  contact_id: "cnt_1",
  assigned_user_id: "usr_owner",
  status: "new",
  notes: "privado",
  created_at: now,
  updated_at: now,
  ...changes,
});
const review = (changes = {}) => ({
  id: "rev_1",
  author_id: "usr_author",
  subject_user_id: "usr_owner",
  listing_id: "lst_1",
  rating: 5,
  body: "Ótimo atendimento",
  status: "pending",
  created_at: now,
  updated_at: now,
  ...changes,
});
const notification = (changes = {}) => ({
  id: "ntf_1",
  user_id: "usr_1",
  kind: "lead",
  title: "Novo lead",
  body: "Veja no painel",
  status: "pending",
  read_at: null,
  sent_at: null,
  created_at: now,
  ...changes,
});

test("Contacts validates shape, consent, size, recipient and persists atomically with safe event", async () => {
  const db = database([null, contact()]);
  const events = bus();
  const service = createContacts({
    db,
    events,
    logger,
    id: ids(),
    clock,
    hash,
    resolveRecipient: async () => ({
      userId: "usr_owner",
      listingExists: true,
    }),
  });
  const result = await service.create({
    listingId: "lst_1",
    senderName: " Visitante ",
    senderEmail: "V@EXAMPLE.COM",
    senderPhone: "11999999999",
    message: " Quero mais informações ",
    consent: true,
    idempotencyKey: "contact-key-1",
  });
  assert.equal(result.recipientUserId, "usr_owner");
  assert.equal(
    db.calls.some((call) => call.sql.startsWith("INSERT INTO contacts")),
    true,
  );
  assert.deepEqual(Object.keys(events.published[0].payload).sort(), [
    "contactId",
    "listingId",
    "recipientUserId",
  ]);
  await assert.rejects(
    service.create({ senderName: "A", extra: "SQL", consent: false }),
    (error) => error.code === "INVALID_INPUT",
  );
  await assert.rejects(
    createContacts({
      db: database(),
      events: bus(),
      logger,
      id: ids(),
      clock,
      hash,
      resolveRecipient: async () => null,
    }).create({
      senderName: "Visitante",
      senderEmail: "v@example.com",
      message: "mensagem válida",
      consent: true,
      idempotencyKey: "contact-key-2",
    }),
    (error) => error.code === "INVALID_RECIPIENT",
  );
});

test("Contacts enforces ownership, idempotency, private pagination and status changes", async () => {
  const duplicate = createContacts({
    db: database([
      {
        resource_id: "cnt_1",
        request_hash: await hash(
          JSON.stringify([
            "usr_owner",
            null,
            "v@example.com",
            "mensagem válida",
          ]),
        ),
      },
      contact({ listing_id: null }),
    ]),
    events: bus(),
    logger,
    id: ids(),
    clock,
    hash,
    resolveRecipient: async () => ({ userId: "usr_owner" }),
  });
  assert.equal(
    (
      await duplicate.create({
        senderName: "Visitante",
        senderEmail: "v@example.com",
        message: "mensagem válida",
        consent: true,
        idempotencyKey: "contact-key-1",
      })
    ).id,
    "cnt_1",
  );
  const db = database([[contact()], contact(), contact({ status: "read" })]);
  const service = createContacts({
    db,
    events: bus(),
    logger,
    id: ids(),
    clock,
    hash,
    resolveRecipient: async () => ({ userId: "usr_owner" }),
  });
  assert.equal(
    (
      await service.list(
        { status: "new", pageSize: 10 },
        { userId: "usr_owner" },
      )
    ).items.length,
    1,
  );
  await service.setStatus("cnt_1", "read", { userId: "usr_owner" });
  assert.ok(db.calls.every((call) => Array.isArray(call.parameters)));
  await assert.rejects(
    createContacts({
      db: database([contact()]),
      events: bus(),
      logger,
      id: ids(),
      clock,
      hash,
      resolveRecipient: async () => null,
    }).get("cnt_1", { userId: "other" }),
    (error) => error.code === "FORBIDDEN",
  );
});

test("Leads converts only owned contacts, deduplicates and enforces explicit transitions", async () => {
  const db = database([
    { id: "cnt_1", recipient_user_id: "usr_owner" },
    null,
    lead(),
    lead(),
    lead({ status: "contacted" }),
  ]);
  const events = bus();
  const service = createLeads({ db, events, logger, id: ids(), clock });
  assert.equal(
    (
      await service.create(
        { contactId: "cnt_1", notes: "privado" },
        { userId: "usr_owner" },
      )
    ).status,
    "new",
  );
  assert.equal(
    (await service.transition("led_1", "contacted", { userId: "usr_owner" }))
      .status,
    "contacted",
  );
  await assert.rejects(
    createLeads({
      db: database([lead({ status: "new" })]),
      events: bus(),
      logger,
      id: ids(),
      clock,
    }).transition("led_1", "won", { userId: "usr_owner" }),
    (error) => error.code === "INVALID_TRANSITION",
  );
  await assert.rejects(
    createLeads({
      db: database([{ id: "cnt_1", recipient_user_id: "other" }]),
      events: bus(),
      logger,
      id: ids(),
      clock,
    }).create({ contactId: "cnt_1" }, { userId: "usr_owner" }),
    (error) => error.code === "CONTACT_OWNER_MISMATCH",
  );
  assert.doesNotMatch(JSON.stringify(events.published), /privado/);
});

test("Leads protects notes and applies allowlisted private filters", async () => {
  const db = database([lead(), lead({ notes: "nova" }), [lead()]]);
  const service = createLeads({ db, events: bus(), logger, id: ids(), clock });
  await service.updateNotes("led_1", "nova", { userId: "usr_owner" });
  const result = await service.list(
    { status: "new", from: now, pageSize: 10 },
    { userId: "usr_owner" },
  );
  assert.equal(result.items.length, 1);
  assert.ok(db.calls.every((call) => Array.isArray(call.parameters)));
});

test("Reviews validates author, rating, body, subject, self-review and duplicate submission", async () => {
  const db = database([null, review()]);
  const events = bus();
  const service = createReviews({
    db,
    events,
    logger,
    id: ids(),
    clock,
    resolveSubject: async () => ({ valid: true, ownerId: "usr_owner" }),
  });
  assert.equal(
    (
      await service.submit(
        {
          subjectUserId: "usr_owner",
          listingId: "lst_1",
          rating: 5,
          comment: " Ótimo atendimento ",
        },
        { userId: "usr_author" },
      )
    ).status,
    "pending",
  );
  assert.equal(events.published.length, 1);
  await assert.rejects(
    service.submit(
      { subjectUserId: "usr_author", rating: 6, comment: "" },
      { userId: "usr_author" },
    ),
    (error) => error.code === "SELF_REVIEW",
  );
  const duplicate = createReviews({
    db: database([review()]),
    events: bus(),
    logger,
    id: ids(),
    clock,
    resolveSubject: async () => ({ valid: true }),
  });
  assert.equal(
    (
      await duplicate.submit(
        { subjectUserId: "usr_owner", rating: 4, comment: "Muito bom" },
        { userId: "usr_author" },
      )
    ).id,
    "rev_1",
  );
});

test("Reviews publishes city impact only on public moderation and exposes approved allowlist", async () => {
  const events = bus();
  const db = database([
    { ...review(), city: "Santos", region: "SP" },
    review({ status: "published" }),
    [{ ...review({ status: "published" }), display_name: "Ana" }],
    { review_count: 2, average_rating: 4.5 },
  ]);
  const service = createReviews({
    db,
    events,
    logger,
    id: ids(),
    clock,
    resolveSubject: async () => ({ valid: true }),
  });
  await service.approve("rev_1", { canModerate: true });
  assert.deepEqual(
    events.published.map((event) => event.name),
    ["ReviewApproved", "CityPublicationRequested"],
  );
  const publicRows = await service.listPublic("usr_owner");
  assert.deepEqual(Object.keys(publicRows[0]).sort(), [
    "comment",
    "date",
    "id",
    "publicName",
    "rating",
  ]);
  assert.deepEqual(await service.aggregate("usr_owner"), {
    count: 2,
    average: 4.5,
  });
  await assert.rejects(
    service.reject("rev_1", {}),
    (error) => error.code === "FORBIDDEN",
  );
});

test("Notifications respects preferences, ownership, idempotency and internal-only channel", async () => {
  const db = database([null, null, notification()]);
  const events = bus();
  const service = createNotifications({
    db,
    events,
    logger,
    id: ids(),
    clock,
    hash,
  });
  assert.equal(
    (
      await service.create(
        {
          userId: "usr_1",
          kind: "lead",
          title: "Novo lead",
          body: "Veja no painel",
          channel: "internal",
          idempotencyKey: "notify-key-1",
        },
        { canNotify: true },
      )
    ).channel,
    "internal",
  );
  assert.equal(events.published[0].name, "NotificationCreated");
  await assert.rejects(
    service.create(
      {
        userId: "usr_1",
        kind: "lead",
        title: "x",
        body: "x",
        channel: "email",
        idempotencyKey: "notify-key-2",
      },
      { canNotify: true },
    ),
    (error) => error.code === "INVALID_INPUT",
  );
  await assert.rejects(
    service.create(
      { userId: "usr_1", title: "Sem campos", body: "inválida" },
      { canNotify: true },
    ),
    (error) => error.code === "INVALID_INPUT",
  );
  const disabled = createNotifications({
    db: database([{ value_json: '{"internal":false}' }]),
    events: bus(),
    logger,
    id: ids(),
    clock,
    hash,
  });
  assert.equal(
    (
      await disabled.create(
        {
          userId: "usr_1",
          kind: "lead",
          title: "x",
          body: "x",
          idempotencyKey: "notify-key-3",
        },
        { canNotify: true },
      )
    ).created,
    false,
  );
});

test("Notifications persists preferences and supports read, failure, retry and private list", async () => {
  const db = database([
    notification(),
    notification({ status: "read", read_at: now }),
    notification({ status: "failed" }),
    notification({ status: "pending" }),
    [notification()],
  ]);
  const events = bus();
  const service = createNotifications({
    db,
    events,
    logger,
    id: ids(),
    clock,
    hash,
  });
  await service.setPreferences({ internal: true }, { userId: "usr_1" });
  await service.markRead("ntf_1", { userId: "usr_1" });
  await service.recordFailure("ntf_1", "temporary", { userId: "usr_1" });
  await service.retry("ntf_1", { userId: "usr_1" });
  assert.equal((await service.list({}, { userId: "usr_1" })).items.length, 1);
  assert.doesNotMatch(JSON.stringify(events.published), /Veja no painel/);
});

test("Relationship boundaries use only D1 and events, without PII logs or future integrations", async () => {
  const files = ["Contacts.js", "Leads.js", "Reviews.js", "Notifications.js"];
  const sources = await Promise.all(
    files.map((file) =>
      readFile(new URL(`../../app/modules/${file}`, import.meta.url), "utf8"),
    ),
  );
  const joined = sources.join("\n");
  assert.doesNotMatch(
    joined,
    /process\.env|\bKV\b|\bR2\b|Publisher|fetch\s*\(|Asaas|SMS|WhatsApp/,
  );
  assert.match(joined, /idempotency_records/);
  assert.doesNotMatch(
    JSON.stringify(loggerEntries),
    /v@example\.com|11999999999|Quero mais|privado|Veja no painel/,
  );
  for (const source of sources) assert.match(source, /events\.publish/);
});
