// Bitta darsni hozir, jadvalni kutmasdan yuboradi:
//   npm run sinov            → ADMIN_ID ga (shaxsiy chatingizga)
//   npm run sinov -- kanal   → KANAL_ID ga (obunachilar ham ko'radi)
// Vaqtinchalik bazada ishlaydi: haqiqiy soz.db va so'zlar tartibiga tegmaydi.
import { join } from 'node:path';
import { bazaniOch } from './baza.js';
import { toshkentVaqti } from './jadval.js';
import { sozlarniYukla } from './sozlar.js';
import { TelegramXatosi, telegramMijozi } from './telegram.js';
import { darsniYubor } from './yuborish.js';

try {
  process.loadEnvFile(join(import.meta.dirname, '.env'));
} catch (xato) {
  if (xato.code !== 'ENOENT') throw xato;
}
const token = process.env.BOT_TOKEN?.trim();
const kanal = process.env.KANAL_ID?.trim();
const admin = process.env.ADMIN_ID?.trim();
if (!token) {
  console.error(".env faylida BOT_TOKEN yo'q. Namuna: .env.example");
  process.exit(1);
}

const kanalga = process.argv[2] === 'kanal';
const qayerga = kanalga ? kanal : admin;
if (!qayerga) {
  console.error(
    kanalga
      ? ".env faylida KANAL_ID yo'q."
      : "ADMIN_ID yo'q. Botga /start yozing, `npm run admin-id` bilan ID ni topib .env ga qo'shing. " +
          'Yoki kanalga yuborish uchun: npm run sinov -- kanal',
  );
  process.exit(1);
}

console.log(`Sinov darsi ${kanalga ? 'kanalga' : 'sizga (ADMIN_ID)'} yuborilmoqda: 1 ta xabar va 10 ta test, ~45 soniya...`);
try {
  await darsniYubor({
    baza: bazaniOch(':memory:'),
    telegram: telegramMijozi(token),
    kanal: qayerga,
    sozlar: sozlarniYukla(),
    sana: toshkentVaqti().sana,
    vaqt: '08:00',
  });
  console.log("Tayyor. Telegramni tekshiring.");
} catch (xato) {
  console.error(`Yuborilmadi: ${xato.message}`);
  if (xato instanceof TelegramXatosi && (xato.kod === 400 || xato.kod === 403)) {
    console.error(
      kanalga
        ? 'KANAL_ID ni tekshiring va botni kanalga admin qilib qo\'shing.'
        : 'Botga Telegramda /start bosganingizni va ADMIN_ID to\'g\'riligini tekshiring.',
    );
  }
  process.exit(1);
}
