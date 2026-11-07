// GitHub Actions uchun kirish nuqtasi: vaqti kelgan darsni yuboradi va chiqadi.
// Holat (qaysi so'zlar yuborilgani) holat/darslar.db da saqlanadi; workflow uni repozitoriyga commit qiladi.
// Sozlamalar muhit o'zgaruvchilaridan (GitHub Secrets) yoki .env dan olinadi.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { bazaniOch } from './baza.js';
import { sozlarniYukla } from './sozlar.js';
import { telegramMijozi } from './telegram.js';
import { vaqtiKelganDarsniYubor } from './yuborish.js';

const HOLAT_PAPKASI = join(import.meta.dirname, 'holat');

try {
  process.loadEnvFile(join(import.meta.dirname, '.env'));
} catch (xato) {
  if (xato.code !== 'ENOENT') throw xato;
}
const token = process.env.BOT_TOKEN?.trim();
const kanal = process.env.KANAL_ID?.trim();
const admin = process.env.ADMIN_ID?.trim() || undefined;
if (!token || !kanal) {
  console.error("BOT_TOKEN va KANAL_ID topilmadi. GitHub'da: Settings → Secrets and variables → Actions.");
  process.exit(1);
}

mkdirSync(HOLAT_PAPKASI, { recursive: true });
const baza = bazaniOch(join(HOLAT_PAPKASI, 'darslar.db'));
try {
  const natija = await vaqtiKelganDarsniYubor({
    baza, telegram: telegramMijozi(token), kanal, admin, sozlar: sozlarniYukla(),
  });
  if (natija.holat === 'vaqt_emas') console.log('Hozir dars vaqti emas (08:00–09:59 yoki 20:00–21:59, Toshkent).');
  if (natija.holat === 'yuborilgan') console.log(`${natija.sana} ${natija.vaqt}: dars avvalroq yuborilgan.`);
  if (natija.holat === 'yuborildi') console.log(`${natija.sana} ${natija.vaqt}: dars yuborildi.`);
} catch (xato) {
  // Yarim yo'lda to'xtasa, holat saqlanadi va keyingi urinish qolgan joyidan davom etadi.
  console.error(`Yuborishda xato: ${xato.message}`);
  process.exitCode = 1;
} finally {
  baza.yop();
}
