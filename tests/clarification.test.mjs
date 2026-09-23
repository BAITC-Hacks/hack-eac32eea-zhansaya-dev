import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { webcrypto } from 'node:crypto';

function load(file, globals = {}, modules = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const context = {exports:{}, URL, Response, Request, AbortSignal, crypto:webcrypto, ...globals, require:(name)=>modules[name]};
  vm.runInNewContext(code, context);
  return context.exports;
}
const validation = load('src/lib/clarification.ts');
// Explicit test fixtures, never used by the running application.
const fixture = {questions:[
  'Who uses the university cafeteria, and when are queues longest?',
  'What queue-time or cafeteria transaction data is available, if any?',
  'What reduction in cafeteria waiting time would count as success?',
  'What result should the student team deliver for the cafeteria?',
  'What budget, timetable, or cafeteria operating constraints apply?'
]};
const description = 'We want to reduce queues in our university cafeteria.';
function request(body={description}) {return new Request('http://localhost/api/clarify',{method:'POST',body:JSON.stringify(body)});}
function route(fetch, key='test-only-not-a-real-key') {
  return load('src/app/api/clarify/route.ts',{fetch,process:{env:{OPENAI_API_KEY:key}}},{'@/lib/clarification':validation});
}
function provider(value=fixture,status='completed') {return Response.json({status,output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]});}

test('missing key and invalid input return clear errors without calling provider',async()=>{
  let called=false;
  const handler=route(async()=>{called=true;},'');
  assert.equal((await handler.POST(request())).status,503);
  assert.equal((await handler.POST(request({description:'   '}))).status,400);
  assert.equal((await handler.POST(request({description:'x'.repeat(12001)}))).status,400);
  assert.equal(called,false);
});
test('cafeteria request uses strict schema and server-only authorization; output has IDs',async()=>{
  const handler=route(async(url,options)=>{
    assert.equal(url,'https://api.openai.com/v1/responses');
    const body=JSON.parse(options.body);
    assert.equal(body.input[0].content,description);
    assert.equal(body.text.format.strict,true);
    assert.equal(body.store,false);
    assert.match(body.instructions,/Never invent business facts/);
    assert.equal(options.headers.Authorization,'Bearer test-only-not-a-real-key');
    return provider();
  });
  const response=await handler.POST(request());
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.questions.length,5);
  assert.equal(new Set(body.questions.map(q=>q.id)).size,5);
  assert.equal(JSON.stringify(body).includes('test-only-not-a-real-key'),false);
});
test('rejects too few, duplicate, empty, malformed, incomplete and refused questions',async()=>{
  for(const value of [{questions:['One?','Two?']},{questions:['Same?','Same?','Third?']},{questions:['','Two?','Three?']},{other:[]}]) {
    assert.equal((await route(async()=>provider(value)).POST(request())).status,502);
  }
  assert.equal((await route(async()=>provider(fixture,'incomplete')).POST(request())).status,502);
  assert.equal((await route(async()=>Response.json({status:'completed',output:[{type:'message',content:[{type:'refusal',refusal:'no'}]}]})).POST(request())).status,422);
});
test('provider failures are sanitized, retryable, and never expose raw error or key',async()=>{
  for(const status of [401,403,429,500]) {
    const response=await route(async()=>new Response('test-only-not-a-real-key',{status})).POST(request());
    assert.equal(response.status,status===429?429:502);
    assert.equal((await response.text()).includes('test-only-not-a-real-key'),false);
  }
  const response=await route(async()=>{throw new Error('private provider error');}).POST(request());
  assert.equal(response.status,502);
  assert.equal((await response.text()).includes('private provider error'),false);
});
test('Step 1 drafts and answered questions survive storage reload and description edits',()=>{
  let raw=null;
  let fail=false;
  const globals={window:{localStorage:{getItem:()=>raw,setItem:(_,value)=>{if(fail)throw Error('Full');raw=value;}}}};
  const modules={'@/lib/clarification':validation,'@/lib/task-card':load('src/lib/task-card.ts')};
  const store=load('src/lib/draft-storage.ts',globals,modules);
  const draft={id:'draft-1',draftDescription:description,status:'draft',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),clarificationQuestions:[],taskCard:{}};
  store.saveDraft(draft);
  assert.equal(store.readDrafts()[0].clarificationQuestions.length,0);
  const answered={...draft,clarificationSourceDescription:description,clarificationQuestions:fixture.questions.map((question,i)=>({id:String(i),question,answer:i===0?'  Students at lunch.\nStaff too.  ':''}))};
  store.saveDraft(answered);
  const reloaded=load('src/lib/draft-storage.ts',globals,modules).readDrafts()[0];
  assert.equal(reloaded.clarificationQuestions[0].answer,'  Students at lunch.\nStaff too.  ');
  store.saveDraft({...reloaded,draftDescription:'Updated description'});
  assert.equal(store.readDrafts()[0].clarificationQuestions.length,5);
  const previous=raw;fail=true;
  assert.throws(()=>store.saveDraft({...answered,clarificationQuestions:[]}));
  assert.equal(raw,previous);
});

