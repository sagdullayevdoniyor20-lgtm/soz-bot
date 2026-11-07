// Har kuni 10:00 da (Toshkent) kanalga AQSh yoki Buyuk Britaniya haqida rasm yuboradi.
// Rasm Wikimedia Commons'dan (Wikipedia maqolasi orqali) olinadi, matni joylar.json dan (inglizcha + o'zbekcha).
//   node rasm.js            → vaqti kelgan bo'lsa (10:00–11:59) navbatdagi joyni kanalga (GitHub Actions)
//   node rasm.js sinov      → hozir ADMIN_ID ga; navbatga tegmaydi
//   node rasm.js kanal      → hozir kanalga; navbatga tegmaydi
//   node rasm.js tekshir    → Telegram'siz: har bir joy uchun rasm topilishini tekshiradi
// Navbat holat/rasm.json da saqlanadi; workflow uni repozitoriyga commit qiladi.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { joyRasmi } from './commons.js';
import { joriyDars } from './jadval.js';
import { joylarniYukla, navbatdagiJoy, RASM_VAQTI, rasmMatni } from './joylar.js';
import { telegramMijozi } from './telegram.js';

const HOLAT_PAPKASI = join(import.meta.dirname, 'holat');
const HOLAT_FAYLI = join(HOLAT_PAPKASI, 'rasm.json');
const rejim = process.argv[2] ?? 'jadval';
const joylar = joylarniYukla();

if (rejim === 'tekshir') {
  let xatolar = 0;
  for (const joy of joylar) {
    try {
      const r = await joyRasmi(joy);
      console.log(`✅ ${joy.nomi} → ${r.sahifa} (${r.nechtadan} ta rasmdan, ${Math.round(r.rasm.length / 1024)} KB)`);
    } catch (xato) {
      xatolar++;
      console.log(`❌ ${joy.nomi} → ${xato.message}`);
    }
    await new Promise((t) => setTimeout(t, 1500)); // Commons so'rovlar chegarasi
  }
  process.exit(xatolar ? 1 : 0);
}

try {
  process.loadEnvFile(join(import.meta.dirname, '.env'));
} catch (xato) {
  if (xato.code !== 'ENOENT') throw xato;
}
const token = process.env.BOT_TOKEN?.trim();
const kanal = process.env.KANAL_ID?.trim();
const admin = process.env.ADMIN_ID?.trim();
const qayerga = rejim === 'sinov' ? admin : kanal;
if (!token || !qayerga) {
  console.error(rejim === 'sinov' ? 'BOT_TOKEN yoki ADMIN_ID topilmadi.' : 'BOT_TOKEN yoki KANAL_ID topilmadi.');
  process.exit(1);
}

let holat = {};
try {
  holat = JSON.parse(readFileSync(HOLAT_FAYLI, 'utf8'));
} catch (xato) {
  if (xato.code !== 'ENOENT') throw xato;
}

const dars = joriyDars(new Date(), [RASM_VAQTI]);
if (rejim === 'jadval') {
  if (!dars) {
    console.log(`Hozir rasm vaqti emas (${RASM_VAQTI}–11:59, Toshkent).`);
    process.exit(0);
  }
  if (holat.oxirgiSana === dars.sana) {
    console.log(`${dars.sana}: rasm avvalroq yuborilgan.`);
    process.exit(0);
  }
}

const { indeks, aylana, joy, keyingi, keyingiAylana } = navbatdagiJoy(holat, joylar);
try {
  const rasm = await joyRasmi(joy);
  await telegramMijozi(token).rasmYubor(qayerga, rasm.rasm, rasmMatni(joy, rasm, aylana));
  console.log(`${indeks + 1}. ${joy.nomi} (${(aylana % joy.matnlar.length) + 1}-matn) yuborildi: ${rasm.sahifa}`);
  if (rejim === 'jadval') {
    mkdirSync(HOLAT_PAPKASI, { recursive: true });
    writeFileSync(HOLAT_FAYLI, JSON.stringify({ keyingi, aylana: keyingiAylana, oxirgiSana: dars.sana }, null, 2) + '\n');
  }
} catch (xato) {
  console.error(`Rasm yuborishda xato: ${xato.message}`);
  process.exitCode = 1;
}
