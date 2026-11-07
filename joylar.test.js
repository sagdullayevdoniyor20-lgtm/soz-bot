import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BAYROQ, joylarniYukla, navbatdagiJoy, rasmMatni, yaroqliRasmlar } from './joylar.js';

const joylar = joylarniYukla();

test("joylar.json to'liq va AQSh/UK navbat bilan keladi", () => {
  assert.ok(joylar.length >= 10);
  joylar.forEach((joy, i) => {
    for (const maydon of ['nomi', 'nomiUz', 'maqola', 'kalit', 'en', 'uz']) {
      assert.ok(joy[maydon]?.trim(), `${i + 1}-joyda ${maydon} yo'q`);
    }
    assert.ok(BAYROQ[joy.davlat], `${joy.nomi}: davlat us yoki uk bo'lsin`);
    if (i > 0) assert.notEqual(joy.davlat, joylar[i - 1].davlat, `${joy.nomi}: oldingisi bilan bir davlat`);
  });
});

test("har bir post matni Telegram chegarasiga (1024) sig'adi", () => {
  const rasm = { sahifa: 'https://commons.wikimedia.org/wiki/File:X.jpg', muallif: 'A'.repeat(80), litsenziya: 'CC BY-SA 4.0' };
  for (const joy of joylar) assert.ok(rasmMatni(joy, rasm).length < 1024, joy.nomi);
});

test('navbat oxiriga yetgach boshidan boshlanadi', () => {
  assert.deepEqual(navbatdagiJoy({}, joylar).indeks, 0);
  assert.equal(navbatdagiJoy({ keyingi: 3 }, joylar).keyingi, 4);
  assert.equal(navbatdagiJoy({ keyingi: joylar.length - 1 }, joylar).keyingi, 0);
  assert.equal(navbatdagiJoy({ keyingi: joylar.length + 5 }, joylar).indeks, 0);
});

test('post matni HTML belgilarini xavfsiz qiladi va manbani ko\'rsatadi', () => {
  const matn = rasmMatni(
    { davlat: 'uk', nomi: 'A & B', nomiUz: 'A <b>', en: 'x', uz: 'y' },
    { sahifa: 'https://c.org/File:"q".jpg', muallif: 'Ali', litsenziya: 'CC BY 4.0' },
  );
  assert.match(matn, /^🇬🇧 <b>A &amp; B<\/b>/);
  assert.match(matn, /🇺🇿 <b>A &lt;b&gt;<\/b>/);
  assert.match(matn, /<a href="https:\/\/c\.org\/File:&quot;q&quot;\.jpg">Ali, CC BY 4\.0<\/a> \/ Wikimedia Commons$/);
});

test('Commons natijalaridan faqat katta gorizontal JPEG lar, qidiruv tartibida', () => {
  const ii = (index, width, height, mime = 'image/jpeg') => ({
    index,
    imageinfo: [{ width, height, mime, thumburl: `t${index}`, descriptionurl: `d${index}`,
      extmetadata: { Artist: { value: '<a href="x">Ali</a>' }, LicenseShortName: { value: 'CC0' } } }],
  });
  const natija = yaroqliRasmlar({ a: ii(3, 2000, 1000), b: ii(1, 3000, 2000), c: ii(2, 1000, 1000), d: ii(4, 2000, 1000, 'image/png') }, 5);
  assert.deepEqual(natija.map((r) => r.url), ['t1', 't3']);
  assert.equal(natija[0].muallif, 'Ali');
  assert.deepEqual(yaroqliRasmlar(undefined, 5), []);
});

test('eski kartina va chizmalar olinmaydi', () => {
  const ii = (index, sana, nom = `F${index}.jpg`) => ({
    index,
    imageinfo: [{ width: 2000, height: 1000, mime: 'image/jpeg', thumburl: `t${index}`, descriptionurl: `https://c/File:${nom}`,
      extmetadata: sana ? { DateTimeOriginal: { value: sana } } : {} }],
  });
  const natija = yaroqliRasmlar({
    a: ii(1, 'circa 1819'), b: ii(2, '2014-08-12 10:00'), c: ii(3, undefined),
    d: ii(4, '2020', 'Snowdon_-_Google_Art_Project.jpg'),
  }, 5);
  assert.deepEqual(natija.map((r) => r.url), ['t2', 't3']);
});
