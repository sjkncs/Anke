import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

test('release configuration synchronizes all local targets without publishing', () => {
  const root = mkdtempSync(join(tmpdir(), 'anke-release-test-'));
  try {
    mkdirSync(join(root, 'scripts'), { recursive: true });
    mkdirSync(join(root, 'apps/desktop/resources/plugins/local.pi-bot'), { recursive: true });
    copyFileSync(new URL('../../../scripts/configure-anke-release.mjs', import.meta.url), join(root, 'scripts/configure-anke-release.mjs'));
    writeFileSync(join(root, 'apps/desktop/package.json'), JSON.stringify({ version:'1.2.3',build:{publish:[]} }));
    const script=join(root, 'scripts/configure-anke-release.mjs');
    const bad=spawnSync(process.execPath,[script,'https://evil.test/repo'],{encoding:'utf8'});
    assert.notEqual(bad.status,0);
    const result=spawnSync(process.execPath,[script,'fixture/Anke'],{encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);
    assert.match(result.stdout,/No release was published/);
    const read=p=>JSON.parse(readFileSync(join(root,p),'utf8'));
    assert.deepEqual(read('apps/desktop/package.json').build.publish,[{provider:'github',owner:'fixture',repo:'Anke'}]);
    assert.deepEqual(read('apps/desktop/resources/plugins/local.pi-bot/anke-release.json'),{repository:'fixture/Anke',currentVersion:'1.2.3',assetPrefix:'Anke-Agent-Setup-'});
    assert.match(readFileSync(join(root,'apps/desktop/resources/app-update.yml'),'utf8'),/owner: fixture\nrepo: Anke/);
  } finally { rmSync(root,{recursive:true,force:true}); }
});
