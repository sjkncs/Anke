import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
test('Windows packaging retains Anke identity and the multi-resolution house icon',()=>{
  assert.equal(pkg.build.appId,'local.anke.agent');
  assert.equal(pkg.build.productName,'Anke Agent');
  assert.equal(pkg.build.win.executableName,'Anke Agent');
  assert.equal(pkg.build.nsis.shortcutName,'Anke Agent');
  assert.equal(pkg.build.win.icon,'build/icon.ico');
  assert.equal(pkg.build.nsis.installerIcon,'build/icon.ico');
  assert.equal(pkg.build.nsis.uninstallerIcon,'build/icon.ico');
  for(const target of [pkg.build.win,pkg.build.nsis,pkg.build.portable])assert.match(target.artifactName,/^Anke-Agent-/);
  assert.ok(pkg.build.win.extraResources.some(r=>r.from==='build/icon.ico'&&r.to==='app-icon.ico'));
  const icon=readFileSync(new URL('../build/icon.ico',import.meta.url));
  assert.equal(icon.readUInt16LE(2),1);
  const count=icon.readUInt16LE(4);assert.equal(count,9);
  const sizes=[];
  for(let i=0;i<count;i++){const entry=6+i*16;sizes.push(icon[entry]||256);assert.ok(icon.readUInt32LE(entry+12)+icon.readUInt32LE(entry+8)<=icon.length);}
  assert.deepEqual(sizes,[16,20,24,32,40,48,64,128,256]);
});
