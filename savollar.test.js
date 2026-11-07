import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  boshJoyliGap, darsSavollari, darsSozlari, darsSozlariniTanla, gapdagiShakl, ochiqGap, savolTuz, sozlarMatni,
} from './savollar.js';

const yoz = (soz, turkum, gap, daraja = 'A2') => ({
  daraja,
  soz,
  turkum,
  tarjima: `${soz} tarjimasi`,
  birikma: `${soz} birikma`,
  birikmaTarjima: `${soz} birikma tarjimasi`,
  gap,
  gapTarjima: `${soz} gap tarjimasi`,
});

const bank = [
  yoz('lose', 'v', 'She [lost] her keys.'),
  yoz('find', 'v', 'He [found] a coin.'),
  yoz('give', 'v', 'They [gave] me a gift.'),
  yoz('take', 'v', 'I [took] a taxi.'),
  yoz('walk', 'v', 'We [walked] home.'),
  yoz('open', 'v', 'She [opened] the door.'),
  yoz('call', 'v', 'He [called] his mum.'),
  yoz('play', 'v', 'Kids [played] outside.'),
  yoz('cheap', 'adj', 'It was [cheap].'),
  yoz('busy', 'adj', 'I am [busy].'),
  yoz('tired', 'adj', 'He is [tired].'),
  yoz('quiet', 'adj', 'Be [quiet].'),
];

let urug = 1;
const tasodif = () => {
  urug = (urug * 16807) % 2147483647;
  return (urug - 1) / 2147483646;
};

test('gap yordamchilari', () => {
  assert.equal(gapdagiShakl('She [lost] her keys.'), 'lost');
  assert.equal(ochiqGap('She [lost] her keys.'), 'She lost her keys.');
  assert.equal(boshJoyliGap('She [lost] her keys.'), 'She ___ her keys.');
});

test("dars so'zlari ketma-ket olinadi va ro'yxat tugasa boshidan davom etadi", () => {
  assert.deepEqual(darsSozlari(bank, 0, 5).map((s) => s.soz), ['lose', 'find', 'give', 'take', 'walk']);
  assert.deepEqual(darsSozlari(bank, 2, 5).map((s) => s.soz), ['tired', 'quiet', 'lose', 'find', 'give']);
});

test("yangi so'zlar avval, ular yetmasa eng eski yuborilganlar takrorlanadi", () => {
  const soz = (s) => s.soz;
  assert.deepEqual(darsSozlariniTanla(bank, new Map(), 3).map(soz), ['lose', 'find', 'give']);

  const tarix = new Map([
    ['lose', { birinchi: 0, oxirgi: 0 }],
    ['find', { birinchi: 0, oxirgi: 4 }],
    ['give', { birinchi: 1, oxirgi: 1 }],
  ]);
  assert.deepEqual(darsSozlariniTanla(bank, tarix, 3).map(soz), ['take', 'walk', 'open']);

  const qariyb = new Map(bank.slice(0, 10).map((s, i) => [s.soz, { birinchi: 0, oxirgi: 10 - i }]));
  qariyb.set('lose', { birinchi: 0, oxirgi: 0 });
  // 2 ta yangi (tired, quiet), keyin eng eski yuborilganlar: lose (oxirgi=0), busy (oxirgi=1).
  assert.deepEqual(darsSozlariniTanla(bank, qariyb, 4).map(soz), ['tired', 'quiet', 'lose', 'busy']);
});

test("bo'sh joy testida variantlar bir xil turkum va shakldan olinadi", () => {
  const s = savolTuz(bank[0], 'bosh_joy', bank.slice(0, 4), bank, tasodif);
  assert.equal(s.savol, "Bo'sh joyni to'ldiring:\nShe ___ her keys.");
  assert.equal(s.variantlar[s.togriIndeks], 'lost');
  assert.equal(s.variantlar.length, 4);
  // "-ed" bilan tugamaydigan fe'llar (found, gave, took) bir guruh.
  assert.deepEqual([...s.variantlar].sort(), ['found', 'gave', 'lost', 'took']);
});

test('birikma va gap testlari tarjimani so\'raydi', () => {
  const b = savolTuz(bank[1], 'birikma', bank.slice(0, 4), bank, tasodif);
  assert.match(b.savol, /«find birikma»/);
  assert.equal(b.variantlar[b.togriIndeks], 'find birikma tarjimasi');
  assert.ok(b.variantlar.every((v) => v.endsWith('birikma tarjimasi')));

  const g = savolTuz(bank[2], 'gap', bank.slice(0, 4), bank, tasodif);
  assert.match(g.savol, /They gave me a gift\./);
  assert.equal(g.variantlar[g.togriIndeks], 'give gap tarjimasi');
});

test("darsda har bir so'z uchun bitta test, turlari almashib keladi", () => {
  const dars = darsSozlari(bank, 0, 6);
  const savollar = darsSavollari(dars, bank, tasodif);
  assert.equal(savollar.length, 6);
  assert.match(savollar[0].savol, /^Bo'sh joyni/);
  assert.match(savollar[1].savol, /tarjima qilinadi/);
  assert.match(savollar[2].savol, /^Gapning/);
  assert.match(savollar[3].savol, /^Bo'sh joyni/);
});

test("variant yetmasa tushunarli xato beradi", () => {
  const kichik = bank.slice(0, 2);
  assert.throws(() => savolTuz(kichik[0], 'gap', kichik, kichik, tasodif), /yetarli noto'g'ri variant/);
});

test("so'zlar xabari raqamlangan ro'yxat va darajani ko'rsatadi", () => {
  const matn = sozlarMatni(bank.slice(0, 2), 4, '20:00');
  assert.match(matn, /^📚 5-dars · A2\nKechki 2 ta yangi so'z:/);
  assert.match(matn, /1\. lose \(verb\) — lose tarjimasi\n {4}lose birikma — lose birikma tarjimasi/);
  assert.match(matn, /2\. find \(verb\)/);
  assert.match(sozlarMatni(bank.slice(0, 1), 0, '08:00'), /Ertalabki/);
});
