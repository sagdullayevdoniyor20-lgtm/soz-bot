import assert from 'node:assert/strict';
import { test } from 'node:test';
import { adminXabari, OGOHLANTIRISH_CHEGARASI } from './xabarnoma.js';

const xabar = (qolgan) => ({ jami: 600, tartib: 59, vaqt: '20:00', ...qolgan });

test("oxirgi yangi so'zlar yuborilganda 'tugadi' xabari", () => {
  const matn = adminXabari(xabar({ yangilar: 10, qolgan: 0 }));
  assert.match(matn, /^📭 So'z bot: yangi so'zlar tugadi\./);
  assert.match(matn, /60-dars bilan bazadagi 600 ta so'zning hammasi/);
  assert.match(matn, /sozlar\/a2\.json/);
  // Qisman yangi bo'lgan oxirgi dars ham hisoblanadi.
  assert.match(adminXabari(xabar({ yangilar: 4, qolgan: 0 })), /tugadi/);
});

test("chegaradan o'tilganda bir marta oldindan ogohlantiradi", () => {
  const matn = adminXabari(xabar({ yangilar: 10, qolgan: OGOHLANTIRISH_CHEGARASI }));
  assert.match(matn, /^⚠️ So'z bot: yangi so'zlar tugab qolyapti\./);
  assert.match(matn, /Yana 60 ta yangi so'z qoldi, bu taxminan 3 kunga yetadi\./);
  // Keyingi darslarda takrorlanmaydi.
  assert.equal(adminXabari(xabar({ yangilar: 10, qolgan: OGOHLANTIRISH_CHEGARASI - 10 })), null);
});

test("takrorlash davrida faqat ertalabki darsdan keyin eslatadi", () => {
  assert.match(adminXabari(xabar({ yangilar: 0, qolgan: 0, vaqt: '08:00' })), /^🔁/);
  assert.equal(adminXabari(xabar({ yangilar: 0, qolgan: 0, vaqt: '20:00' })), null);
});

test("so'zlar yetarli bo'lsa xabar yo'q", () => {
  assert.equal(adminXabari(xabar({ yangilar: 10, qolgan: 500 })), null);
});
