const {test}=require('node:test');
const assert=require('node:assert/strict');
test('Anke house is the default and existing explicit avatars survive',async()=>{
  const {MAIN_LOOK,lookOf,characterMarkup,hasShape}=await import('../renderer/upstream/characters.mjs');
  assert.equal(MAIN_LOOK.shape,'anke-house');
  assert.equal(lookOf({id:'new-member'}).shape,'anke-house');
  assert.equal(lookOf({avatar:{shape:'pi-fox',image:'data:image/png;base64,YQ=='}}).shape,'pi-fox');
  assert.equal(lookOf({avatar:{image:'data:image/png;base64,YQ=='}}).image,'data:image/png;base64,YQ==');
  assert.equal(hasShape('anke-house'),true);
  assert.match(characterMarkup(MAIN_LOOK.shape,MAIN_LOOK.color),/anke-bot/);
  assert.match(characterMarkup(MAIN_LOOK.shape,MAIN_LOOK.color),/bt-gaze/);
  assert.equal(require('../manifest.json').name,'Anke Bot');
});