test('task card copies only selected answers; blanks, source history and manual confirmation persist',()=>{
  const cards=load('src/lib/task-card.ts');
  let raw=null; let blocked=false;
  const globals={window:{localStorage:{getItem:()=>raw,setItem:(_,value)=>{if(blocked)throw Error('Full');raw=value;}}}};
  const modules={'@/lib/clarification':validation,'@/lib/task-card':cards};
  const storage=load('src/lib/draft-storage.ts',globals,modules);
  const now=new Date().toISOString();
  let draft={id:'card-test',draftDescription:description,status:'draft',createdAt:now,updatedAt:now,taskCard:{},clarificationQuestions:[{id:'users',question:'Who uses the cafeteria?',answer:'  Students and staff.  '},{id:'unknown',question:'Constraints?',answer:''}]};
  storage.saveDraft(draft);
  draft=storage.saveDraft(cards.createTaskCard(draft,{users:'users'}))[0];
  assert.equal(draft.taskCard.needOrProblem,description);
  assert.equal(draft.taskCard.users,'  Students and staff.  ');
  assert.equal(draft.taskCard.title,'');
  assert.equal(draft.taskCard.constraints,'');
  assert.equal(draft.confirmation,undefined);
  assert.equal(Object.keys(draft.taskCard).length,10);
  draft=storage.saveDraft({...draft,taskCard:{...draft.taskCard,title:'Cafeteria queues'}})[0];
  draft=storage.saveDraft(cards.confirmTaskCard(draft))[0];
  assert.ok(draft.confirmation);
  const fresh=load('src/lib/draft-storage.ts',globals,modules).readDrafts()[0];
  assert.equal(fresh.taskCard.title,'Cafeteria queues');
  assert.ok(fresh.confirmation);
  draft=storage.saveDraft({...fresh,clarificationQuestions:[{...fresh.clarificationQuestions[0],answer:'Students only'},fresh.clarificationQuestions[1]]})[0];
  assert.equal(draft.confirmation,undefined);
  assert.equal(draft.taskCardNeedsReview,true);
  assert.equal(draft.taskCard.users,'  Students and staff.  ');
  assert.equal(draft.sourceHistory.at(-1).clarificationQuestions[0].answer,'  Students and staff.  ');
  draft=storage.saveDraft(cards.confirmTaskCard(draft))[0];
  assert.ok(draft.confirmation);
  draft=storage.saveDraft({...draft,draftDescription:'Changed cafeteria description'})[0];
  assert.equal(draft.confirmation,undefined);
  assert.equal(draft.taskCardNeedsReview,true);
  assert.equal(draft.sourceHistory[0].draftDescription,description);
  draft=storage.saveDraft(cards.confirmTaskCard(draft))[0];
  draft=storage.saveDraft({...draft,taskCard:{...draft.taskCard,title:'Edited card'}})[0];
  assert.equal(draft.confirmation,undefined);
  assert.equal(draft.taskCardNeedsReview,true);
  const before=raw;blocked=true;
  assert.throws(()=>storage.saveDraft(cards.confirmTaskCard(draft)));
  assert.equal(raw,before);
});

