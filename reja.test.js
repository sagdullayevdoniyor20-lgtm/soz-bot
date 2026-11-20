import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { eslatmaMatni, kanalPostlari, kunIshlari, rejaMarkdown, rejaniYukla, sanaMatni, vaqtiKelganlar } from './reja.js';

const reja = rejaniYukla();
const VAQT = /^([01]\d|2[0-3]):[0-5]\d$/;

test("reja.json: kunlar ketma-ket va har birida kerakli qismlar bor", () => {
  assert.ok(reja.kunlar.length >= 7);
  assert.equal(reja.kunlar[0].sana, reja.boshlanish);
  reja.kunlar.forEach((kun, i) => {
    if (i > 0) {
      const oldingi = new Date(`${reja.kunlar[i - 1].sana}T00:00:00Z`);
      assert.equal(new Date(`${kun.sana}T00:00:00Z`) - oldingi, 86_400_000, `${kun.sana}: kun tushib qolgan`);
    }
    assert.ok(kun.xato?.notogri && kun.xato?.togri && kun.xato?.izoh, `${kun.sana}: kun xatosi to'liq emas`);
    for (const v of [...(kun.youtube ?? []), ...(kun.instagram ?? [])]) {
      assert.match(v.vaqt, VAQT, `${kun.sana}: vaqt noto'g'ri`);
      assert.ok(v.nomi?.trim(), `${kun.sana}: nomi yo'q`);
      if (v.havola) assert.match(v.havola, /^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//, `${kun.sana}: havola`);
    }
  });
});

test('kun xatolari takrorlanmaydi', () => {
  const xatolar = reja.kunlar.map((k) => k.xato.notogri);
  assert.equal(new Set(xatolar).size, xatolar.length);
});

test("barcha matnlar Telegram chegarasiga (4096) sig'adi", () => {
  for (const kun of reja.kunlar) {
    for (const ish of kunIshlari(kun, '1')) assert.ok(ish.matn.length < 4096, ish.kalit);
  }
});

test('havolasi bor video uchun 5 daqiqadan keyin post, xato 14:00 da', () => {
  const kun = { sana: '2026-01-01', youtube: [{ vaqt: '12:00', nomi: 'A', havola: 'https://youtube.com/shorts/x' }, { vaqt: '19:00', nomi: 'B' }], xato: { notogri: 'a', togri: 'b', izoh: 'c' } };
  assert.deepEqual(kanalPostlari(kun).map((p) => p.vaqt), ['12:05', '14:00']);
  assert.ok(eslatmaMatni(kun).includes('B'));
});

test("vaqti kelganlar: oyna ichida va hali yuborilmaganlar", () => {
  const postlar = [{ kalit: 'a', vaqt: '12:05' }, { kalit: 'b', vaqt: '14:00' }];
  assert.deepEqual(vaqtiKelganlar(postlar, 12 * 60 + 4).map((p) => p.kalit), []);
  assert.deepEqual(vaqtiKelganlar(postlar, 12 * 60 + 37).map((p) => p.kalit), ['a']);
  assert.deepEqual(vaqtiKelganlar(postlar, 12 * 60 + 37, ['a']), []);
  assert.deepEqual(vaqtiKelganlar(postlar, 14 * 60 + 5).map((p) => p.kalit), ['b']);
  assert.deepEqual(vaqtiKelganlar(postlar, 16 * 60 + 30), []);
});

test("adminsiz eslatma yuborilmaydi", () => {
  const kun = reja.kunlar[0];
  assert.ok(!kunIshlari(kun, undefined).some((i) => i.qayerga === 'admin'));
  assert.equal(kunIshlari(kun, '1')[0].qayerga, 'admin');
});

test('sana matni', () => {
  assert.equal(sanaMatni('2026-11-21'), '21-noyabr, şanba');
});

test("REJA.md reja.json bilan bir xil (node reja-md.js)", () => {
  assert.equal(readFileSync(join(import.meta.dirname, 'REJA.md'), 'utf8'), rejaMarkdown(reja));
});
