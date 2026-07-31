import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { test } from 'node:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const schemaPath = 'database/schema.sql';
const migrationPath = 'database/migrations/0001_initial_schema.sql';
const schema = readFileSync(schemaPath, 'utf8');
const migration = readFileSync(migrationPath, 'utf8');
const expectedTables = [
  'categories', 'comparisons', 'contacts', 'favorites', 'idempotency_records',
  'integrations', 'leads', 'listings', 'media', 'notifications', 'payments',
  'plans', 'profiles', 'publication_jobs', 'real_estate_professionals', 'reviews',
  'sessions', 'settings', 'subscriptions', 'users'
];

function sqlite(database, sql) {
  return execFileSync('sqlite3', ['-batch', '-bail', database], {
    encoding: 'utf8',
    input: sql
  });
}

function withDatabase(source, callback) {
  const database = join(tmpdir(), `acts-schema-${process.pid}-${Date.now()}-${Math.random()}.sqlite`);
  try {
    sqlite(database, source);
    callback(database);
  } finally {
    rmSync(database, { force: true });
  }
}

function lines(database, query) {
  return sqlite(database, `.mode list\n${query}`).trim().split('\n').filter(Boolean);
}

test('canonical schema and initial migration are present, complete and byte-equivalent', () => {
  assert.equal(schema, migration);
  assert.match(schema, /^PRAGMA foreign_keys = ON;/);
  assert.ok(schema.endsWith('\n'));
  assert.equal((schema.match(/CREATE TABLE /g) ?? []).length, expectedTables.length);
});

test('initial migration applies to an empty SQLite database with every required table and index', () => {
  withDatabase(migration, database => {
    const tables = lines(database, "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;");
    assert.deepEqual(tables, expectedTables);
    const indexes = lines(database, "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name;");
    assert.ok(indexes.length >= 18);
    assert.ok(indexes.includes('idx_listings_location_status'));
    assert.ok(indexes.includes('idx_subscriptions_one_active_user'));
    assert.ok(indexes.includes('idx_idempotency_expires'));
  });
});

test('all tables have primary keys and documented relationships are foreign keys', () => {
  withDatabase(schema, database => {
    for (const table of expectedTables) {
      const info = lines(database, `SELECT name FROM pragma_table_info('${table}') WHERE pk > 0;`);
      assert.ok(info.length > 0, `${table} must have a primary key`);
    }
    const listingForeignKeys = lines(database, "SELECT \"table\" || ':' || \"from\" || ':' || on_delete FROM pragma_foreign_key_list('listings') ORDER BY \"table\";");
    assert.deepEqual(listingForeignKeys, ['categories:category_id:RESTRICT', 'users:owner_id:RESTRICT']);
    assert.ok(lines(database, "SELECT id FROM pragma_foreign_key_list('media');").length === 2);
    assert.ok(lines(database, "SELECT id FROM pragma_foreign_key_list('payments');").length === 2);
  });
});

test('foreign keys, uniqueness, controlled states and referential integrity are enforced', () => {
  withDatabase(schema, database => {
    const invalidForeignKey = spawnSync('sqlite3', ['-batch', '-bail', database], {
      encoding: 'utf8', input: "PRAGMA foreign_keys=ON; INSERT INTO sessions(id,user_id,expires_at) VALUES('12345678901234567890123456789012','missing','2027-01-01T00:00:00Z');"
    });
    assert.notEqual(invalidForeignKey.status, 0);
    assert.match(invalidForeignKey.stderr, /FOREIGN KEY constraint failed/);

    sqlite(database, "INSERT INTO users(id,email,password_hash,status) VALUES('1234567890123456','one@example.test','12345678901234567890123456789012','active');");
    const duplicate = spawnSync('sqlite3', ['-batch', '-bail', database], {
      encoding: 'utf8', input: "INSERT INTO users(id,email,password_hash) VALUES('abcdefghijklmnop','ONE@example.test','12345678901234567890123456789012');"
    });
    assert.notEqual(duplicate.status, 0);
    assert.match(duplicate.stderr, /UNIQUE constraint failed/);

    const invalidState = spawnSync('sqlite3', ['-batch', '-bail', database], {
      encoding: 'utf8', input: "INSERT INTO users(id,email,password_hash,status) VALUES('abcdefghijklmnop','two@example.test','12345678901234567890123456789012','unknown');"
    });
    assert.notEqual(invalidState.status, 0);
    assert.match(invalidState.stderr, /CHECK constraint failed/);
  });
});

test('money is represented as non-negative integer minor units with an ISO-style currency', () => {
  assert.doesNotMatch(schema, /\b(?:DECIMAL|NUMERIC|MONEY)\b/i);
  for (const column of ['price_minor', 'amount_minor']) {
    assert.match(schema, new RegExp(`${column} INTEGER NOT NULL CHECK \\(${column} >= 0\\)`));
  }
  assert.match(schema, /currency TEXT NOT NULL DEFAULT 'BRL' CHECK \(length\(currency\) = 3 AND currency = upper\(currency\)\)/);
});

test('R2 files are references with controlled metadata, never file payloads', () => {
  assert.match(schema, /r2_key TEXT NOT NULL UNIQUE/);
  assert.match(schema, /checksum_sha256 TEXT NOT NULL/);
  assert.match(schema, /byte_size INTEGER NOT NULL/);
  assert.doesNotMatch(schema, /\b(?:BLOB|VARBINARY|BYTEA)\b/i);
});

test('SQL contains no seed, commercial data, credentials, destructive statements or incompatible types', () => {
  assert.doesNotMatch(schema, /\bINSERT\s+INTO\b/i);
  assert.doesNotMatch(schema, /\b(?:DROP|TRUNCATE|ALTER)\b/i);
  assert.doesNotMatch(schema, /\b(?:SERIAL|BIGSERIAL|UUID|JSONB|TIMESTAMPTZ|ENUM)\b/i);
  assert.doesNotMatch(schema, /(?:api[_-]?key|access[_-]?token|private[_-]?key|client[_-]?secret)\s*=\s*['"][^'"]+/i);
  assert.doesNotMatch(schema, /(?:BEGIN|COMMIT|ROLLBACK)\s*;/i);
});

test('the immutable initial migration is intentionally not silently re-applicable', () => {
  withDatabase(migration, database => {
    const reapplied = spawnSync('sqlite3', ['-batch', '-bail', database], { encoding: 'utf8', input: migration });
    assert.notEqual(reapplied.status, 0);
    assert.match(reapplied.stderr, /already exists/);
  });
});
