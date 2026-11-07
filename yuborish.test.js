import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bazaniOch } from './baza.js';
import { sozlarniYukla } from './sozlar.js';
import { darsniYubor, vaqtiKelganDarsniYubor } from './yuborish.js';

const sozlar = sozlarniYukla();

function soxtaTelegram({ xatoQadamda } = {}) {
  const yuborilgan = [];
  const yubor = (tur, chat, malumot) => {
    if (yuborilgan.length + 1 === xatoQadamda) {
      xatoQadamda = undefined;
      throw new Error('tarmoq uzildi');
    }
    yuborilgan.push({ tur, chat, malumot });
  };
  return {
    yuborilgan,
    xabarYubor: async (chat, matn) => yubor('xabar', chat, matn),
    testYubor: async (chat, savol) => yubor('test', chat, savol),
  };
}

const umumiy = (baza, telegram, qolgan) => ({
  baza, telegram, kanal: '@kanal', sozlar, pauza: async () => {}, ...qolgan,
});

test("dars: avval so'zlar ro'yxati, keyin 10 ta test", async () => {
  const baza = bazaniOch(':memory:');
  const telegram = soxtaTelegram();
  assert.equal(await darsniYubor(umumiy(baza, telegram, { sana: '2026-11-07', vaqt: '08:00' })), true);

  assert.equal(telegram.yuborilgan.length, 11);
  assert.equal(telegram.yuborilgan[0].tur, 'xabar');
  assert.match(telegram.yuborilgan[0].malumot, /^📚 1-dars · A2/);
  assert.match(telegram.yuborilgan[0].malumot, new RegExp(`1\\. ${sozlar[0].soz} `));
  assert.ok(telegram.yuborilgan.slice(1).every((x) => x.tur === 'test' && x.chat === '@kanal'));
});

test('bir dars ikki marta yuborilmaydi', async () => {
  const baza = bazaniOch(':memory:');
  const telegram = soxtaTelegram();
  const sozlama = umumiy(baza, telegram, { sana: '2026-11-07', vaqt: '08:00' });
  await darsniYubor(sozlama);
  assert.equal(await darsniYubor(sozlama), false);
  assert.equal(telegram.yuborilgan.length, 11);
});

test('keyingi dars keyingi 10 ta so\'zdan boshlanadi', async () => {
  const baza = bazaniOch(':memory:');
  const telegram = soxtaTelegram();
  await darsniYubor(umumiy(baza, telegram, { sana: '2026-11-07', vaqt: '08:00' }));
  await darsniYubor(umumiy(baza, telegram, { sana: '2026-11-07', vaqt: '20:00' }));

  const ikkinchi = telegram.yuborilgan[11].malumot;
  assert.match(ikkinchi, /^📚 2-dars/);
  assert.match(ikkinchi, /Kechki/);
  assert.match(ikkinchi, new RegExp(`1\\. ${sozlar[10].soz} `));
});

test("xato bo'lsa, qayta urinishda qolgan joyidan davom etadi", async () => {
  const baza = bazaniOch(':memory:');
  const telegram = soxtaTelegram({ xatoQadamda: 5 });
  const sozlama = umumiy(baza, telegram, { sana: '2026-11-07', vaqt: '08:00' });

  await assert.rejects(darsniYubor(sozlama), /tarmoq uzildi/);
  assert.equal(telegram.yuborilgan.length, 4);

  assert.equal(await darsniYubor(sozlama), true);
  assert.equal(telegram.yuborilgan.length, 11);
  assert.equal(telegram.yuborilgan.filter((x) => x.tur === 'xabar').length, 1);
});

test("to'xtatish signali kelsa, yuborish to'xtaydi", async () => {
  const baza = bazaniOch(':memory:');
  const telegram = soxtaTelegram();
  const toxtatish = new AbortController();
  const sozlama = umumiy(baza, telegram, {
    sana: '2026-11-07', vaqt: '08:00', signal: toxtatish.signal, pauza: async () => toxtatish.abort(),
  });
  assert.equal(await darsniYubor(sozlama), false);
  assert.equal(telegram.yuborilgan.length, 1);
  const { tartib, qadam, tugadi } = baza.darsniOl('2026-11-07', '08:00');
  assert.deepEqual({ tartib, qadam, tugadi }, { tartib: 0, qadam: 1, tugadi: 0 });
});

// N ta darsni ketma-ket yuboradi (har biri alohida kunda) va adminga ketgan xabarlarni qaytaradi.
async function darslarniYubor(baza, telegram, sozlar, soni, { boshi = 0, vaqt = '08:00', admin = 777 } = {}) {
  for (let i = boshi; i < boshi + soni; i++) {
    const sana = `2026-12-${String(i + 1).padStart(2, '0')}`;
    await darsniYubor(umumiy(baza, telegram, { sozlar, sana, vaqt, admin }));
  }
  return telegram.yuborilgan.filter((x) => x.chat === admin).map((x) => x.malumot);
}

