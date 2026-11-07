import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CHEGARA, darsSavollari, darsSozlari, sozlarMatni, VARIANTLAR_SONI } from './savollar.js';
import { DARAJALAR, sozlarniYukla, TURKUMLAR } from './sozlar.js';

const sozlar = sozlarniYukla();

// Takrorlanadigan "tasodif" (mulberry32).
function urugliTasodif(urug) {
  return () => {
    urug = (urug + 0x6d2b79f5) | 0;
    let t = Math.imul(urug ^ (urug >>> 15), 1 | urug);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test("har bir darajada so'zlar bor va ular A2 → B1 → B2 tartibida", () => {
  for (const daraja of DARAJALAR) {
    assert.ok(sozlar.filter((s) => s.daraja === daraja).length >= 50, daraja);
  }
  const tartib = sozlar.map((s) => DARAJALAR.indexOf(s.daraja));
  assert.deepEqual(tartib, [...tartib].sort((a, b) => a - b));
});

test("har bir darsda kamida 3 xil turkum bor", () => {
  for (let tartib = 0; tartib < Math.floor(sozlar.length / 10); tartib++) {
    const turkumlar = new Set(darsSozlari(sozlar, tartib).map((s) => s.turkum));
    assert.ok(turkumlar.size >= 3, `${tartib + 1}-dars: ${[...turkumlar]}`);
  }
});

test("so'zlar takrorlanmaydi", () => {
  const korilgan = new Set();
  for (const s of sozlar) {
    const kalit = s.soz.toLowerCase();
    assert.ok(!korilgan.has(kalit), `takroriy so'z: ${s.soz}`);
    korilgan.add(kalit);
  }
});

test("har bir yozuv to'liq va Telegram chegaralariga sig'adi", () => {
  for (const s of sozlar) {
    const nomi = `${s.daraja}: ${s.soz}`;
    for (const maydon of ['soz', 'tarjima', 'birikma', 'birikmaTarjima', 'gap', 'gapTarjima']) {
      assert.equal(typeof s[maydon], 'string', `${nomi} → ${maydon}`);
      assert.ok(s[maydon].trim().length > 0, `${nomi} → ${maydon} bo'sh`);
    }
    assert.ok(s.turkum in TURKUMLAR, `${nomi}: noma'lum turkum ${s.turkum}`);
    assert.equal(s.gap.match(/\[[^\]]+\]/g)?.length, 1, `${nomi}: gapda bitta [so'z] bo'lishi kerak`);
    assert.doesNotMatch(s.gap, /\b(a|an) \[/i, `${nomi}: "a/an" bo'sh joydan oldin javobni oshkor qiladi`);
    assert.ok(s.birikmaTarjima.length <= CHEGARA.variant, `${nomi}: birikma tarjimasi uzun`);
    assert.ok(s.gapTarjima.length <= CHEGARA.variant, `${nomi}: gap tarjimasi uzun`);
    assert.ok(!s.gap.includes("’") && !s.gapTarjima.includes("’"), `${nomi}: oddiy ' apostrof ishlating`);
  }
});

test("ro'yxatdagi barcha darslardan to'g'ri testlar tuziladi", () => {
  const darslarSoni = Math.ceil(sozlar.length / 10) + 1; // bitta aylanib o'tishni ham tekshiradi
  for (let tartib = 0; tartib < darslarSoni; tartib++) {
    const dars = darsSozlari(sozlar, tartib);
    assert.ok(sozlarMatni(dars, tartib, '08:00').length <= 4096);
    for (const s of darsSavollari(dars, sozlar, urugliTasodif(tartib))) {
      assert.equal(s.variantlar.length, VARIANTLAR_SONI);
      assert.equal(new Set(s.variantlar.map((v) => v.toLowerCase())).size, VARIANTLAR_SONI, s.savol);
      assert.ok(s.togriIndeks >= 0 && s.togriIndeks < VARIANTLAR_SONI);
      assert.ok(s.savol.length <= CHEGARA.savol);
      assert.ok(s.izoh.length <= CHEGARA.izoh);
      for (const v of s.variantlar) assert.ok(v.length >= 1 && v.length <= CHEGARA.variant, v);
    }
  }
});
