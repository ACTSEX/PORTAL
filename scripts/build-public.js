import { mkdir, writeFile } from 'node:fs/promises';
import { portalDocument } from '../frontend/portal/template.js';
import { portalCss } from '../frontend/portal/styles.js';
import { portalJs } from '../frontend/portal/app.js';
import { painelDocument } from '../frontend/painel/template.js';
import { painelCss } from '../frontend/painel/styles.js';
import { painelJs } from '../frontend/painel/app.js';
import { adminDocument } from '../frontend/admin/template.js';
import { adminCss } from '../frontend/admin/styles.js';
import { adminJs } from '../frontend/admin/app.js';

const files = new Map([
  ['index.html', portalDocument()], ['assets/portal.css', portalCss], ['assets/portal.js', portalJs],
  ['painel/index.html', painelDocument()], ['assets/painel.css', painelCss], ['assets/painel.js', painelJs],
  ['admin/index.html', adminDocument()], ['assets/admin.css', adminCss], ['assets/admin.js', adminJs],
]);
for (const [name, content] of files) { await mkdir(new URL(`../public/${name.replace(/[^/]+$/, '')}`, import.meta.url), { recursive: true }); await writeFile(new URL(`../public/${name}`, import.meta.url), content); }
