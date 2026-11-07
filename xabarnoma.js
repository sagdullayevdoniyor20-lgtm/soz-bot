import { VAQTLAR } from './jadval.js';

// Yangi so'zlar shu sondan kamaysa, oldindan ogohlantiriladi (60 ta = 3 kun).
export const OGOHLANTIRISH_CHEGARASI = 60;
const KUNIGA_SOZ = 20;

const QOSHISH_YOLI =
  "Yangi so'z qo'shish uchun sozlar/a2.json, b1.json yoki b2.json fayliga qator qo'shing. " +
  'Bot ularni keyingi darsda o\'zi oladi, qayta ishga tushirish shart emas.';

// Dars yuborilgach adminga (sizning Telegramingizga) boradigan xabar yoki null.
// yangilar: shu darsdagi yangi so'zlar soni; qolgan: darsdan keyin hali yuborilmagan so'zlar soni.
export function adminXabari({ yangilar, qolgan, jami, tartib, vaqt }) {
  const oldin = qolgan + yangilar;

  if (oldin > 0 && qolgan === 0) {
    return [
      "📭 So'z bot: yangi so'zlar tugadi.",
      `${tartib + 1}-dars bilan bazadagi ${jami} ta so'zning hammasi kanalga yuborildi.`,
      "Yangi so'z qo'shilmaguncha keyingi darslarda eng avval o'tilgan so'zlar takrorlanadi.",
      '',
      QOSHISH_YOLI,
    ].join('\n');
  }

  if (oldin > OGOHLANTIRISH_CHEGARASI && qolgan <= OGOHLANTIRISH_CHEGARASI) {
    const kun = Math.ceil(qolgan / KUNIGA_SOZ);
    return [
      "⚠️ So'z bot: yangi so'zlar tugab qolyapti.",
      `${tartib + 1}-dars yuborildi. Yana ${qolgan} ta yangi so'z qoldi, bu taxminan ${kun} kunga yetadi.`,
      '',
      QOSHISH_YOLI,
    ].join('\n');
  }

  // Takrorlash davrida har kuni ertalabki darsdan keyin bitta eslatma.
  if (oldin === 0 && vaqt === VAQTLAR[0]) {
    return [
      "🔁 So'z bot: yangi so'z hali ham yo'q, bugungi darslar takrorlashdan iborat.",
      '',
      QOSHISH_YOLI,
    ].join('\n');
  }

  return null;
}
