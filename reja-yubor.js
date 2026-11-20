// Kontent reja (reja.json) bo'yicha avtomatik postlar:
//   node reja-yubor.js               → vaqti kelganlarini yuboradi (GitHub Actions, reja.yml)
//   node reja-yubor.js sinov [sana]  → kunning barcha postlari va eslatmasini hozir ADMIN_ID ga; holatga tegmaydi
//   node reja-yubor.js korish [sana] → Telegram'siz: kunning postlarini ekranga chiqaradi
// Yuborilganlar holat/reja.json da saqlanadi; workflow uni repozitoriyga commit qiladi.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { toshkentVaqti } from './jadval.js';
import { kunIshlari, kunniTop, rejaniYukla, vaqtiKelganlar } from './reja.js';
import { telegramMijozi } from './telegram.js';

const HOLAT_PAPKASI = join(import.meta.dirname, 'holat');
const HOLAT_FAYLI = join(HOLAT_PAPKASI, 'reja.json');
const SAQLANADIGAN = 200;
const PAUZA_MS = 4000;

const rejim = process.argv[2] ?? 'jadval';
const { sana: bugun, daqiqa } = toshkentVaqti();
const sana = process.argv[3] ?? bugun;
const kun = kunniTop(rejaniYukla(), sana);

if (!kun) {
  console.log(`${sana}: rejada bu kun yo'q (reja tugagan bo'lishi mumkin, reja.json ni yangilang).`);
  process.exit(0);
}

if (rejim === 'korish') {
  for (const ish of kunIshlari(kun, 'admin')) {
    console.log(`\n=== ${ish.vaqt} → ${ish.qayerga} (${ish.kalit}) ===\n${ish.matn}`);
  }
  process.exit(0);
}

try {
  process.loadEnvFile(join(import.meta.dirname, '.env'));
} catch (xato) {
  if (xato.code !== 'ENOENT') throw xato;
}
const token = process.env.BOT_TOKEN?.trim();
const kanal = process.env.KANAL_ID?.trim();
const admin = process.env.ADMIN_ID?.trim() || undefined;
if (!token || (rejim === 'sinov' ? !admin : !kanal)) {
  console.error(rejim === 'sinov' ? 'BOT_TOKEN yoki ADMIN_ID topilmadi.' : 'BOT_TOKEN yoki KANAL_ID topilmadi.');
  process.exit(1);
}
const telegram = telegramMijozi(token);

let holat = { yuborilgan: [] };
try {
  holat = JSON.parse(readFileSync(HOLAT_FAYLI, 'utf8'));
} catch (xato) {
  if (xato.code !== 'ENOENT') throw xato;
}

const ishlar = rejim === 'sinov'
  ? kunIshlari(kun, admin)
  : vaqtiKelganlar(kunIshlari(kun, admin), daqiqa, holat.yuborilgan);

if (!ishlar.length) {
  console.log(`${sana}: hozir yuboriladigan post yo'q.`);
  process.exit(0);
}

for (const [i, ish] of ishlar.entries()) {
  if (i > 0) await new Promise((t) => setTimeout(t, PAUZA_MS));
  const qayerga = rejim === 'sinov' || ish.qayerga === 'admin' ? admin : kanal;
  try {
    await telegram.xabarYubor(qayerga, ish.matn, { korinish: ish.korinish });
    console.log(`Yuborildi: ${ish.kalit} → ${ish.qayerga}`);
    if (rejim !== 'sinov') {
      holat.yuborilgan = [...holat.yuborilgan, ish.kalit].slice(-SAQLANADIGAN);
      mkdirSync(HOLAT_PAPKASI, { recursive: true });
      writeFileSync(HOLAT_FAYLI, JSON.stringify(holat, null, 2) + '\n');
    }
  } catch (xato) {
    // Adminga eslatma ketmasa ham kanal postlari to'xtamaydi.
    console.error(`Xato (${ish.kalit}): ${xato.message}`);
    if (ish.qayerga !== 'admin') process.exitCode = 1;
  }
}