test('publication requires current confirmation, is idempotent, allows zero score, and remains fixed',()=>{
 const cards=load('src/lib/task-card.ts');const scoring=load('src/lib/readiness.ts');let raw=null;let blocked=false;
 const globals={window:{localStorage:{getItem:()=>raw,setItem:(_,value)=>{if(blocked)throw Error('Full');raw=value;}}}};
 const modules={'@/lib/clarification':validation,'@/lib/task-card':cards};
 const storage=load('src/lib/draft-storage.ts',globals,modules);const now=new Date().toISOString();
 let draft={id:'publish-test',draftDescription:description,status:'draft',createdAt:now,updatedAt:now,taskCard:{title:''},taskCardCreatedAt:now,clarificationQuestions:[]};
 storage.saveDraft(draft);assert.throws(()=>storage.publishChallenge(draft));
 draft=storage.saveDraft(cards.confirmTaskCard(draft))[0];
 const published=storage.publishChallenge(draft)[0];assert.equal(published.status,'published');assert.equal(published.id,draft.id);assert.ok(published.publishedAt);assert.equal(scoring.calculateReadiness(published.publishedSnapshot.taskCard).score,0);
 const second=storage.publishChallenge(draft);assert.equal(second.length,1);assert.equal(second[0].publishedAt,published.publishedAt);assert.equal(storage.readPublishedChallenges().length,1);
 let edited=storage.saveDraft({...published,taskCard:{title:'Private working-copy title'},publishedSnapshot:{...published.publishedSnapshot,taskCard:{title:'Should never replace snapshot'}}})[0];
 assert.equal(edited.confirmation,undefined);assert.equal(edited.taskCardNeedsReview,true);assert.equal(edited.status,'published');assert.equal(storage.readPublishedChallenges()[0].taskCard.title,'');
 edited=storage.saveDraft(cards.confirmTaskCard(edited))[0];storage.publishChallenge(edited);assert.equal(storage.readPublishedChallenges()[0].taskCard.title,'');
 const reloaded=load('src/lib/draft-storage.ts',globals,modules);assert.equal(reloaded.readPublishedChallenges()[0].id,'publish-test');
 let other={...draft,id:'other',confirmation:undefined};storage.saveDraft(other);other=storage.saveDraft(cards.confirmTaskCard(other)).find(x=>x.id==='other');
 storage.saveDraft({...other,taskCard:{title:'changed'}});assert.throws(()=>storage.publishChallenge(other));
 const latest=storage.readDrafts().find(x=>x.id==='other');other=storage.saveDraft(cards.confirmTaskCard(latest)).find(x=>x.id==='other');const before=raw;blocked=true;assert.throws(()=>storage.publishChallenge(other));assert.equal(raw,before);
});

test('catalog uses shared scoring with default descending sort, level/search filters and low-score inclusion',()=>{
 const scoring=load('src/lib/readiness.ts');const catalog=load('src/lib/catalog.ts',{}, {'@/lib/readiness':scoring});
 const now=new Date().toISOString();
 const base={status:'published',publishedAt:now,confirmation:{confirmedAt:now,confirmedBy:'Business user'}};
 const items=[{...base,id:'zero',taskCard:{}},{...base,id:'medium',taskCard:{title:'Cafeteria',needOrProblem:'Queues',availableDataOrMaterials:'Observations',users:'Students'}},{...base,id:'high',taskCard:{title:'Transport',context:'Campus',needOrProblem:'Travel',availableDataOrMaterials:'Routes',expectedResult:'Prototype',successCriteria:'Time reduction',constraints:'Budget',users:'Students',businessContact:'Manager',communicationFormat:'Email'}}];
 assert.equal(catalog.filterCatalog(items,'','All').map(x=>x.challenge.id).join(','),'high,medium,zero');
 assert.equal(catalog.filterCatalog(items,'','All','lowest')[0].challenge.id,'zero');
 assert.equal(catalog.filterCatalog(items,'','Draft')[0].challenge.id,'zero');
 assert.equal(catalog.filterCatalog(items,' CAFETERIA ','Working')[0].challenge.id,'medium');
 assert.equal(catalog.filterCatalog(items,'nothing matches','All').length,0);
 assert.equal(catalog.filterCatalog(items,'','Priority')[0].rating.score,100);
 assert.equal(items[0].id,'zero');
});

