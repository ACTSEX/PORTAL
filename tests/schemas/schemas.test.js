import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const paths = ['listing', 'user', 'profile', 'plan', 'settings', 'theme']
  .map(name => `app/schemas/${name}.schema.json`);
const schemas = new Map(paths.map(path => [path, JSON.parse(readFileSync(path, 'utf8'))]));
const sql = readFileSync('database/schema.sql', 'utf8');
const draft = 'https://json-schema.org/draft/2020-12/schema';

const examples = {
  listing: {
    id: 'listing-00000001', ownerId: 'user-00000000001', categoryId: 'category-1', slug: 'apartamento-central',
    title: 'Apartamento central', description: 'Apartamento amplo localizado no centro.', listingType: 'sale',
    status: 'draft', priceMinor: 45000000, currency: 'BRL',
    location: { countryCode: 'BR', region: 'SP', city: 'Sao Paulo', latitude: -23.55, longitude: -46.63 }, attributes: { bedrooms: 2 }
  },
  user: {
    id: 'user-00000000001', email: 'person@example.test', role: 'user', status: 'active', permissions: ['listing.read'],
    createdAt: '2026-07-31T12:00:00Z', updatedAt: '2026-07-31T12:00:00Z'
  },
  profile: {
    userId: 'user-00000000001', displayName: 'Pessoa Exemplo', phone: '+55 11 99999-9999',
    avatarR2Key: 'profiles/user/avatar.webp', websiteUrl: 'https://example.test', socialLinks: { website: 'https://example.test' }
  },
  plan: {
    id: 'plan-1', code: 'professional', name: 'Profissional', priceMinor: 9900, currency: 'BRL',
    billingInterval: 'month', limits: { listings: 20, media: 200 }, features: ['priority_search'], active: true
  },
  settings: {
    siteName: 'ACTS Portal', locale: 'pt-BR', timezone: 'America/Sao_Paulo', features: { publicSearch: true },
    updatedAt: '2026-07-31T12:00:00Z'
  },
  theme: {
    name: 'ACTS Light', mode: 'light',
    colors: { primary: '#123456', secondary: '#654321', background: '#FFFFFF', surface: '#F0F0F0', text: '#111111' },
    layout: { contentWidth: 'standard', density: 'comfortable', borderRadius: 8 },
    components: { buttonStyle: 'solid', cardStyle: 'bordered' }
  }
};

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validFormat(format, value) {
  if (format === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  if (format === 'date-time') return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && !Number.isNaN(Date.parse(value));
  if (format === 'uri') { try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol); } catch { return false; } }
  return true;
}

function validate(root, rule, value) {
  if (rule.$ref) rule = root.$defs[rule.$ref.split('/').at(-1)];
  if (rule.type === 'object') {
    if (!isObject(value)) return false;
    const properties = rule.properties ?? {};
    if ((rule.required ?? []).some(key => !(key in value))) return false;
    if (rule.maxProperties !== undefined && Object.keys(value).length > rule.maxProperties) return false;
    if (rule.propertyNames && Object.keys(value).some(key => !validate(root, rule.propertyNames, key))) return false;
    for (const [key, item] of Object.entries(value)) {
      if (properties[key]) { if (!validate(root, properties[key], item)) return false; }
      else if (rule.additionalProperties === false) return false;
      else if (isObject(rule.additionalProperties) && !validate(root, rule.additionalProperties, item)) return false;
    }
  } else if (rule.type === 'array') {
    if (!Array.isArray(value)) return false;
    if (rule.maxItems !== undefined && value.length > rule.maxItems) return false;
    if (rule.uniqueItems && new Set(value.map(JSON.stringify)).size !== value.length) return false;
    if (rule.items && value.some(item => !validate(root, rule.items, item))) return false;
  } else if (rule.type === 'string') {
    if (typeof value !== 'string') return false;
    if (rule.minLength !== undefined && value.length < rule.minLength) return false;
    if (rule.maxLength !== undefined && value.length > rule.maxLength) return false;
    if (rule.pattern && !new RegExp(rule.pattern, 'u').test(value)) return false;
    if (rule.format && !validFormat(rule.format, value)) return false;
  } else if (rule.type === 'integer') {
    if (!Number.isInteger(value)) return false;
  } else if (rule.type === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  } else if (rule.type === 'boolean' && typeof value !== 'boolean') return false;
  if (rule.enum && !rule.enum.includes(value)) return false;
  if (typeof value === 'number' && rule.minimum !== undefined && value < rule.minimum) return false;
  if (typeof value === 'number' && rule.maximum !== undefined && value > rule.maximum) return false;
  return true;
}

