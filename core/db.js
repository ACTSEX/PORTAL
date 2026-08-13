import { isPlainObject } from './app.js';

function validate(binding, logger) {
  if (!binding || typeof binding.prepare !== 'function' || typeof binding.batch !== 'function') throw new TypeError('Invalid D1 binding');
  if (!logger || typeof logger.error !== 'function' || typeof logger.debug !== 'function') throw new TypeError('Database requires a valid logger');
}

function statement(binding, sql, parameters) {
  if (typeof sql !== 'string' || sql.trim() === '' || sql.includes('${')) throw new TypeError('Invalid SQL statement');
  if (!Array.isArray(parameters)) throw new TypeError('SQL parameters must be an array');
  const prepared = binding.prepare(sql);
  if (!prepared || typeof prepared.bind !== 'function') throw new TypeError('Invalid D1 statement');
  return prepared.bind(...parameters);
}

function metadata(meta = {}) {
  return Object.freeze({ duration: Number(meta.duration ?? 0), rowsRead: Number(meta.rows_read ?? 0), rowsWritten: Number(meta.rows_written ?? 0), changes: Number(meta.changes ?? 0), lastRowId: meta.last_row_id ?? null });
}

function normalize(result) {
  return Object.freeze({ success: result?.success !== false, results: Object.freeze(Array.isArray(result?.results) ? result.results : []), meta: metadata(result?.meta), error: result?.success === false ? 'Database operation failed' : null });
}

/** Create generic D1 primitives from an explicitly supplied binding. */
export function createDatabase({ binding, logger }) {
  validate(binding, logger);
  async function perform(operation, action) {
    const started = Date.now();
    try {
      const result = await action();
      logger.debug('Database operation completed', { operation, status: 'completed', duration: Date.now() - started });
      return result;
    } catch (error) {
      logger.error('Database operation failed', { operation, status: 'failed', duration: Date.now() - started, error });
      throw new Error('Database operation failed', { cause: error });
    }
  }
  const prepare = (sql, parameters = []) => statement(binding, sql, parameters);
  const execute = (sql, parameters = []) => perform('db.execute', async () => normalize(await prepare(sql, parameters).run()));
  const first = (sql, parameters = []) => perform('db.first', async () => (await prepare(sql, parameters).first()) ?? null);
  const all = (sql, parameters = []) => perform('db.all', async () => normalize(await prepare(sql, parameters).all()));
  const write = execute;
  const batch = (commands) => perform('db.batch', async () => {
    if (!Array.isArray(commands) || commands.length === 0 || commands.some((item) => !isPlainObject(item))) throw new TypeError('Invalid database batch');
    const output = await binding.batch(commands.map(({ sql, parameters = [] }) => prepare(sql, parameters)));
    return Object.freeze(output.map(normalize));
  });
  return Object.freeze({ prepare, execute, first, all, write, batch });
}
