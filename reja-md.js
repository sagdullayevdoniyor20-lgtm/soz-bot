// REJA.md ni reja.json dan qayta yaratadi: node reja-md.js
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { rejaMarkdown, rejaniYukla } from './reja.js';

writeFileSync(join(import.meta.dirname, 'REJA.md'), rejaMarkdown(rejaniYukla()));
console.log('REJA.md yangilandi.');
