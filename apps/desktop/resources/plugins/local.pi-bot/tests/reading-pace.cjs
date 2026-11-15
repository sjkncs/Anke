const {test}=require('node:test'),assert=require('node:assert/strict');
test('pace controls streamed and completed text without mutating authoritative lines',async()=>{
 const {createReadingPace,paceValue}=await import('../renderer/reading-pace.mjs');let now=0,rate=20,prompts=0;
 const pace=createReadingPace({now:()=>now,speed:()=>rate,recommend:()=>prompts++});
 const live={id:'reply',jobId:'task',text:'字'.repeat(200),progress:true};
 assert.equal(pace.project([live])[0].text,'');now=1000;assert.equal(pace.project([live])[0].text.length,20);
 const done={...live,progress:false};assert.equal(pace.project([done])[0].text.length,20);assert.equal(prompts,1);assert.equal(done.text.length,200);assert.equal(pace.pending(),true);
 rate=0;assert.equal(pace.project([done])[0].text.length,200);assert.equal(pace.pending(),false);
 assert.equal(paceValue(null),40);assert.equal(paceValue('0'),0);assert.equal(paceValue('bad'),40);
 const history={id:'old',jobId:'old',text:'old result',progress:false};assert.equal(pace.project([history])[0].text,'old result');
 pace.clear();assert.equal(pace.pending(),false);
});

test('hidden chat buffers stop repainting and resume when selected again',async()=>{
 const {createReadingPace}=await import('../renderer/reading-pace.mjs');let now=0;
 const pace=createReadingPace({now:()=>now,speed:()=>20});
 const live={id:'a',jobId:'task',text:'字'.repeat(100),progress:true};
 pace.project([live]);assert.equal(pace.pending(),true);
 pace.project([{id:'other',text:'history'}]);assert.equal(pace.pending(),false);
 now=1000;assert.equal(pace.project([live])[0].text.length,20);assert.equal(pace.pending(),true);
});

test('failures and cancellation appear immediately and clear pending display',async()=>{
 const {createReadingPace}=await import('../renderer/reading-pace.mjs');
 for(const status of ['failed','error','needs_review','aborted','cancelled']){
  const pace=createReadingPace({now:()=>0,speed:()=>20});
  pace.project([{id:'a',jobId:'task',text:'字'.repeat(100),progress:true}]);
  const stopped={id:'a',jobId:'task',text:'已中止',progress:false,status};
  assert.deepEqual(pace.project([stopped])[0],stopped);assert.equal(pace.pending(),false);
 }
});

test('replacement text resets the buffer and surrogate pairs remain intact',async()=>{
 const {createReadingPace}=await import('../renderer/reading-pace.mjs');let now=0;
 const pace=createReadingPace({now:()=>now,speed:()=>20});
 const live={id:'a',jobId:'task',text:'😀'.repeat(100),progress:true};
 pace.project([live]);now=1000;assert.equal(Array.from(pace.project([live])[0].text).length,20);
 assert.equal(pace.project([{...live,text:'改'.repeat(100)}])[0].text,'');
 now=2000;assert.equal(pace.project([{...live,text:'改'.repeat(100)}])[0].text,'改'.repeat(20));
});
