import { ASAAS_STATE, SERVICE } from './config.js';
import { json } from './response.js';
import { privateStorage, publicStorage, hmac } from './storage.js';
import { concluirGoogle, googleConfigurado, iniciarGoogle } from './auth/google.js';
import { criarSessao, exigirRecente, logout, logoutAll, obterSessao, validarMutacao, httpError } from './auth/session.js';
import { adminView, changePlan, changeProtected, decide, findOrCreate, listClients, loadClient, publicSummary, requireAdmin, submitRegistration, updateContact } from './clientes.js';
import { uploadDocument } from './documentos.js';
import { createNotice, readNotice } from './avisos.js';
import { auditar } from './auditoria.js';
import { NullCepService } from './cep.js';
import { getDraft, saveDraft } from './rascunhos.js';
import { cancel, finish, manifest, moderate, principal, receive, remove, reorder, reserve } from './uploads.js';
import { PUBLICATION } from './config.js';
import { publishClient, rollback, flags } from './publicacao.js';
import { auditPublic, reconcile } from './cron.js';

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
    if (['POST','PUT','DELETE'].includes(request.method)) validarMutacao(request, session, env.APP_ORIGIN);
    if (request.method === 'POST' && path === '/api/auth/logout') { await auditar(storage, { clienteId: session.clienteId, acao: 'logout', ator: session.googleSub, papel: session.role, revision: session.revision }); return jsonCookie({ ok: true }, await logout(request, storage)); }
    if (request.method === 'POST' && path === '/api/auth/logout-all') { await logoutAll(storage, session.googleSub); await auditar(storage, { clienteId: session.clienteId, acao: 'sessoes_encerradas', ator: session.googleSub, papel: session.role, revision: session.revision }); return jsonCookie({ ok: true }, await logout(request, storage)); }
    if (request.method === 'GET' && path === '/api/cadastro/cep') return success(await (env.__cepService || new NullCepService()).consultar(url.searchParams.get('cep')));
    if (request.method === 'GET' && ['/api/cadastro', '/api/cadastro/status'].includes(path)) { const client = await loadClient(storage, session.clienteId); return json({ ok: true, data: path.endsWith('status') ? client.operational.states : { ...publicSummary(client), identity: client.identity ? protectedForOwner(client.identity) : null, documents: client.manifest } }); }
    if (request.method === 'POST' && path === '/api/cadastro') return success(await submitRegistration(storage, session, await body(request), env, request));
    if (request.method === 'PUT' && path === '/api/cadastro/contato-endereco') return success(await updateContact(storage, session, await body(request)));
    if (request.method === 'POST' && path === '/api/cadastro/documentos') return success(await uploadDocument(storage, session, request));
    if (request.method === 'GET' && path === '/api/painel/resumo') return success(publicSummary(await loadClient(storage, session.clienteId)));
    if (request.method === 'GET' && path === '/api/painel/publicacao/status') return success((await storage.get(`clientes/${session.clienteId}/publicacao/status.json`)) || { status:'nao_publicado', flags:flags(env) });
    if (request.method === 'POST' && path === '/api/painel/publicacao/solicitar') return success(await publishClient(storage,publicStorage(env),session.clienteId,env,{idempotencyKey:request.headers.get('idempotency-key')}));
    if (request.method === 'GET' && path === '/api/painel/avisos') return success((await loadClient(storage, session.clienteId)).notices || { revision: 0, avisos: [] });
    if (request.method === 'GET' && path === '/api/painel/perfil-publico') return success((await getDraft(storage, session.clienteId)).perfil);
    if (request.method === 'PUT' && path === '/api/painel/perfil-publico') return success(await saveDraft(storage, session, 'perfil', await body(request), { validate: url.searchParams.get('validar') === '1' }));
    if (request.method === 'GET' && path === '/api/painel/site') return success((await getDraft(storage, session.clienteId)).site);
    if (request.method === 'PUT' && path === '/api/painel/site') return success(await saveDraft(storage, session, 'site', await body(request), { validate: url.searchParams.get('validar') === '1' }));
    if (request.method === 'GET' && path === '/api/painel/midias') return success(await manifest(storage, session.clienteId));
    if (request.method === 'POST' && path === '/api/painel/uploads/reservar') return success(await reserve(storage, session, await body(request)));
    const uploadMatch = path.match(/^\/api\/painel\/uploads\/([^/]+)\/(conteudo|finalizar|cancelar)$/); if (uploadMatch) { const [, uploadId, action] = uploadMatch; if (request.method === 'PUT' && action === 'conteudo') return success(await receive(storage, session, uploadId, request)); if (request.method === 'POST' && action === 'finalizar') return success(await finish(storage, session, uploadId)); if (request.method === 'POST' && action === 'cancelar') return success(await cancel(storage, session, uploadId)); }
    if (request.method === 'PUT' && path === '/api/painel/midias/ordem') return success(await reorder(storage, session, await body(request)));
    const mediaMatch = path.match(/^\/api\/painel\/midias\/([^/]+)(?:\/(principal|arquivo))?$/); if (mediaMatch) { const [, id, action] = mediaMatch; if (request.method === 'PUT' && action === 'principal') return success(await principal(storage, session, id, await body(request))); if (request.method === 'DELETE' && !action) return success(await remove(storage, session, id, await body(request))); if (request.method === 'GET' && action === 'arquivo') { const item=(await manifest(storage,session.clienteId)).itens.find((x)=>x.id===id); if(!item)throw httpError(404,'MEDIA_NOT_FOUND'); const bytes=await storage.getBytes(item.arquivo); if(!bytes)throw httpError(404,'MEDIA_NOT_FOUND'); return new Response(bytes,{headers:{'content-type': item.tipo==='video'?'video/mp4':item.tipo==='audio'?'audio/mp4':'image/webp','cache-control':'private, no-store','x-content-type-options':'nosniff'}}); } }
    if (request.method === 'GET' && path === '/api/painel/preview') { const client=await loadClient(storage,session.clienteId); const draft=await getDraft(storage,session.clienteId); const media=await manifest(storage,session.clienteId); return success({ ...draft, midias:media.itens.map((x)=>({...x,url:`/api/painel/midias/${x.id}/arquivo`})), tema:{mulheres:'pink',homens:'royal',transex:'lilás'}[client.operational.diretorio], publicacao:PUBLICATION, indexacao:'bloqueada' }); }
    const readMatch = path.match(/^\/api\/painel\/avisos\/([^/]+)\/lido$/); if (request.method === 'POST' && readMatch) return success(await readNotice(storage, session, readMatch[1], (await body(request)).revision));
    if (path.startsWith('/api/superadmin/')) requireAdmin(session);
    if (request.method === 'GET' && path === '/api/superadmin/clientes') { if (url.searchParams.has('cpf')) { const index = await storage.get(`sistema/cpf/${await hmac(String(url.searchParams.get('cpf')).replace(/\D/g, ''), env.CPF_INDEX_SECRET)}.json`); return success(index ? [publicSummary(await loadClient(storage, index.clienteId))] : []); } return success(await listClients(storage, { q: url.searchParams.get('q'), status: url.searchParams.get('status') })); }
    const adminMatch = path.match(/^\/api\/superadmin\/clientes\/([^/]+)(?:\/(.*))?$/); if (adminMatch) { const [, clienteId, action = ''] = adminMatch; if (request.method === 'GET' && !action) return success(adminView(await loadClient(storage, clienteId)));
      if (request.method === 'GET' && action === 'rascunho') return success(await getDraft(storage, clienteId));
      if (request.method === 'GET' && action === 'midias') return success(await manifest(storage, clienteId));
      const decisionMatch=action.match(/^midias\/([^/]+)\/decisao$/); if(request.method==='POST'&&decisionMatch)return success(await moderate(storage,session,clienteId,decisionMatch[1],await body(request)));
      if (request.method === 'POST' && action === 'decisao') { exigirRecente(session); return success(await decide(storage, session, clienteId, await body(request))); }
      if (request.method === 'PUT' && action === 'dados-protegidos') { exigirRecente(session); return success(await changeProtected(storage, session, clienteId, await body(request))); }
      if (request.method === 'PUT' && action === 'plano') return success(await changePlan(storage, session, clienteId, await body(request)));
      if (request.method === 'POST' && action === 'avisos') return success(await createNotice(storage, session, clienteId, await body(request)));
      if (request.method === 'GET' && action === 'auditoria') { const keys = await storage.list(`clientes/${clienteId}/auditoria/`); return success(await Promise.all(keys.map((key) => storage.get(key)))); }
      if(request.method==='POST'&&['publicar','reconstruir'].includes(action))return success(await publishClient(storage,publicStorage(env),clienteId,env,{idempotencyKey:request.headers.get('idempotency-key')}));
      if(request.method==='POST'&&action==='suspender'){await storage.put(`clientes/${clienteId}/publicacao/status.json`,{status:'suspensa',em:new Date().toISOString()});return success({status:'suspensa'});}
      if(request.method==='POST'&&action==='rollback')return success(await rollback(publicStorage(env),(await body(request)).publicationId));
      if (request.method === 'GET' && action.startsWith('documentos/')) { const kind = action.slice(11); const manifest = (await loadClient(storage, clienteId)).manifest; const item = manifest?.arquivos?.[kind]; if (!item || !storage.bucket) throw httpError(404, 'DOCUMENT_NOT_FOUND'); const object = await storage.bucket.get(item.key); return new Response(object.body, { headers: { 'content-type': item.mime, 'cache-control': 'private, no-store', 'content-disposition': 'inline', 'x-content-type-options': 'nosniff' } }); }
    }
    if(request.method==='GET'&&path==='/api/superadmin/tarefas')return success(await values(storage,'sistema/publicacao/tarefas/'));
    if(request.method==='GET'&&path==='/api/superadmin/aniversarios')return success(await matchingValues(storage,/\/aniversarios\//));
    if(request.method==='GET'&&path==='/api/superadmin/vencimentos')return success(await matchingValues(storage,/\/operacional\/vencimento\.json$/));
    if(request.method==='POST'&&path==='/api/superadmin/rede/auditar')return success(await auditPublic(publicStorage(env)));
    if(request.method==='POST'&&path==='/api/superadmin/rede/reconciliar')return success(await reconcile(storage,async()=>{}));
    return json({ ok: false, code: 'NOT_FOUND' }, 404);
  } catch (error) { return json({ ok: false, code: error.code || error.message || 'INTERNAL_ERROR' }, error.status || 500); }
}
async function body(request) { const length = Number(request.headers.get('content-length') || 0); if (length > 1024 * 1024) throw httpError(413, 'BODY_TOO_LARGE'); let value; try { value = await request.json(); } catch { throw httpError(400, 'JSON_INVALID'); } return value; }
function success(data) { return json({ ok: true, data }); }
function jsonCookie(data, cookie) { const response = json(data); response.headers.set('set-cookie', cookie); return response; }
function protectedForOwner(identity) { const { cpf, ...rest } = identity; return { ...rest, cpfMascarado: `***.***.***-${cpf.slice(-2)}` }; }
async function values(storage,prefix){const keys=await storage.list(prefix);return Promise.all(keys.map(k=>storage.get(k)));}
async function matchingValues(storage,re){const keys=(await storage.list('clientes/')).filter(k=>re.test(k));return Promise.all(keys.map(k=>storage.get(k)));}
