import assert from 'node:assert/strict';
import test from 'node:test';
import { AdminError, createAdminOperations, requireAdmin } from '../../business/admin.js';
import { resolvePremiumEligibility } from '../../business/plans.js';

const actor = { id: 'admin-0000000001', role: 'admin', status: 'active' };
function setup() {
  const state={conditions:[],audits:[],sent:[]}; const user={id:'user-0000000001',status:'active'}; const listing={id:'listing-0000001',slug:'ana-londrina'};
  const db={async first(sql,args){if(sql.includes('SELECT id,status FROM users'))return user;if(sql.includes('SELECT id,slug FROM listings'))return listing;if(sql.includes('FROM commercial_conditions')&&!sql.includes('EXISTS'))return state.conditions.at(-1)??null;if(sql.includes('SELECT u.status'))return {status:user.status,paid_premium:0,commercial_premium:state.conditions.some(x=>x.status==='active')?1:0};return null},async all(){return {results:[]}},async write(sql,args){if(sql.includes('admin_audit'))state.audits.push(args);return {}},async batch(commands){for(const command of commands){if(command.sql.includes('INSERT INTO commercial_conditions'))state.conditions.push({id:command.parameters[0],type:command.parameters[2],status:command.parameters[3],actor:command.parameters[7]});if(command.sql.includes('admin_audit'))state.audits.push(command.parameters)}return []}};
  const operations=createAdminOperations({db,publications:{async send(value){state.sent.push(value)}},logger:{info(){}},clock:()=>new Date('2026-08-14T12:00:00Z'),id:(()=>{let n=0;return()=>`fixed-${++n}`})()});return {state,user,db,operations};
}

test('admin authorization comes only from the active D1 session identity',()=>{assert.equal(requireAdmin({user:actor}),actor);assert.throws(()=>requireAdmin(null),error=>error instanceof AdminError&&error.status===401);assert.throws(()=>requireAdmin({user:{...actor,role:'user'}}),error=>error.status===403);assert.throws(()=>requireAdmin({user:{...actor,status:'suspended'}}),error=>error.status===403)});

test('commercial courtesy persists actor audit and canonical Queue publication without payment or R2',async()=>{const s=setup();const result=await s.operations.condition(s.user.id,{type:'courtesy',startsAt:'2026-08-14T00:00:00Z',endsAt:'2026-09-14T00:00:00Z',reason:'Atendimento comercial'},actor);assert.equal(result.status,'active');assert.equal(s.state.conditions[0].actor,actor.id);assert.equal(s.state.audits[0][1],actor.id);assert.equal(s.state.audits[0][2],s.user.id);assert.deepEqual(s.state.sent[0],{type:'PUBLICATION_REQUESTED',entity:'profile',id:'listing-0000001',slug:'ana-londrina',reason:'commercial-condition.updated',requestedAt:'2026-08-14T12:00:00.000Z'});assert.equal((await resolvePremiumEligibility(s.db,s.user.id)).premium,true)});

test('trial requires an explicit future end and forged actor/role fields are rejected',async()=>{const s=setup();await assert.rejects(s.operations.condition(s.user.id,{type:'trial',startsAt:'2026-08-14T00:00:00Z',reason:'Teste válido',actor:'forged',role:'admin'},actor),{code:'INVALID_INPUT'});await assert.rejects(s.operations.condition(s.user.id,{type:'trial',startsAt:'2026-08-14T00:00:00Z',reason:'Teste válido'},actor),{code:'INVALID_INPUT'})});

test('suspension and republish are audited and enqueue only canonical publication requests',async()=>{const s=setup();await s.operations.state(s.user.id,'suspended','Solicitação de suporte',actor);await s.operations.republish(s.user.id,'Reconstrução operacional',actor);assert.equal(s.state.audits.length,2);assert.deepEqual(s.state.sent.map(x=>x.reason),['account.suspended','admin.republish']);assert.equal(s.state.sent.every(x=>x.entity==='profile'),true)});
