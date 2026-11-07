import { joriyDars } from './jadval.js';
import { darsSavollari, darsSozlariniTanla, sozlarMatni } from './savollar.js';
import { adminXabari } from './xabarnoma.js';

// Telegram bitta chatga daqiqasiga ~20 xabar ruxsat beradi; 4 soniya oraliq xavfsiz.
export const XABARLAR_ORALIGI_MS = 4_000;

const kutish = (ms) => new Promise((tugadi) => setTimeout(tugadi, ms));

// Bitta darsni (so'zlar xabari + testlar) kanalga yuboradi. `admin` berilgan bo'lsa va so'zlar
// tugab qolayotgan bo'lsa, oxirida adminga ham xabar yuboradi.
// Yangi dars yuborilsa true, dars avvalroq to'liq yuborilgan bo'lsa false qaytaradi.
// Yarim yo'lda xato chiqsa, keyingi chaqiruv qolgan joyidan davom ettiradi.
export async function darsniYubor({
  baza,
  telegram,
  kanal,
  admin,
  sozlar,
  sana,
  vaqt,
  tasodif = Math.random,
  pauza = () => kutish(XABARLAR_ORALIGI_MS),
  signal,
  log = console.error,
}) {
  const yozuv =
    baza.darsniOl(sana, vaqt) ??
    baza.darsniBoshla(sana, vaqt, (tarix) => darsSozlariniTanla(sozlar, tarix).map((s) => s.soz));
  if (yozuv.tugadi) return false;

  const lugat = new Map(sozlar.map((s) => [s.soz, s]));
  const dars = yozuv.sozlar.map((soz) => lugat.get(soz)).filter(Boolean);
  const xabarlar = [
    () => telegram.xabarYubor(kanal, sozlarMatni(dars, yozuv.tartib, vaqt)),
    ...darsSavollari(dars, sozlar, tasodif).map((savol) => () => telegram.testYubor(kanal, savol)),
  ];

  if (admin) {
    const tarix = baza.tarix();
    const matn = adminXabari({
      yangilar: yozuv.sozlar.filter((soz) => tarix.get(soz)?.birinchi === yozuv.tartib).length,
      qolgan: sozlar.filter((s) => !tarix.has(s.soz)).length,
      jami: sozlar.length,
      tartib: yozuv.tartib,
      vaqt,
    });
    if (matn) {
      // Adminga yuborilmasa ham (masalan, botga /start bosilmagan) dars tugagan hisoblanadi.
      xabarlar.push(async () => {
        try {
          await telegram.xabarYubor(admin, matn);
        } catch (xato) {
          log(`Adminga xabar yuborilmadi (ADMIN_ID va botga /start bosilganini tekshiring): ${xato.message}`);
        }
      });
    }
  }

  for (let i = yozuv.qadam; i < xabarlar.length; i++) {
    if (i > yozuv.qadam) await pauza();
    if (signal?.aborted) return false;
    await xabarlar[i]();
    baza.qadamniYoz(sana, vaqt, i + 1, i + 1 === xabarlar.length);
  }
  return true;
}

// Bir martalik ishga tushirish (GitHub Actions) uchun: hozir dars vaqti bo'lsa, darsni yuboradi.
// Qaytaradi: { holat: 'vaqt_emas' | 'yuborilgan' | 'yuborildi', sana?, vaqt? }
export async function vaqtiKelganDarsniYubor({ hozir = new Date(), baza, ...qolgani }) {
  const dars = joriyDars(hozir);
  if (!dars) return { holat: 'vaqt_emas' };
  if (baza.darsniOl(dars.sana, dars.vaqt)?.tugadi) return { holat: 'yuborilgan', ...dars };
  await darsniYubor({ baza, ...qolgani, ...dars });
  return { holat: 'yuborildi', ...dars };
}
