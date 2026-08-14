import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { test } from 'node:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const schemaPath = 'database/schema.sql';
const migrationPath = 'database/migrations/0001_initial_schema.sql';
const paymentMigrationPath = 'database/migrations/0002_payment_event_ordering.sql';
const cityMigrationPath = 'database/migrations/0003_city_publication_state.sql';
const bloggerMigrationPath = 'database/migrations/0004_blogger_integrations.sql';
const boostMigrationPath = 'database/migrations/0005_paid_boosts.sql';
const schema = readFileSync(schemaPath, 'utf8');
const migration = readFileSync(migrationPath, 'utf8');
const paymentMigration = readFileSync(paymentMigrationPath, 'utf8');
const cityMigration = readFileSync(cityMigrationPath, 'utf8');
const bloggerMigration = readFileSync(bloggerMigrationPath, 'utf8');
const boostMigration = readFileSync(boostMigrationPath, 'utf8');
const expectedTables = [
  'blogger_integrations', 'boosts', 'commercial_conditions', 'categories', 'cities', 'city_publication_state', 'comparisons', 'contacts', 'favorites', 'idempotency_records',
  'integrations', 'leads', 'listings', 'media', 'notifications', 'payments',
  'plans', 'profiles', 'publication_jobs', 'real_estate_professionals', 'reviews',
  'sessions', 'settings', 'subscriptions', 'users'
];
const initialTables = expectedTables.filter(table => !['cities', 'city_publication_state', 'blogger_integrations', 'boosts', 'commercial_conditions'].includes(table));

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

test('canonical schema and versioned migrations are present and complete', () => {
  assert.notEqual(schema, migration);
  assert.match(schema, /^PRAGMA foreign_keys = ON;/);
  assert.ok(schema.endsWith('\n'));
  assert.equal((schema.match(/CREATE TABLE /g) ?? []).length, expectedTables.length);
});

const evolvedSchema = `${migration}\n${paymentMigration}\n${cityMigration}\n${bloggerMigration}\n${boostMigration}`;
const cityInsert = `INSERT INTO cities (
  id,country_code,region_key,city_key,canonical_key,public_name,slug,canonicalization_version
) VALUES ('city-opaque-00000001','BR','parana','londrina','BR|parana|londrina','Londrina','br-parana-londrina','unicode-17.0.0-v1');`;

