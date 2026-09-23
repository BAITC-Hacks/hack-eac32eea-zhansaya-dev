import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const code = ts.transpileModule(fs.readFileSync('src/lib/readiness.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const context={exports:{}};vm.runInNewContext(code,context);
const {calculateReadiness,readinessLevel,hasReadinessInformation,readinessCriteria}=context.exports;
const full={title:'Cafeteria queues',context:'The university cafeteria is busy at lunch.',needOrProblem:'Reduce queue waiting times.',users:'Students and staff.',availableDataOrMaterials:'Manual queue timing observations.',constraints:'Complete within four weeks.',expectedResult:'A tested queue-flow prototype.',successCriteria:'Reduce average waiting time by 20%.',businessContact:'Cafeteria manager',communicationFormat:'Weekly email update.'};

test('empty card is Draft, zero, with nine missing weighted fields',()=>{
 const rating=calculateReadiness({});assert.equal(rating.score,0);assert.equal(rating.level,'Draft');assert.equal(rating.missingInformation.length,9);assert.equal(Object.keys(rating.breakdown).length,7);
});
test('partial card gets only explicit field allocations',()=>{
 const rating=calculateReadiness({title:'Title only adds no points',context:full.context,users:full.users,businessContact:full.businessContact});assert.equal(rating.score,25);assert.equal(rating.breakdown.contextAndNeed,10);assert.equal(rating.breakdown.businessCommunication,5);assert.equal(rating.breakdown.users,10);
});
test('full card is 100 Priority; no title or length bonus and no mutation',()=>{
 const before=JSON.stringify(full);const rating=calculateReadiness(full);assert.equal(rating.score,100);assert.equal(rating.level,'Priority');assert.equal(rating.missingInformation.length,0);assert.equal(calculateReadiness({...full,title:''}).score,100);assert.equal(calculateReadiness({...full,context:full.context.repeat(100)}).score,100);assert.equal(JSON.stringify(full),before);
});
test('whitespace, punctuation and normalized placeholder values get no points',()=>{
 for(const value of ['', ' \n\t ', ' Needs information ', 'NEEDS   INFORMATION.', '[TBD]', 'N/A', 'n.a.', 'Not provided','unknown','To be determined','TODO','---','???','...','none']) {
  assert.equal(hasReadinessInformation(value),false,value);
  assert.equal(calculateReadiness(Object.fromEntries(Object.keys(full).map(key=>[key,value]))).score,0,value);
 }
 assert.equal(hasReadinessInformation(' No constraints are known. '),true);
 assert.equal(hasReadinessInformation('No data is available; collect observations.'),true);
});
test('readiness labels follow every threshold including endpoints',()=>{
 for(const [score,level] of [[0,'Draft'],[39,'Draft'],[40,'Working'],[69,'Working'],[70,'Ready'],[89,'Ready'],[90,'Priority'],[100,'Priority']])assert.equal(readinessLevel(score),level);
});
test('all 512 field-presence combinations stay bounded and match their sums',()=>{
 const rules=readinessCriteria.flatMap(c=>c.fields);
 for(let mask=0;mask<2**rules.length;mask++){
  const card={};let expected=0;
  rules.forEach((rule,i)=>{if(mask&(1<<i)){card[rule.field]=full[rule.field];expected+=rule.points;}});
  const rating=calculateReadiness(card);assert.equal(rating.score,expected);assert.ok(rating.score>=0&&rating.score<=100);
 }
});
test('editing a missing data field adds 20, clearing it reverses the change',()=>{
 const card={needOrProblem:full.needOrProblem};const initial=calculateReadiness(card);assert.equal(initial.score,10);
 const improved=calculateReadiness({...card,availableDataOrMaterials:full.availableDataOrMaterials});assert.equal(improved.score-initial.score,20);assert.ok(!improved.missingInformation.includes('Available data/materials'));
 assert.equal(calculateReadiness({...card,availableDataOrMaterials:'Needs information'}).score,10);
});
