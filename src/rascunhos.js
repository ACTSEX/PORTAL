import { auditar } from './auditoria.js';
import { loadClient } from './clientes.js';
import { httpError } from './auth/session.js';

const PROFILE_FIELDS = new Set(['revision','formVersion','step','nomeArtistico','apresentacao','cidadePrincipal','cidadesAtendimento','bairroPublico','categorias','caracteristicas','servicos','disponibilidade','contatoPublico']);
const SITE_FIELDS = new Set(['revision','formVersion','step','titulo','descricao','urlExterna','corDestaque']);
const FORBIDDEN = /cpf|nascimento|gmail|googleSub|nomeCivil|documento|enderecoCompleto/i;
export const directories = Object.freeze(['mulheres','homens','transex']);

export async function getDraft(storage, clienteId) {
  const [perfil, site] = await Promise.all([storage.get(profileKey(clienteId)), storage.get(siteKey(clienteId))]);
  return { perfil: perfil || empty(clienteId, 'perfil'), site: site || empty(clienteId, 'site') };
}
export async function saveDraft(storage, session, kind, input, { validate = false } = {}, now = new Date()) {
  const allowed = kind === 'perfil' ? PROFILE_FIELDS : SITE_FIELDS;
  exact(input, allowed); for (const key of Object.keys(input)) if (FORBIDDEN.test(key)) throw httpError(422, 'PRIVATE_FIELD_FORBIDDEN');
  const client = await loadClient(storage, session.clienteId); if (!directories.includes(client.operational.diretorio)) throw httpError(422, 'DIRECTORY_NOT_REGISTERED');
  const key = kind === 'perfil' ? profileKey(session.clienteId) : siteKey(session.clienteId); const current = await storage.get(key);
  if ((current?.revision || 0) !== input.revision) { await auditar(storage, event(session, 'conflito_revisao_rascunho', current?.revision || 0), now); throw httpError(409, 'REVISION_CONFLICT'); }
  const values = cleanObject(Object.fromEntries(Object.entries(input).filter(([k]) => !['revision','step'].includes(k))));
  if (kind === 'perfil') validateProfile(values, client, validate);
  if (kind === 'site' && values.urlExterna) values.urlExterna = safeUrl(values.urlExterna);
  const timestamp = now.toISOString(); const saved = { schemaVersion: 2, formVersion: input.formVersion, clienteId: session.clienteId, diretorio: client.operational.diretorio, revision: input.revision + 1, estado: validate ? 'validado' : 'rascunho', etapaSalva: input.step, criadoEm: current?.criadoEm || timestamp, atualizadoEm: timestamp, ...values };
  await storage.put(key, saved); await auditar(storage, event(session, kind === 'perfil' ? 'rascunho_perfil_alterado' : 'rascunho_site_alterado', saved.revision, kind === 'perfil' && input.contatoPublico ? { escolhaContato: input.contatoPublico.tipo } : {}), now); return saved;
}
function validateProfile(value, client, complete) {
  if (value.cidadePrincipal && value.cidadePrincipal !== 'londrina') throw httpError(422, 'CITY_INVALID');
  if (value.cidadesAtendimento && (!Array.isArray(value.cidadesAtendimento) || value.cidadesAtendimento.length > 1 || value.cidadesAtendimento.some((x) => x !== 'londrina'))) throw httpError(422, 'CITY_LIMIT_EXCEEDED');
  if (value.categorias?.length) throw httpError(422, 'CATEGORIES_PENDING');
  if (value.contatoPublico) value.contatoPublico = publicContact(value.contatoPublico, client.operational.contato);
  if (complete && (!value.nomeArtistico || !value.apresentacao || !value.cidadePrincipal)) throw httpError(422, 'REQUIRED_FIELD');
}
function publicContact(contact, personal) { exact(contact, new Set(['tipo','numero','consentimento'])); const types = ['whatsapp_pessoal','telefone_pessoal','outro','nenhum']; if (!types.includes(contact.tipo)) throw httpError(422, 'PUBLIC_CONTACT_INVALID'); if (contact.tipo === 'nenhum') return { tipo: 'nenhum', numero: null, consentimento: false }; if (contact.consentimento !== true) throw httpError(422, 'PUBLIC_CONTACT_CONSENT_REQUIRED'); const number = contact.tipo === 'whatsapp_pessoal' ? personal.whatsapp : contact.tipo === 'telefone_pessoal' ? personal.telefone : contact.numero; const normalized = String(number || '').replace(/\D/g, ''); if (!/^\d{10,15}$/.test(normalized)) throw httpError(422, 'PUBLIC_CONTACT_INVALID'); return { tipo: contact.tipo, numero: normalized, consentimento: true }; }
function cleanObject(value) { if (Array.isArray(value)) return value.map(cleanObject); if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k, cleanObject(v)])); if (typeof value === 'string') { if (/<[^>]*>|javascript:|data:text\/html/i.test(value) || /[\0-\x08\x0b\x0c\x0e-\x1f]/.test(value)) throw httpError(422, 'TEXT_UNSAFE'); return value.trim(); } return value; }
function safeUrl(value) { let url; try { url = new URL(value); } catch { throw httpError(422, 'URL_INVALID'); } if (!['https:','http:'].includes(url.protocol)) throw httpError(422, 'URL_INVALID'); return url.toString(); }
function exact(value, allowed) { if (!value || typeof value !== 'object' || Array.isArray(value)) throw httpError(400, 'BODY_INVALID'); for (const key of Object.keys(value)) if (!allowed.has(key)) throw httpError(422, 'UNKNOWN_FIELD'); }
function empty(clienteId, type) { return { schemaVersion: 2, formVersion: 2, clienteId, revision: 0, estado: 'rascunho', tipo: type }; }
function event(session, acao, revision, metadados = {}) { return { clienteId: session.clienteId, acao, ator: session.googleSub, papel: session.role, revision, metadados }; }
export const profileKey = (id) => `clientes/${id}/rascunho/perfil.json`;
export const siteKey = (id) => `clientes/${id}/rascunho/site.json`;
