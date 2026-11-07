// Darslar Toshkent vaqti bilan shu soatlarda yuboriladi.
export const VAQTLAR = ['08:00', '20:00'];
// Bot o'chiq bo'lib qolsa, dars shu muddat ichida kechikib yuboriladi; undan keyin o'tkazib yuboriladi.
export const KECHIKISH_DAQIQA = 120;

const formatlovchi = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tashkent',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function toshkentVaqti(sana = new Date()) {
  const q = Object.fromEntries(formatlovchi.formatToParts(sana).map((b) => [b.type, b.value]));
  return { sana: `${q.year}-${q.month}-${q.day}`, daqiqa: Number(q.hour) * 60 + Number(q.minute) };
}

function daqiqaga(vaqt) {
  const [soat, daqiqa] = vaqt.split(':').map(Number);
  return soat * 60 + daqiqa;
}

// Hozir yuborilishi kerak bo'lgan dars ({ sana, vaqt }) yoki null.
export function joriyDars(hozir = new Date(), vaqtlar = VAQTLAR, kechikish = KECHIKISH_DAQIQA) {
  const { sana, daqiqa } = toshkentVaqti(hozir);
  for (const vaqt of vaqtlar) {
    const boshi = daqiqaga(vaqt);
    if (daqiqa >= boshi && daqiqa < boshi + kechikish) {
      return { sana, vaqt };
    }
  }
  return null;
}
