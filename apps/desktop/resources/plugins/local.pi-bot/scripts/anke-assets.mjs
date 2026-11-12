import { writeFileSync } from 'node:fs';
import { ankeCharacterMarkup } from '../renderer/anke-character.mjs';
writeFileSync(new URL('../icon.svg', import.meta.url), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${ankeCharacterMarkup()}</svg>`);