test('proposal validation rejects missing fields and unsafe/malformed links, allows optional prototype',()=>{
 const proposals=load('src/lib/proposals.ts');
 const valid={teamName:'Team',solutionIdea:'Idea',plan:'Plan',timeline:'Two weeks',prototypeLink:''};
 assert.equal(Object.keys(proposals.validateProposal(valid)).length,0);
 for(const key of ['teamName','solutionIdea','plan','timeline'])assert.ok(proposals.validateProposal({...valid,[key]:' \n '})[key]);
 for(const link of ['javascript:alert(1)','data:text/html,test','ftp://example.com','example.com','https://','https://example.com/a b','https://user:password@example.com'])assert.ok(proposals.validateProposal({...valid,prototypeLink:link}).prototypeLink,link);
 for(const link of ['https://example.com/prototype','http://localhost:3000/demo',' https://example.com '])assert.equal(Object.keys(proposals.validateProposal({...valid,prototypeLink:link})).length,0);
});

test('proposals require published challenge, survive reload, stay pending, and deduplicate retries',()=>{
 const data=new Map();let blocked=false;
 const globals={window:{localStorage:{getItem:key=>data.get(key)??null,setItem:(key,value)=>{if(blocked)throw Error('Full');data.set(key,value);}}}};
 const cards=load('src/lib/task-card.ts');
 const storage=load('src/lib/draft-storage.ts',globals,{'@/lib/clarification':validation,'@/lib/task-card':cards});
 const modules={'@/lib/draft-storage':storage};
 const proposals=load('src/lib/proposals.ts',globals,modules);
 const now=new Date().toISOString();const input={teamName:'Test Team',solutionIdea:'  Exact idea\nSecond line  ',plan:'Prototype and test',timeline:'Two weeks',prototypeLink:''};
 let draft={id:'challenge-proposal',draftDescription:description,status:'draft',createdAt:now,updatedAt:now,taskCardCreatedAt:now,taskCard:{title:'Public title'},clarificationQuestions:[]};
 storage.saveDraft(draft);
 assert.throws(()=>proposals.submitProposal('one','missing',input));
 assert.throws(()=>proposals.submitProposal('one',draft.id,input));
 draft=storage.saveDraft(cards.confirmTaskCard(draft))[0];draft=storage.publishChallenge(draft)[0];
 storage.saveDraft({...draft,taskCard:{title:'Unpublished working copy'}});
 const submitted=proposals.submitProposal('one',draft.id,input);
 assert.equal(submitted.status,'pending');assert.equal(submitted.challengeTitle,'Public title');assert.equal(submitted.challengePublishedAt,draft.publishedAt);assert.equal(submitted.challengeId,draft.id);assert.ok(submitted.submittedAt);assert.equal(submitted.businessDecision,undefined);
 proposals.submitProposal('one',draft.id,input);assert.equal(proposals.readProposals().length,1);
 const restored=load('src/lib/proposals.ts',globals,modules).readProposals()[0];assert.equal(restored.solutionIdea,input.solutionIdea);assert.equal(restored.prototypeLink,undefined);assert.equal(restored.id,'one');
 const before=data.get('ai-sana.team-proposals.v1');blocked=true;assert.throws(()=>proposals.submitProposal('two',draft.id,input));assert.equal(data.get('ai-sana.team-proposals.v1'),before);blocked=false;
 data.set('ai-sana.team-proposals.v1','{bad');assert.throws(()=>proposals.readProposals());assert.throws(()=>proposals.submitProposal('two',draft.id,input));assert.equal(data.get('ai-sana.team-proposals.v1'),'{bad');
});

