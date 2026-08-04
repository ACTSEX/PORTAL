const PUBLIC = "published";
const STATUSES = new Set(["pending", PUBLIC, "rejected"]);
export class ReviewsError extends Error {
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

export function createReviews({
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
