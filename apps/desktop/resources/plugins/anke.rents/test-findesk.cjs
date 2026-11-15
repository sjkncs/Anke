const {test}=require('node:test');
const assert=require('node:assert/strict');
const {findesk}=require('./findesk.cjs');
const {extract,templateText}=require('./sync-findesk-cookbook.cjs');
test('official catalog is bounded and does not claim authorized market delivery',()=>{
 const d=findesk();assert.equal(d.connection,'public_catalog_only');assert.equal(d.authenticatedDataVerified,false);
 assert.ok(d.interfaces.length>0&&d.interfaces.length<=20);assert.ok(d.contractVersion);
 assert.equal(findesk({query:'no-such-capability-xyz'}).interfaces.length,0);
 for(const input of [{query:3},{url:'http://localhost'},null,[]])assert.throws(()=>findesk(input));
});
test('scenario directory selects complete official templates without guessing fields or executing code',()=>{
 const book=findesk({action:'cookbook'});assert.equal(book.scenarios.length,21);assert(book.scenarios.every(s=>!Object.hasOwn(s,'code')));assert.equal(book.templatesExecuted,false);
 const get=id=>findesk({action:'cookbook',query:id}).scenarios[0];
 assert.match(get('macroSeries').code,/function="macro"/);assert.match(get('macroSeries').code,/YOUR_EDB_CODE/);
 assert.match(get('minute5').code,/function="intraday"/);assert.match(get('minute5').code,/Interval:5/);
 assert.match(get('minute1').code,/Interval:1/);assert.match(get('history').code,/coverage_policy="complete_rows"/);
 assert.match(get('options').detail,/503/);assert.match(get('news').code,/\/api\/mcp\/content\/news\/search/);
 assert.match(get('research').code,/\/api\/mcp\/content\/library\/search/);
 assert.equal(findesk({action:'cookbook',query:'unknown-scenario-xyz'}).scenarios.length,0);
 assert.throws(()=>extract('changed source'));assert.throws(()=>templateText('${doNotExecute()}'));
 assert.equal(templateText('a\\\\b'),'a\\b');
});
test('public plans retain policy provenance without inventing account balances or missing pools',()=>{
 const result=findesk({action:'plans'});assert.equal(result.connection,'public_policy_only');assert.equal(result.accountBalance,null);
 assert.equal(result.authenticatedDataVerified,false);assert(result.policyVersion);assert(result.retrievedAt);assert(result.plans.length);
 assert.equal(result.entitlementEndpoint,'GET /api/v1/entitlement');assert(result.constraints.length>=4);
 const trial=result.plans.find(p=>p.plan_tier==='trial');assert(trial);assert.deepEqual(trial.fixed_pools,{});
 for(const input of [{action:'trade'},{action:'plans',token:'secret'},{action:'plans',query:3}])assert.throws(()=>findesk(input));
});