test('manual decisions are final, timestamped, idempotent, and do not change other proposals or publications',async()=>{
 const data=new Map();let blocked=false;let queue=Promise.resolve();
 const globals={navigator:{locks:{request:(_,fn)=>{const next=queue.then(fn);queue=next.catch(()=>{});return next;}}},window:{localStorage:{getItem:key=>data.get(key)??null,setItem:(key,value)=>{if(blocked)throw Error('Full');data.set(key,value);}}}};
 const cards=load('src/lib/task-card.ts');const storage=load('src/lib/draft-storage.ts',globals,{'@/lib/clarification':validation,'@/lib/task-card':cards});
 const proposals=load('src/lib/proposals.ts',globals,{'@/lib/draft-storage':storage});
 const now=new Date().toISOString();let draft={id:'review',draftDescription:'Test problem',status:'draft',createdAt:now,updatedAt:now,taskCardCreatedAt:now,taskCard:{title:'Review fixture'},clarificationQuestions:[]};
 storage.saveDraft(draft);draft=storage.saveDraft(cards.confirmTaskCard(draft))[0];storage.publishChallenge(draft);
 const publicationBefore=data.get('ai-sana.challenge-drafts.v1');
 const input={teamName:'A',solutionIdea:'Idea',plan:'Plan',timeline:'Week',prototypeLink:''};
 proposals.submitProposal('a','review',input);proposals.submitProposal('b','review',{...input,teamName:'B'});proposals.submitProposal('c','review',{...input,teamName:'C'});
 const accepted=await proposals.decideProposal('a','accepted');assert.equal(accepted.find(p=>p.id==='a').status,'accepted');assert.equal(accepted.find(p=>p.id==='b').status,'pending');assert.equal(accepted.find(p=>p.id==='c').status,'pending');
 const date=accepted.find(p=>p.id==='a').businessDecision.decidedAt;assert.ok(date);assert.equal((await proposals.decideProposal('a','accepted')).find(p=>p.id==='a').businessDecision.decidedAt,date);
 await assert.rejects(proposals.decideProposal('a','rejected'));await assert.rejects(proposals.decideProposal('b','accepted'));
 const rejected=await proposals.decideProposal('b','rejected');assert.equal(rejected.find(p=>p.id==='b').status,'rejected');assert.equal(rejected.find(p=>p.id==='c').status,'pending');
 await assert.rejects(proposals.decideProposal('b','accepted'));await assert.rejects(proposals.decideProposal('missing','rejected'));
 assert.equal(data.get('ai-sana.challenge-drafts.v1'),publicationBefore);
 assert.equal(load('src/lib/proposals.ts',globals,{'@/lib/draft-storage':storage}).readProposals().find(p=>p.id==='a').status,'accepted');
 const before=data.get('ai-sana.team-proposals.v1');blocked=true;await assert.rejects(proposals.decideProposal('c','rejected'));assert.equal(data.get('ai-sana.team-proposals.v1'),before);blocked=false;
 const corrupted=JSON.parse(before);corrupted.find(p=>p.id==='c').status='accepted';data.set('ai-sana.team-proposals.v1',JSON.stringify(corrupted));assert.throws(()=>proposals.readProposals());
});

