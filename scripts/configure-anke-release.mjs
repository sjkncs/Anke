import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// Local maintainer operation only. Never invoked by renderer or downloaded news.
const repository = process.argv[2];
if (!repository || !/^[-\w]+\/[-.\w]+$/.test(repository)) {
  throw new Error('Usage: node scripts/configure-anke-release.mjs OWNER/REPOSITORY');
}
const root = fileURLToPath(new URL('../', import.meta.url));
const packagePath = resolve(root, 'apps/desktop/package.json');
const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
const [owner, repo] = repository.split('/');
pkg.build.publish = [{ provider: 'github', owner, repo }];
writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
writeFileSync(resolve(root, 'apps/desktop/resources/plugins/local.pi-bot/anke-release.json'),
  JSON.stringify({ repository, currentVersion: pkg.version, assetPrefix: 'Anke-Agent-Setup-' }, null, 2) + '\n');
writeFileSync(resolve(root, 'apps/desktop/resources/app-update.yml'),
  `provider: github\nowner: ${owner}\nrepo: ${repo}\nupdaterCacheDirName: anke-agent-updater\n`);
console.log(`Configured local release metadata for ${repository}. No release was published.`);
