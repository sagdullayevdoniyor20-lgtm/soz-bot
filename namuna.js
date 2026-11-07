// Tarmoqqa chiqmasdan bitta darsni ekranga chiqaradi: `npm run namuna -- 3` (3-dars).
import { darsSavollari, darsSozlari, sozlarMatni } from './savollar.js';
import { sozlarniYukla } from './sozlar.js';

const raqam = Number(process.argv[2] ?? 1);
if (!Number.isInteger(raqam) || raqam < 1) {
  console.error('Dars raqami musbat butun son bo\'lishi kerak.');
  process.exit(1);
}

const sozlar = sozlarniYukla();
const dars = darsSozlari(sozlar, raqam - 1);
console.log(sozlarMatni(dars, raqam - 1, '08:00'));
for (const [i, s] of darsSavollari(dars, sozlar).entries()) {
  console.log(`\n— ${i + 1}-test —\n${s.savol}`);
  s.variantlar.forEach((v, j) => console.log(`  ${j === s.togriIndeks ? '✔' : ' '} ${v}`));
  console.log(`  izoh: ${s.izoh}`);
}
