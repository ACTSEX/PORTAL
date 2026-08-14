const PUBLIC_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isPublicSlug(value) {
  return typeof value === 'string' && value.length <= 80 && PUBLIC_SLUG.test(value);
}

export function publicObjectKey(kind, slug) {
  if (!['cities', 'profiles'].includes(kind) || !isPublicSlug(slug)) {
    throw new TypeError('Invalid public projection path');
  }
  return `${kind}/${slug}.json`;
}

export const cityProjectionKey = (slug) => publicObjectKey('cities', slug);
export const profileProjectionKey = (slug) => publicObjectKey('profiles', slug);

/** Read an already-published public projection. Public reads never use D1. */
export async function readPublicProjection(bucket, kind, slug) {
  if (!bucket || typeof bucket.get !== 'function') throw new TypeError('ACTS_DATA is unavailable');
  const object = await bucket.get(publicObjectKey(kind, slug));
  if (!object) return null;
  return {
    body: object.body,
    etag: object.httpEtag ?? (object.etag ? `"${object.etag}"` : null),
    contentType: object.httpMetadata?.contentType ?? 'application/json; charset=utf-8',
  };
}