test("so'zlar tugaganda adminga bir marta xabar boradi, darslar takrorlash bilan davom etadi", async () => {
  const baza = bazaniOch(':memory:');
  const telegram = soxtaTelegram();
  const kichik = sozlar.slice(0, 60); // 6 ta dars

  assert.deepEqual(await darslarniYubor(baza, telegram, kichik, 5), []);
  const xabarlar = await darslarniYubor(baza, telegram, kichik, 1, { boshi: 5, vaqt: '20:00' });
  assert.equal(xabarlar.length, 1);
  assert.match(xabarlar[0], /yangi so'zlar tugadi/);
  assert.match(xabarlar[0], /6-dars bilan bazadagi 60 ta so'zning hammasi/);

  // 7-dars: eng birinchi o'tilgan so'zlar takrorlanadi; ertalab eslatma keladi.
  const yana = await darslarniYubor(baza, telegram, kichik, 1, { boshi: 6 });
  assert.equal(yana.length, 2);
  assert.match(yana[1], /^🔁/);
  const yettinchi = telegram.yuborilgan.filter((x) => x.tur === 'xabar' && x.chat === '@kanal').at(-1).malumot;
  assert.match(yettinchi, /^📚 7-dars/);
  assert.match(yettinchi, new RegExp(`1\\. ${kichik[0].soz} `));
});

test("tugashidan oldin ogohlantiradi", async () => {
  const baza = bazaniOch(':memory:');
  const telegram = soxtaTelegram();
  const xabarlar = await darslarniYubor(baza, telegram, sozlar.slice(0, 80), 2);
  assert.equal(xabarlar.length, 1);
  assert.match(xabarlar[0], /tugab qolyapti/);
  assert.match(xabarlar[0], /Yana 60 ta yangi so'z qoldi/);
});

test("keyin qo'shilgan so'zlar keyingi darsga yangi so'z sifatida tushadi", async () => {
  const baza = bazaniOch(':memory:');
  const telegram = soxtaTelegram();
  await darslarniYubor(baza, telegram, sozlar.slice(0, 60), 6);
  assert.equal(telegram.yuborilgan.filter((x) => x.chat === 777).length, 1);

  // So'zlar fayliga 10 ta yangi so'z qo'shildi.
  const kengaygan = sozlar.slice(0, 70);
  const xabarlar = await darslarniYubor(baza, telegram, kengaygan, 1, { boshi: 6, vaqt: '20:00' });
  const yettinchi = telegram.yuborilgan.filter((x) => x.tur === 'xabar' && x.chat === '@kanal').at(-1).malumot;
  assert.match(yettinchi, new RegExp(`1\\. ${sozlar[60].soz} `));
  assert.match(yettinchi, new RegExp(`10\\. ${sozlar[69].soz} `));
  // Yangi so'zlar ham tugadi: yana bir marta xabar keladi.
  assert.equal(xabarlar.length, 2);
  assert.match(xabarlar[1], /70 ta so'zning hammasi/);
});

test("adminga yuborib bo'lmasa ham dars yakunlanadi", async () => {
  const baza = bazaniOch(':memory:');
  const telegram = soxtaTelegram();
  const asl = telegram.xabarYubor;
  telegram.xabarYubor = async (chat, matn) => {
    if (chat === 777) throw new Error('Forbidden: bot was blocked by the user');
    return asl(chat, matn);
  };
  const loglar = [];
  const kichik = sozlar.slice(0, 10);
  const sozlama = umumiy(baza, telegram, { sozlar: kichik, sana: '2026-12-01', vaqt: '08:00', admin: 777, log: (m) => loglar.push(m) });

  assert.equal(await darsniYubor(sozlama), true);
  assert.equal(await darsniYubor(sozlama), false);
  assert.equal(loglar.length, 1);
  assert.match(loglar[0], /Adminga xabar yuborilmadi/);
});

test('ADMIN_ID bo\'lmasa adminga hech narsa yuborilmaydi', async () => {
  const baza = bazaniOch(':memory:');
  const telegram = soxtaTelegram();
  await darslarniYubor(baza, telegram, sozlar.slice(0, 10), 2, { admin: null });
  assert.ok(telegram.yuborilgan.every((x) => x.chat === '@kanal'));
  assert.equal(telegram.yuborilgan.length, 22);
});

test("bir martalik rejim: dars vaqti bo'lmasa hech narsa yubormaydi", async () => {
  const baza = bazaniOch(':memory:');
  const telegram = soxtaTelegram();
  const natija = await vaqtiKelganDarsniYubor({
    hozir: new Date('2026-11-07T06:00:00Z'), // 11:00 Toshkent
    ...umumiy(baza, telegram),
  });
  assert.deepEqual(natija, { holat: 'vaqt_emas' });
  assert.equal(telegram.yuborilgan.length, 0);
});

test("bir martalik rejim: vaqti kelgan darsni bir marta yuboradi", async () => {
  const baza = bazaniOch(':memory:');
  const telegram = soxtaTelegram();
  const sozlama = { hozir: new Date('2026-11-07T03:07:00Z'), ...umumiy(baza, telegram) }; // 08:07

  assert.deepEqual(await vaqtiKelganDarsniYubor(sozlama), { holat: 'yuborildi', sana: '2026-11-07', vaqt: '08:00' });
  assert.equal(telegram.yuborilgan.length, 11);

  // 08:37 va 09:17 dagi qayta urinishlar takror yubormaydi.
  const keyinroq = { ...sozlama, hozir: new Date('2026-11-07T04:17:00Z') };
  assert.deepEqual(await vaqtiKelganDarsniYubor(keyinroq), { holat: 'yuborilgan', sana: '2026-11-07', vaqt: '08:00' });
  assert.equal(telegram.yuborilgan.length, 11);
});

test("bir martalik rejim: yarim qolgan dars keyingi urinishda tugatiladi", async () => {
  const baza = bazaniOch(':memory:');
  const telegram = soxtaTelegram({ xatoQadamda: 3 });
  const sozlama = { hozir: new Date('2026-11-07T15:07:00Z'), ...umumiy(baza, telegram) }; // 20:07

  await assert.rejects(vaqtiKelganDarsniYubor(sozlama), /tarmoq uzildi/);
  assert.equal(telegram.yuborilgan.length, 2);
  assert.equal((await vaqtiKelganDarsniYubor(sozlama)).holat, 'yuborildi');
  assert.equal(telegram.yuborilgan.length, 11);
});