function fails(database, sql, pattern = /constraint failed/i) {
  const result = spawnSync('sqlite3', ['-batch', '-bail', database], {
    encoding: 'utf8', input: `PRAGMA foreign_keys=ON;\n${sql}`
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, pattern);
}

function inventory(database) {
  const objects = lines(database, "SELECT type||'|'||name||'|'||tbl_name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name;");
  const tables = lines(database, "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;");
  return { objects, tables: Object.fromEntries(tables.map(table => [table, {
    columns: lines(database, `SELECT name||'|'||type||'|'||\"notnull\"||'|'||coalesce(dflt_value,'')||'|'||pk FROM pragma_table_info('${table}') ORDER BY name;`),
    foreignKeys: lines(database, `SELECT \"table\"||'|'||\"from\"||'|'||\"to\"||'|'||on_update||'|'||on_delete FROM pragma_foreign_key_list('${table}') ORDER BY \"table\",\"from\";`),
    indexes: lines(database, `SELECT name||'|'||\"unique\"||'|'||partial FROM pragma_index_list('${table}') WHERE origin <> 'pk' ORDER BY name;`)
  }])) };
}

test('snapshot applies cleanly to real SQLite', () => withDatabase(schema, database => {
  assert.deepEqual(lines(database, "PRAGMA foreign_key_check;"), []);
  assert.equal(lines(database, "SELECT count(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")[0], String(expectedTables.length));
}));

test('0001 through 0005 evolve on real SQLite', () => withDatabase(evolvedSchema, database => {
  assert.deepEqual(lines(database, "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('blogger_integrations','boosts','commercial_conditions','cities','city_publication_state') ORDER BY name;"), ['blogger_integrations', 'boosts', 'cities', 'city_publication_state', 'commercial_conditions']);
}));

test('immutable migrations 0001 and 0002 retain their approved hashes', () => {
  const hashes = execFileSync('sha256sum', [migrationPath, paymentMigrationPath], { encoding: 'utf8' });
  assert.match(hashes, /^304af4fe5595e71b5276aa06f4fa42439895c4e87d9b2d5051fa412b796b9360 /);
  assert.match(hashes, /19f17c60d799046c4e726ad10c67fb4ca1c92440d4cf7cd7d9b7daba592c3821 /);
});

test('cities has the complete transitional column contract', () => withDatabase(schema, database => {
  assert.deepEqual(lines(database, "SELECT name FROM pragma_table_info('cities') ORDER BY cid;"), ['id','country_code','region_key','city_key','canonical_key','public_name','slug','canonicalization_version','active','created_at','updated_at']);
}));

test('cities canonical_key is unique', () => withDatabase(schema, database => {
  sqlite(database, cityInsert);
  fails(database, cityInsert.replace('city-opaque-00000001', 'city-opaque-00000002').replace("'parana'", "'sao paulo'").replace("'londrina'", "'campinas'").replace("'br-parana-londrina'", "'br-sao-paulo-campinas'"), /UNIQUE constraint failed: cities.canonical_key/);
}));

test('cities slug is unique', () => withDatabase(schema, database => {
  sqlite(database, cityInsert);
  fails(database, cityInsert.replace('city-opaque-00000001','city-opaque-00000002').replace('BR|parana|londrina','BR|parana|cambé').replace("'londrina'","'cambe'"), /UNIQUE constraint failed: cities.slug/);
}));

test('canonicalization_version is required and fixed to the initial contract', () => withDatabase(schema, database => {
  fails(database, cityInsert.replace("'unicode-17.0.0-v1'", 'NULL'), /NOT NULL constraint failed/);
  fails(database, cityInsert.replace('unicode-17.0.0-v1', 'unicode-16.0.0-v1'));
}));

test('cities id has no generated name-derived default', () => withDatabase(schema, database => {
  assert.deepEqual(lines(database, "SELECT coalesce(dflt_value,'') FROM pragma_table_info('cities') WHERE name='id';"), []);
  fails(database, cityInsert.replace("'city-opaque-00000001',", 'NULL,'), /NOT NULL constraint failed/);
}));

test('listings city_id exists and is nullable during 13A', () => withDatabase(schema, database => {
  assert.deepEqual(lines(database, "SELECT name||'|'||\"notnull\" FROM pragma_table_info('listings') WHERE name='city_id';"), ['city_id|0']);
}));

test('listings accepts NULL city_id under the existing write contract', () => withDatabase(schema, database => {
  sqlite(database, "INSERT INTO users(id,email,password_hash) VALUES('user-000000000001','owner@example.test','12345678901234567890123456789012'); INSERT INTO categories(id,slug,name) VALUES('category-0000001','apartments','Apartments'); INSERT INTO listings(id,owner_id,category_id,slug,title,description,listing_type,price_minor,region,city) VALUES('listing-00000001','user-000000000001','category-0000001','listing-one','Valid listing title','A sufficiently long listing description','sale',1,'Parana','Londrina');");
  assert.deepEqual(lines(database, "SELECT city_id IS NULL FROM listings;"), ['1']);
}));

test('valid listings city_id references cities', () => withDatabase(schema, database => {
  sqlite(database, `${cityInsert} INSERT INTO users(id,email,password_hash) VALUES('user-000000000001','owner@example.test','12345678901234567890123456789012'); INSERT INTO categories(id,slug,name) VALUES('category-0000001','apartments','Apartments'); INSERT INTO listings(id,owner_id,category_id,slug,title,description,listing_type,price_minor,region,city,city_id) VALUES('listing-00000001','user-000000000001','category-0000001','listing-one','Valid listing title','A sufficiently long listing description','sale',1,'Parana','Londrina','city-opaque-00000001');`);
  assert.deepEqual(lines(database, 'PRAGMA foreign_key_check;'), []);
}));

test('invalid listings city_id is rejected', () => withDatabase(schema, database => {
  sqlite(database, "INSERT INTO users(id,email,password_hash) VALUES('user-000000000001','owner@example.test','12345678901234567890123456789012'); INSERT INTO categories(id,slug,name) VALUES('category-0000001','apartments','Apartments');");
  fails(database, "INSERT INTO listings(id,owner_id,category_id,slug,title,description,listing_type,price_minor,region,city,city_id) VALUES('listing-00000001','user-000000000001','category-0000001','listing-one','Valid listing title','A sufficiently long listing description','sale',1,'Parana','Londrina','missing-city-0001');", /FOREIGN KEY constraint failed/);
}));

test('listings city deletion uses RESTRICT', () => withDatabase(schema, database => {
  const fks = lines(database, "SELECT \"table\"||'|'||\"from\"||'|'||on_delete FROM pragma_foreign_key_list('listings') WHERE \"from\"='city_id';");
  assert.deepEqual(fks, ['cities|city_id|RESTRICT']);
}));

test('listings city and status index exists with the authorized order', () => withDatabase(schema, database => {
  assert.deepEqual(lines(database, "SELECT name FROM pragma_index_info('idx_listings_city_status') ORDER BY seqno;"), ['city_id','status']);
}));

test('city publication state permits only one row per city', () => withDatabase(schema, database => {
  sqlite(database, `${cityInsert} INSERT INTO city_publication_state(city_id) VALUES('city-opaque-00000001');`);
  fails(database, "INSERT INTO city_publication_state(city_id) VALUES('city-opaque-00000001');", /UNIQUE constraint failed/);
}));

test('city publication state rejects invalid versions and attempts', () => withDatabase(schema, database => {
  sqlite(database, cityInsert);
  fails(database, "INSERT INTO city_publication_state(city_id,current_version,next_version) VALUES('city-opaque-00000001',2,2);");
  fails(database, "INSERT INTO city_publication_state(city_id,attempts) VALUES('city-opaque-00000001',-1);");
}));

test('city publication state rejects unknown states', () => withDatabase(schema, database => {
  sqlite(database, cityInsert);
  fails(database, "INSERT INTO city_publication_state(city_id,status) VALUES('city-opaque-00000001','unknown');");
}));

test('city publication lease starts empty', () => withDatabase(schema, database => {
  sqlite(database, `${cityInsert} INSERT INTO city_publication_state(city_id) VALUES('city-opaque-00000001');`);
  assert.deepEqual(lines(database, 'SELECT lease_token IS NULL, lease_expires_at IS NULL FROM city_publication_state;'), ['1|1']);
}));

test('migration creates no city, publication state, manifest or job automatically', () => withDatabase(evolvedSchema, database => {
  assert.deepEqual(lines(database, "SELECT (SELECT count(*) FROM cities)||(SELECT count(*) FROM city_publication_state)||(SELECT count(*) FROM publication_jobs);"), ['000']);
}));

test('filled pre-0003 database preserves records, old listing values and NULL city_id', () => withDatabase(`${migration}\n${paymentMigration}`, database => {
  sqlite(database, "INSERT INTO users(id,email,password_hash) VALUES('user-000000000001','owner@example.test','12345678901234567890123456789012'); INSERT INTO profiles(user_id,display_name) VALUES('user-000000000001','Owner'); INSERT INTO plans(id,code,name,price_minor,billing_interval,listing_limit,media_limit) VALUES('plan-00000000001','basic','Basic',100,'month',1,1); INSERT INTO subscriptions(id,user_id,plan_id,status,starts_at,current_period_ends_at) VALUES('subscription-001','user-000000000001','plan-00000000001','active','2026-01-01','2027-01-01'); INSERT INTO integrations(id,provider) VALUES('integration-001','asaas'); INSERT INTO payments(id,subscription_id,amount_minor,status,provider,external_reference) VALUES('payment-00000001','subscription-001',100,'pending','asaas','external-1'); INSERT INTO categories(id,slug,name) VALUES('category-0000001','apartments','Apartments'); INSERT INTO listings(id,owner_id,category_id,slug,title,description,listing_type,price_minor,region,city) VALUES('listing-00000001','user-000000000001','category-0000001','listing-one','Valid listing title','A sufficiently long listing description','sale',1,'Parana','Londrina'); INSERT INTO media(id,owner_id,listing_id,r2_key,media_type,mime_type,byte_size,checksum_sha256) VALUES('media-000000001','user-000000000001','listing-00000001','media/one','image','image/png',1,'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'); INSERT INTO contacts(id,listing_id,recipient_user_id,sender_name,sender_email,message,consent_at) VALUES('contact-0000001','listing-00000001','user-000000000001','Sender','sender@example.test','A useful contact message','2026-01-01'); INSERT INTO leads(id,contact_id) VALUES('lead-0000000001','contact-0000001'); INSERT INTO notifications(id,user_id,kind,title,body) VALUES('notification-001','user-000000000001','update','Title','Body'); INSERT INTO publication_jobs(id,resource_type,resource_id,target,artifact_key) VALUES('job-000000000001','listing','listing-00000001','r2','artifact.json');");
  const before = lines(database, "SELECT (SELECT count(*) FROM users)||'|'||(SELECT count(*) FROM profiles)||'|'||(SELECT count(*) FROM plans)||'|'||(SELECT count(*) FROM subscriptions)||'|'||(SELECT count(*) FROM payments)||'|'||(SELECT count(*) FROM categories)||'|'||(SELECT count(*) FROM listings)||'|'||(SELECT count(*) FROM media)||'|'||(SELECT count(*) FROM contacts)||'|'||(SELECT count(*) FROM leads)||'|'||(SELECT count(*) FROM notifications)||'|'||(SELECT count(*) FROM publication_jobs);");
  sqlite(database, cityMigration);
  assert.deepEqual(lines(database, "SELECT (SELECT count(*) FROM users)||'|'||(SELECT count(*) FROM profiles)||'|'||(SELECT count(*) FROM plans)||'|'||(SELECT count(*) FROM subscriptions)||'|'||(SELECT count(*) FROM payments)||'|'||(SELECT count(*) FROM categories)||'|'||(SELECT count(*) FROM listings)||'|'||(SELECT count(*) FROM media)||'|'||(SELECT count(*) FROM contacts)||'|'||(SELECT count(*) FROM leads)||'|'||(SELECT count(*) FROM notifications)||'|'||(SELECT count(*) FROM publication_jobs);"), before);
  assert.deepEqual(lines(database, "SELECT region||'|'||city||'|'||(city_id IS NULL) FROM listings;"), ['Parana|Londrina|1']);
  assert.deepEqual(lines(database, 'PRAGMA foreign_key_check;'), []);
  assert.deepEqual(lines(database, 'SELECT count(*) FROM cities;'), ['0']);
}));

test('preexisting listing columns defaults checks uniques foreign keys indexes and triggers survive evolution', () => withDatabase(`${migration}\n${paymentMigration}`, database => {
  const beforeColumns = lines(database, "SELECT name||'|'||type||'|'||\"notnull\"||'|'||coalesce(dflt_value,'')||'|'||pk FROM pragma_table_info('listings') ORDER BY cid;");
  const beforeFks = lines(database, "SELECT \"table\"||'|'||\"from\"||'|'||on_delete FROM pragma_foreign_key_list('listings') ORDER BY \"from\";");
  const beforeIndexes = lines(database, "SELECT name||'|'||\"unique\"||'|'||partial FROM pragma_index_list('listings') WHERE origin <> 'pk' ORDER BY name;");
  const beforeTriggers = lines(database, "SELECT coalesce(group_concat(name,'|'),'') FROM sqlite_master WHERE type='trigger' AND tbl_name='listings' ORDER BY name;");
  sqlite(database, cityMigration);
  assert.deepEqual(lines(database, "SELECT name||'|'||type||'|'||\"notnull\"||'|'||coalesce(dflt_value,'')||'|'||pk FROM pragma_table_info('listings') WHERE name <> 'city_id' ORDER BY cid;"), beforeColumns);
  assert.deepEqual(lines(database, "SELECT \"table\"||'|'||\"from\"||'|'||on_delete FROM pragma_foreign_key_list('listings') WHERE \"from\" <> 'city_id' ORDER BY \"from\";"), beforeFks);
  assert.deepEqual(lines(database, "SELECT name||'|'||\"unique\"||'|'||partial FROM pragma_index_list('listings') WHERE origin <> 'pk' AND name <> 'idx_listings_city_status' ORDER BY name;"), beforeIndexes);
  assert.deepEqual(lines(database, "SELECT coalesce(group_concat(name,'|'),'') FROM sqlite_master WHERE type='trigger' AND tbl_name='listings' ORDER BY name;"), beforeTriggers);
  fails(database, "INSERT INTO listings(id,owner_id,category_id,slug,title,description,listing_type,status,price_minor,region,city) VALUES('listing-00000001','x','y','s','bad','short','invalid','unknown',-1,'x','x');");
}));

test('snapshot and evolved database are structurally equivalent by SQLite pragmas', () => {
  let snapshotInventory;
  withDatabase(schema, database => { snapshotInventory = inventory(database); });
  withDatabase(evolvedSchema, database => { assert.deepEqual(inventory(database), snapshotInventory); });
});

test('13B operational files exist while future files from lots 13C through 14 remain absent', () => {
  for (const path of ['scripts/backfill-cities.js','tests/operations/city-backfill.test.js']) assert.equal(spawnSync('test', ['-f', path]).status, 0, path);
  for (const path of ['database/migrations/0004_city_publication_contract.sql']) {
    assert.notEqual(spawnSync('test', ['-e', path]).status, 0, path);
  }
});

test('Wrangler uses the official migration directory and applies it idempotently', { skip: Number(process.versions.node.split('.')[0]) < 22 }, () => {
  const config = readFileSync('wrangler.toml', 'utf8');
  assert.equal((config.match(/^migrations_dir = "database\/migrations"$/gm) ?? []).length, 4);
  assert.deepEqual(execFileSync('find', ['database/migrations', '-maxdepth', '1', '-type', 'f', '-printf', '%f\n'], { encoding: 'utf8' }).trim().split('\n').sort(), [
    '0001_initial_schema.sql', '0002_payment_event_ordering.sql', '0003_city_publication_state.sql', '0004_blogger_integrations.sql', '0005_paid_boosts.sql'
  ]);
  const persistence = mkdtempSync(join(tmpdir(), 'acts-wrangler-migrations-'));
  try {
    const command = ['run', 'db:migrate:local', '--', '--persist-to', persistence];
    const first = execFileSync('npm', command, { encoding: 'utf8' });
    assert.match(first, /0001_initial_schema\.sql/); assert.match(first, /0002_payment_event_ordering\.sql/); assert.match(first, /0003_city_publication_state\.sql/); assert.match(first, /0004_blogger_integrations\.sql/); assert.match(first, /0005_paid_boosts\.sql/);
    const retry = execFileSync('npm', command, { encoding: 'utf8' }); assert.match(retry, /No migrations to apply/);
    const status = execFileSync('wrangler', ['d1', 'migrations', 'list', 'ACTS_DB', '--local', '--env', 'development', '--persist-to', persistence], { encoding: 'utf8' });
    assert.match(status, /No migrations to apply/); assert.doesNotMatch(status, /ignored/i);
  } finally { rmSync(persistence, { recursive: true, force: true }); }
});

test('payment ordering migration evolves an existing database to the canonical snapshot', () => {
  withDatabase(`${migration}\n${paymentMigration}`, database => {
    assert.deepEqual(lines(database, "SELECT name FROM pragma_table_info('payments') WHERE name = 'external_updated_at';"), ['external_updated_at']);
  });
  withDatabase(schema, database => {
    assert.deepEqual(lines(database, "SELECT name FROM pragma_table_info('payments') WHERE name = 'external_updated_at';"), ['external_updated_at']);
  });
});

test('initial migration applies to an empty SQLite database with every required table and index', () => {
  withDatabase(migration, database => {
    const tables = lines(database, "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;");
    assert.deepEqual(tables, initialTables);
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
    assert.deepEqual(listingForeignKeys, ['categories:category_id:RESTRICT', 'cities:city_id:RESTRICT', 'users:owner_id:RESTRICT']);
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