test('concurrent conflicting acceptances serialize and only one succeeds',async()=>{
 let raw=null;let queue=Promise.resolve();
 const now=new Date().toISOString();const published={id:'one',publishedAt:now,taskCard:{title:'One'}};
 const globals={navigator:{locks:{request:(_,fn)=>{const next=queue.then(fn);queue=next.catch(()=>{});return next;}}},window:{localStorage:{getItem:()=>raw,setItem:(_,value)=>{raw=value;}}}};
 const proposals=load('src/lib/proposals.ts',globals,{'@/lib/draft-storage':{readPublishedChallenges:()=>[published]}});
 const input={teamName:'Team',solutionIdea:'Idea',plan:'Plan',timeline:'Week',prototypeLink:''};
 proposals.submitProposal('a','one',input);proposals.submitProposal('b','one',input);
 const results=await Promise.allSettled([proposals.decideProposal('a','accepted'),proposals.decideProposal('b','accepted')]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(proposals.readProposals().filter(p=>p.status==='accepted').length,1);assert.equal(proposals.readProposals().filter(p=>p.status==='pending').length,1);
});

test('missing publication or unavailable lock support cannot save a decision',async()=>{
 let raw=null;let published=true;const now=new Date().toISOString();
 const globals={navigator:{locks:{request:(_,fn)=>Promise.resolve().then(fn)}},window:{localStorage:{getItem:()=>raw,setItem:(_,value)=>{raw=value;}}}};
 const modules={'@/lib/draft-storage':{readPublishedChallenges:()=>published?[{id:'one',publishedAt:now,taskCard:{}}]:[]}};
 const proposals=load('src/lib/proposals.ts',globals,modules);proposals.submitProposal('a','one',{teamName:'Team',solutionIdea:'Idea',plan:'Plan',timeline:'Week',prototypeLink:''});const before=raw;published=false;await assert.rejects(proposals.decideProposal('a','accepted'));assert.equal(raw,before);
 const noLocks=load('src/lib/proposals.ts',{window:globals.window},modules);await assert.rejects(noLocks.decideProposal('a','rejected'));assert.equal(raw,before);
});

function milestoneFixture() {
 const data=new Map();let blocked=false;let queue=Promise.resolve();
 const globals={navigator:{locks:{request:(_,fn)=>{const next=queue.then(fn);queue=next.catch(()=>{});return next;}}},window:{localStorage:{getItem:key=>data.get(key)??null,setItem:(key,value)=>{if(blocked)throw Error('Full');data.set(key,value);}}}};
 const cards=load('src/lib/task-card.ts');const storage=load('src/lib/draft-storage.ts',globals,{'@/lib/clarification':validation,'@/lib/task-card':cards});
 const proposals=load('src/lib/proposals.ts',globals,{'@/lib/draft-storage':storage});
 const modules={'@/lib/proposals':proposals,'@/lib/draft-storage':storage};
 const milestones=load('src/lib/milestones.ts',globals,modules);
 return {data,globals,cards,storage,proposals,modules,milestones,setBlocked:value=>{blocked=value;}};
}

test('full fixture flow: draft, clarification answers, improved card, publication, acceptance, confirmed milestones and reload',async()=>{
 const {data,globals,cards,storage,proposals,modules,milestones}=milestoneFixture();
 const scoring=load('src/lib/readiness.ts');const now=new Date().toISOString();
 let draft={id:'milestone-flow',draftDescription:description,status:'draft',createdAt:now,updatedAt:now,taskCard:{},clarificationQuestions:[]};
 storage.saveDraft(draft);
 const response=await route(async()=>provider()).POST(request());
 const questions=(await response.json()).questions.map((q,index)=>({...q,answer:index===0?'Students and staff':'Fixture business answer'}));
 draft=storage.saveDraft({...draft,clarificationQuestions:questions})[0];
 draft=storage.saveDraft(cards.createTaskCard(draft,{[questions[0].id]:'users'}))[0];
 const beforeScore=scoring.calculateReadiness(draft.taskCard).score;
 draft=storage.saveDraft({...draft,taskCard:{...draft.taskCard,expectedResult:'Test queue display',successCriteria:'Reduce waiting by two minutes'}})[0];
 assert.ok(scoring.calculateReadiness(draft.taskCard).score>beforeScore);
 draft=storage.saveDraft(cards.confirmTaskCard(draft))[0];storage.publishChallenge(draft);
 const input={teamName:'Fixture team',solutionIdea:'Display',plan:'Test it',timeline:'Week',prototypeLink:''};
 for(const id of ['accepted','pending','rejected']) proposals.submitProposal(id,draft.id,input);
 assert.equal(milestones.readMilestones().length,0);
 await proposals.decideProposal('accepted','accepted');await proposals.decideProposal('rejected','rejected');
 assert.equal(milestones.readMilestones().length,0); // Acceptance alone awards nothing.
 for(const id of ['pending','rejected','missing']) await assert.rejects(milestones.confirmMilestone('bad-'+id,id,'Test complete'));
 const publicationBefore=data.get('ai-sana.challenge-drafts.v1');const decisionsBefore=data.get('ai-sana.team-proposals.v1');
 const results=await Promise.all([milestones.confirmMilestone('first','accepted','  Prototype tested.  '),milestones.confirmMilestone('first','accepted','  Prototype tested.  ')]);
 assert.equal(results[1].length,1);assert.equal(results[1][0].points,10);assert.equal(results[1][0].description,'  Prototype tested.  ');
 const date=results[0][0].confirmedAt;assert.ok(date);assert.equal(results[1][0].confirmedAt,date);
 await milestones.confirmMilestone('second','accepted','Results delivered.');
 const restored=load('src/lib/milestones.ts',globals,modules).readMilestones();
 assert.equal(restored.length,2);assert.equal(restored.reduce((sum,item)=>sum+item.points,0),20);
 assert.equal(restored.every(item=>item.acceptedProposalId==='accepted' && item.challengeId===draft.id && item.confirmedBy==='Business user'),true);
 for(const id of ['pending','rejected']) assert.equal(restored.filter(item=>item.acceptedProposalId===id).length,0);
 assert.equal(data.get('ai-sana.challenge-drafts.v1'),publicationBefore);assert.equal(data.get('ai-sana.team-proposals.v1'),decisionsBefore);
 await assert.rejects(milestones.confirmMilestone('first','accepted','Different result'));
});

test('milestone validation, failed writes, missing references and corrupt storage never award or overwrite',async()=>{
 const {data,globals,cards,storage,proposals,modules,milestones,setBlocked}=milestoneFixture();
 const now=new Date().toISOString();let draft={id:'guard',draftDescription:'Fixture',status:'draft',createdAt:now,updatedAt:now,taskCard:{},taskCardCreatedAt:now,clarificationQuestions:[]};
 storage.saveDraft(draft);draft=storage.saveDraft(cards.confirmTaskCard(draft))[0];storage.publishChallenge(draft);
 proposals.submitProposal('accepted','guard',{teamName:'Team',solutionIdea:'Idea',plan:'Plan',timeline:'Week',prototypeLink:''});await proposals.decideProposal('accepted','accepted');
 for(const value of ['  ','x'.repeat(1001)]) await assert.rejects(milestones.confirmMilestone('invalid','accepted',value));
 setBlocked(true);await assert.rejects(milestones.confirmMilestone('one','accepted','Completed'));assert.equal(data.has('ai-sana.project-milestones.v1'),false);setBlocked(false);
 const saved=await milestones.confirmMilestone('one','accepted','Completed');const raw=data.get('ai-sana.project-milestones.v1');
 const noLocks=load('src/lib/milestones.ts',{window:globals.window},modules);await assert.rejects(noLocks.confirmMilestone('two','accepted','Done'));
 for(const invalid of ['{bad','{}',JSON.stringify([...saved,saved[0]]),JSON.stringify([{...saved[0],points:999}]),JSON.stringify([{...saved[0],confirmedAt:'invalid'}]),JSON.stringify([{...saved[0],acceptedProposalId:'missing'}])]) {
   data.set('ai-sana.project-milestones.v1',invalid);assert.throws(()=>milestones.readMilestones());await assert.rejects(milestones.confirmMilestone('two','accepted','Done'));assert.equal(data.get('ai-sana.project-milestones.v1'),invalid);
 }
 data.set('ai-sana.project-milestones.v1',raw);data.delete('ai-sana.challenge-drafts.v1');assert.throws(()=>milestones.readMilestones());await assert.rejects(milestones.confirmMilestone('two','accepted','Done'));assert.equal(data.get('ai-sana.project-milestones.v1'),raw);
});
