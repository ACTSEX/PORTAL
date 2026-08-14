import assert from 'node:assert/strict';
import test from 'node:test';
import { painelJs } from '../../frontend/painel/app.js';
import { painelDocument } from '../../frontend/painel/template.js';

test('painel offers an accessible login and private profile forms', () => {
  const html = painelDocument();
  assert.match(html, /id="login-form"/);
  assert.match(html, /for="email"/);
  assert.match(html, /type="password"/);
  assert.match(html, /id="private" hidden/);
  assert.match(html, /id="media-form"/); assert.match(html, /accept="image\/jpeg,image\/png,image\/webp"/);
  for (const field of ['displayName', 'bio', 'phone', 'website', 'instagram', 'whatsapp']) assert.match(html, new RegExp(`name="${field}"`));
});

test('browser flow uses only private APIs and never browser persistence', () => {
  assert.match(painelJs, /json\('\/api\/auth\/login'/);
  assert.match(painelJs, /json\('\/api\/me'/);
  assert.match(painelJs, /json\('\/api\/me\/profile'/);
  assert.match(painelJs, /json\('\/api\/auth\/logout'/);
  assert.match(painelJs, /credentials:'same-origin'/);
  assert.doesNotMatch(painelJs, /localStorage|sessionStorage|indexedDB/i);
});

test('profile update is allowlisted, waits for HTTP success, reloads and blocks duplicate saves', () => {
  assert.match(painelJs, /fields=\['displayName','bio','phone','website','instagram','whatsapp'\]/);
  assert.match(painelJs, /save\.disabled=true/);
  assert.match(painelJs, /if\(!response\.ok\)return message\(profileMessage/);
  assert.match(painelJs, /await loadMe\(\);message\(profileMessage,'Perfil salvo/);
  for (const forbidden of ['userId', 'profileId', 'premium', 'role']) assert.doesNotMatch(painelJs, new RegExp(forbidden));
});

test('401 clears private state and logout returns to login', () => {
  assert.match(painelJs, /if\(response\.status===401\)return loggedOut/);
  assert.match(painelJs, /privateView\.hidden=true;loginView\.hidden=false/);
  assert.match(painelJs, /profileForm\.reset\(\)/);
  assert.match(painelJs, /if\(!response\.ok\)return message\(profileMessage[\s\S]*loggedOut\(\)/);
});


test('photo flow uploads multipart through the private API, refreshes thumbnails and supports delete', () => {
  assert.match(painelJs, /new FormData/); assert.match(painelJs, /json\('\/api\/me\/media'/); assert.match(painelJs, /method:'POST',body:data/); assert.match(painelJs, /method:'DELETE'/); assert.match(painelJs, /mediaSend.disabled=true/); assert.match(painelJs, /Sua sessão expirou/); assert.doesNotMatch(painelJs, /base64|ACTS_MEDIA/);
});