function schemaFor(name) {
  return schemas.get(`app/schemas/${name}.schema.json`);
}

test('six JSON documents use the approved version and stable unique identifiers', () => {
  assert.equal(schemas.size, 6);
  const identifiers = [];
  for (const [path, schema] of schemas) {
    assert.equal(schema.$schema, draft, path);
    assert.match(schema.$id, /^https:\/\/portal\.acts\.example\/schemas\/v1\/.+\.schema\.json$/);
    assert.equal(schema.type, 'object');
    assert.equal(schema.additionalProperties, false);
    assert.ok(schema.title && schema.description);
    assert.ok(Object.keys(schema.properties).length > 0);
    assert.ok(schema.required.length > 0);
    identifiers.push(schema.$id);
  }
  assert.equal(new Set(identifiers).size, identifiers.length);
});

test('documented examples are valid and remain test-only', () => {
  for (const [name, example] of Object.entries(examples)) assert.equal(validate(schemaFor(name), schemaFor(name), example), true, name);
  for (const source of schemas.values()) assert.equal('examples' in source, false);
});

test('required fields, unknown fields and incorrect top-level types are rejected', () => {
  for (const [name, example] of Object.entries(examples)) {
    const schema = schemaFor(name);
    const missing = structuredClone(example);
    delete missing[schema.required[0]];
    assert.equal(validate(schema, schema, missing), false, `${name} required`);
    assert.equal(validate(schema, schema, { ...example, unknownField: true }), false, `${name} unknown`);
    assert.equal(validate(schema, schema, []), false, `${name} type`);
  }
});

test('formats, enums, patterns and numeric limits reject invalid examples', () => {
  assert.equal(validate(schemaFor('user'), schemaFor('user'), { ...examples.user, email: 'invalid', role: 'root' }), false);
  assert.equal(validate(schemaFor('listing'), schemaFor('listing'), { ...examples.listing, priceMinor: -1 }), false);
  assert.equal(validate(schemaFor('listing'), schemaFor('listing'), { ...examples.listing, location: { ...examples.listing.location, latitude: 91 } }), false);
  assert.equal(validate(schemaFor('plan'), schemaFor('plan'), { ...examples.plan, billingInterval: 'week' }), false);
  assert.equal(validate(schemaFor('profile'), schemaFor('profile'), { ...examples.profile, avatarR2Key: '../private' }), false);
  assert.equal(validate(schemaFor('theme'), schemaFor('theme'), { ...examples.theme, colors: { ...examples.theme.colors, primary: 'red' } }), false);
});

test('public settings cannot carry secrets and themes cannot carry executable content', () => {
  const settings = schemaFor('settings');
  for (const key of ['password', 'token', 'secret', 'credential', 'apiKey']) {
    assert.equal(validate(settings, settings, { ...examples.settings, [key]: 'unsafe' }), false);
  }
  const theme = schemaFor('theme');
  assert.equal(validate(theme, theme, { ...examples.theme, html: '<script>alert(1)</script>' }), false);
  assert.equal(validate(theme, theme, { ...examples.theme, javascript: 'alert(1)' }), false);
  assert.deepEqual(Object.keys(theme.properties).sort(), ['colors', 'components', 'layout', 'mode', 'name']);
});

test('schema contracts align with database names, states, money and R2 references', () => {
  for (const table of ['users', 'profiles', 'plans', 'listings', 'settings']) assert.match(sql, new RegExp(`CREATE TABLE ${table} \\(`));
  assert.deepEqual(schemaFor('listing').properties.status.enum, ['draft', 'pending', 'published', 'archived', 'deleted']);
  assert.deepEqual(schemaFor('listing').properties.listingType.enum, ['sale', 'rent']);
  assert.deepEqual(schemaFor('plan').properties.billingInterval.enum, ['month', 'year']);
  assert.match(sql, /price_minor INTEGER/);
  assert.equal(schemaFor('listing').properties.priceMinor.type, 'integer');
  assert.match(sql, /avatar_r2_key TEXT/);
  assert.ok(schemaFor('profile').properties.avatarR2Key);
});

test('schemas contain no secret-bearing fields or real credentials', () => {
  for (const [path, schema] of schemas) {
    const text = JSON.stringify(schema);
    assert.doesNotMatch(text, /"(?:password|token|secret|credential|apiKey)"\s*:/i, path);
    assert.doesNotMatch(text, /-----BEGIN [A-Z ]+PRIVATE KEY-----|sk-[A-Za-z0-9]{20,}/, path);
  }
});
