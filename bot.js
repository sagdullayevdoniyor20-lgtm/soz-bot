import { join } from 'node:path';
import { bazaniOch } from './baza.js';
import { joriyDars, VAQTLAR } from './jadval.js';
import { sozlarniYukla } from './sozlar.js';
import { TelegramXatosi, telegramMijozi } from './telegram.js';
import { darsniYubor } from './yuborish.js';

const TEKSHIRISH_ORALIGI_MS = 30_000;

function sozlamalarniOl() {
  try {
    process.loadEnvFile(join(import.meta.dirname, '.env'));
  } catch (xato) {
    if (xato.code !== 'ENOENT') throw xato;
  }
  const token = process.env.BOT_TOKEN?.trim();
  const kanal = process.env.KANAL_ID?.trim();
  const admin = process.env.ADMIN_ID?.trim() || undefined;
  if (!token || !kanal) {
    console.error('.env faylida BOT_TOKEN va KANAL_ID bo\'lishi kerak. Namuna: .env.example');
    process.exit(1);
  }
  return { token, kanal, admin };
}

function kutish(ms, signal) {
  return new Promise((tugadi) => {
    const taymer = setTimeout(tugadi, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(taymer);
      tugadi();
    }, { once: true });
  });
}

const { token, kanal, admin } = sozlamalarniOl();
const telegram = telegramMijozi(token);
const toxtatish = new AbortController();
let sozlar = sozlarniYukla();

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => toxtatish.abort());
}

// So'zlar har bir dars oldidan qayta o'qiladi: qo'shilgan so'zlar botni to'xtatmasdan olinadi.
// Fayl buzilgan bo'lsa, oldingi ro'yxat bilan davom etiladi.
function sozlarniYangila() {
  try {
    sozlar = sozlarniYukla();
  } catch (xato) {
    console.error(`So'zlar fayli o'qilmadi, oldingi ro'yxat ishlatiladi: ${xato.message}`);
  }
  return sozlar;
}

async function tekshir() {
  try {
    await telegram.botniOl();
  } catch (xato) {
    if (xato instanceof TelegramXatosi && xato.kod === 401) {
      console.error("Token noto'g'ri. .env faylidagi BOT_TOKEN ni tekshiring.");
      process.exit(1);
    }
    throw xato;
  }
  try {
    const chat = await telegram.chatniOl(kanal);
    console.log(`Kanal: ${chat.title ?? kanal}`);
  } catch (xato) {
    if (xato instanceof TelegramXatosi) {
      console.error(`Kanal topilmadi (${xato.message}). KANAL_ID ni tekshiring va botni kanalga admin qiling.`);
      process.exit(1);
    }
    throw xato;
  }
  if (!admin) {
    console.warn("ADMIN_ID ko'rsatilmagan: so'zlar tugaganda sizga xabar kelmaydi. Sozlash: npm run admin-id");
    return;
  }
  try {
    await telegram.chatniOl(admin);
    console.log("So'zlar tugashi haqidagi xabarlar ADMIN_ID ga yuboriladi.");
  } catch (xato) {
    if (!(xato instanceof TelegramXatosi)) throw xato;
    console.warn(`ADMIN_ID ga yozib bo'lmaydi (${xato.message}). Botga Telegramda /start bosing.`);
  }
}

async function ishlat() {
  await tekshir();
  const baza = bazaniOch(join(import.meta.dirname, 'soz.db'));
  console.log(`So'z bot ishga tushdi: ${sozlar.length} ta so'z, darslar ${VAQTLAR.join(' va ')} da (Toshkent). To'xtatish: Ctrl+C.`);

  while (!toxtatish.signal.aborted) {
    const dars = joriyDars(new Date());
    if (dars && !baza.darsniOl(dars.sana, dars.vaqt)?.tugadi) {
      try {
        const yuborildi = await darsniYubor({
          baza, telegram, kanal, admin, sozlar: sozlarniYangila(), ...dars, signal: toxtatish.signal,
        });
        if (yuborildi) console.log(`${dars.sana} ${dars.vaqt}: dars yuborildi`);
      } catch (xato) {
        // Keyingi tekshiruvda qolgan joyidan davom etadi.
        console.error(`${dars.sana} ${dars.vaqt}: yuborishda xato — ${xato.message}`);
      }
    }
    await kutish(TEKSHIRISH_ORALIGI_MS, toxtatish.signal);
  }

  baza.yop();
  console.log("Bot to'xtadi.");
}

ishlat().catch((xato) => {
  console.error(xato.message);
  process.exit(1);
});
