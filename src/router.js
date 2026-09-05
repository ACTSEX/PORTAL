import { ASAAS_STATE, SERVICE } from './config.js';
import { json } from './response.js';
import { privateStorage, hmac } from './storage.js';
import { concluirGoogle, googleConfigurado, iniciarGoogle } from './auth/google.js';
import { criarSessao, exigirRecente, logout, logoutAll, obterSessao, validarMutacao, httpError } from './auth/session.js';
import { adminView, changePlan, changeProtected, decide, findOrCreate, listClients, loadClient, publicSummary, requireAdmin, submitRegistration, updateContact } from './clientes.js';
import { uploadDocument } from './documentos.js';
import { createNotice, readNotice } from './avisos.js';
import { auditar } from './auditoria.js';
import { NullCepService } from './cep.js';

export async function route(request, env = {}) {
  try {
    const url = new URL(request.url); const path = url.pathname;
    if (request.method === 'GET' && path === '/api/health') return json({ ok: true, service: SERVICE.name, version: SERVICE.version, asaasEnabled: ASAAS_STATE.habilitado });
    const storage = privateStorage(env);
    if (request.method === 'GET' && path === '/api/auth/google/config') return json({ ok: true, configured: googleConfigurado(env), status: googleConfigurado(env) ? 'Disponível' : 'Configuração Google pendente', scopes: ['openid', 'email', 'profile'] });
    if (request.method === 'GET' && path === '/api/auth/google/start') return Response.redirect(await iniciarGoogle(storage, env), 302);
    if (request.method === 'GET' && path === '/api/auth/google/callback') { const google = await concluirGoogle(storage, env, url.searchParams, env.__googleProvider); const account = await findOrCreate(storage, google, env, request); const { session, cookie } = await criarSessao(storage, { clienteId: account.operational.clienteId, googleSub: google.googleSub, role: account.operational.role }); await auditar(storage, { clienteId: session.clienteId, acao: 'login', ator: session.googleSub, papel: session.role, revision: account.operational.revision }); return new Response(null, { status: 302, headers: { location: `${env.APP_ORIGIN}/painel/`, 'set-cookie': cookie, 'cache-control': 'no-store' } }); }
    const session = await obterSessao(request, storage); if (!session) throw httpError(401, 'AUTH_REQUIRED');
    if (request.method === 'GET' && path === '/api/auth/session') return json({ ok: true, data: { clienteId: session.clienteId, role: session.role, csrfToken: session.csrf, expiresAt: session.expiresAt } });
    if (request.method === 'POST') validarMutacao(request, session, env.APP_ORIGIN);
    if (request.method === 'PUT') validarMutacao(request, session, env.APP_ORIGIN);
    if (request.method === 'POST' && path === '/api/auth/logout') { await auditar(storage, { clienteId: session.clienteId, acao: 'logout', ator: session.googleSub, papel: session.role, revision: session.revision }); return jsonCookie({ ok: true }, await logout(request, storage)); }
    if (request.method === 'POST' && path === '/api/auth/logout-all') { await logoutAll(storage, session.googleSub); await auditar(storage, { clienteId: session.clienteId, acao: 'sessoes_encerradas', ator: session.googleSub, papel: session.role, revision: session.revision }); return jsonCookie({ ok: true }, await logout(request, storage)); }
    if (request.method === 'GET' && path === '/api/cadastro/cep') return success(await (env.__cepService || new NullCepService()).consultar(url.searchParams.get('cep')));
    if (request.method === 'GET' && ['/api/cadastro', '/api/cadastro/status'].includes(path)) { const client = await loadClient(storage, session.clienteId); return json({ ok: true, data: path.endsWith('status') ? client.operational.states : { ...publicSummary(client), identity: client.identity ? protectedForOwner(client.identity) : null, documents: client.manifest } }); }
    if (request.method === 'POST' && path === '/api/cadastro') return success(await submitRegistration(storage, session, await body(request), env, request));
    if (request.method === 'PUT' && path === '/api/cadastro/contato-endereco') return success(await updateContact(storage, session, await body(request)));
    if (request.method === 'POST' && path === '/api/cadastro/documentos') return success(await uploadDocument(storage, session, request));
    if (request.method === 'GET' && path === '/api/painel/resumo') return success(publicSummary(await loadClient(storage, session.clienteId)));
    if (request.method === 'GET' && path === '/api/painel/avisos') return success((await loadClient(storage, session.clienteId)).notices || { revision: 0, avisos: [] });
    const readMatch = path.match(/^\/api\/painel\/avisos\/([^/]+)\/lido$/); if (request.method === 'POST' && readMatch) return success(await readNotice(storage, session, readMatch[1], (await body(request)).revision));
    if (path.startsWith('/api/superadmin/')) requireAdmin(session);
    if (request.method === 'GET' && path === '/api/superadmin/clientes') { if (url.searchParams.has('cpf')) { const index = await storage.get(`sistema/cpf/${await hmac(String(url.searchParams.get('cpf')).replace(/\D/g, ''), env.CPF_INDEX_SECRET)}.json`); return success(index ? [publicSummary(await loadClient(storage, index.clienteId))] : []); } return success(await listClients(storage, { q: url.searchParams.get('q'), status: url.searchParams.get('status') })); }
    const adminMatch = path.match(/^\/api\/superadmin\/clientes\/([^/]+)(?:\/(.*))?$/); if (adminMatch) { const [, clienteId, action = ''] = adminMatch; if (request.method === 'GET' && !action) return success(adminView(await loadClient(storage, clienteId)));
      if (request.method === 'POST' && action === 'decisao') { exigirRecente(session); return success(await decide(storage, session, clienteId, await body(request))); }
      if (request.method === 'PUT' && action === 'dados-protegidos') { exigirRecente(session); return success(await changeProtected(storage, session, clienteId, await body(request))); }
      if (request.method === 'PUT' && action === 'plano') return success(await changePlan(storage, session, clienteId, await body(request)));
      if (request.method === 'POST' && action === 'avisos') return success(await createNotice(storage, session, clienteId, await body(request)));
      if (request.method === 'GET' && action === 'auditoria') { const keys = await storage.list(`clientes/${clienteId}/auditoria/`); return success(await Promise.all(keys.map((key) => storage.get(key)))); }
      if (request.method === 'GET' && action.startsWith('documentos/')) { const kind = action.slice(11); const manifest = (await loadClient(storage, clienteId)).manifest; const item = manifest?.arquivos?.[kind]; if (!item || !storage.bucket) throw httpError(404, 'DOCUMENT_NOT_FOUND'); const object = await storage.bucket.get(item.key); return new Response(object.body, { headers: { 'content-type': item.mime, 'cache-control': 'private, no-store', 'content-disposition': 'inline', 'x-content-type-options': 'nosniff' } }); }
    }
    return json({ ok: false, code: 'NOT_FOUND' }, 404);
  } catch (error) { return json({ ok: false, code: error.code || error.message || 'INTERNAL_ERROR' }, error.status || 500); }
}
async function body(request) { const length = Number(request.headers.get('content-length') || 0); if (length > 1024 * 1024) throw httpError(413, 'BODY_TOO_LARGE'); let value; try { value = await request.json(); } catch { throw httpError(400, 'JSON_INVALID'); } return value; }
function success(data) { return json({ ok: true, data }); }
function jsonCookie(data, cookie) { const response = json(data); response.headers.set('set-cookie', cookie); return response; }
function protectedForOwner(identity) { const { cpf, ...rest } = identity; return { ...rest, cpfMascarado: `***.***.***-${cpf.slice(-2)}` }; }
