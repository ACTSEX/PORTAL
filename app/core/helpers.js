/** Return true only for records whose prototype is Object or null. */
export function isPlainObject(value) {
  if (value === null || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** Recursively freeze arrays and plain records without mutating host objects. */
export function deepFreeze(value, seen = new WeakSet()) {
  if ((!Array.isArray(value) && !isPlainObject(value)) || seen.has(value)) {
    return value;
  }

  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}
