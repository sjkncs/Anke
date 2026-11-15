import { readFileSync, writeFileSync } from 'node:fs';
import { SERVICE_ARTWORK } from '../renderer/service-artwork.mjs';
for (const key of ['wealth', 'career']) {
  SERVICE_ARTWORK[key] = 'data:image/png;base64,' + readFileSync(new URL('../renderer/service-icons/' + key + '.png', import.meta.url)).toString('base64');
}
writeFileSync(new URL('../renderer/service-artwork.mjs', import.meta.url), '// Generated from local service-icons PNG artwork.\nexport const SERVICE_ARTWORK=' + JSON.stringify(SERVICE_ARTWORK) + ';\n');
