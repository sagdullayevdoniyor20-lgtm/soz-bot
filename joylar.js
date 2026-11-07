// Har kuni 10:00 da kanalga AQSh yoki Buyuk Britaniya haqida rasm: joylar ro'yxati, navbat va post matni.
// Tarmoqqa chiqmaydi (rasmni Wikimedia Commons'dan topish: commons.js).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const RASM_VAQTI = '10:00';
export const BAYROQ = { us: '🇺🇸', uk: '🇬🇧' };
const CAPTION_CHEGARASI = 1024;

export function joylarniYukla(yol = join(import.meta.dirname, 'joylar.json')) {
  return JSON.parse(readFileSync(yol, 'utf8'));
}

const html = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// holat: { keyingi: joy indeksi (0 dan), aylana: ro'yxat necha marta to'liq o'tilgani, oxirgiSana }.
// Ro'yxat tugasa boshidan boshlanadi va aylana bittaga oshadi (keyingi aylanishda boshqa matn chiqadi).
export function navbatdagiJoy(holat, joylar) {
  const indeks = Number.isInteger(holat?.keyingi) && holat.keyingi < joylar.length ? holat.keyingi : 0;
  const aylana = Number.isInteger(holat?.aylana) && holat.aylana >= 0 ? holat.aylana : 0;
  const keyingi = (indeks + 1) % joylar.length;
  return { indeks, aylana, joy: joylar[indeks], keyingi, keyingiAylana: keyingi === 0 ? aylana + 1 : aylana };
}

// Rasm tagidagi matn (parse_mode: HTML). rasm: { sahifa, muallif, litsenziya }.
// Joyning matnlari aylanaga qarab navbat bilan olinadi: 1-aylanish — 1-matn, 2-si — 2-matn, ...
export function rasmMatni(joy, rasm, aylana = 0) {
  const matn = joy.matnlar[aylana % joy.matnlar.length];
  const manba = [rasm.muallif, rasm.litsenziya].filter(Boolean).join(', ') || 'Wikimedia Commons';
  return [
    `${BAYROQ[joy.davlat]} <b>${html(joy.nomi)}</b>`,
    html(matn.en),
    '',
    `🇺🇿 <b>${html(joy.nomiUz)}</b>`,
    html(matn.uz),
    '',
    `📷 <a href="${html(rasm.sahifa)}">${html(manba)}</a> / Wikimedia Commons`,
  ].join('\n').slice(0, CAPTION_CHEGARASI);
}

const htmlsiz = (s) => String(s ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

// Rasm sanasidagi yil (masalan "2014-08-12" yoki "circa 1819" dan), topilmasa null.
function rasmYili(i) {
  const yil = htmlsiz(i.extmetadata?.DateTimeOriginal?.value).match(/\b(1[5-9]\d\d|20\d\d)\b/);
  return yil ? Number(yil[1]) : null;
}
// Eski kartina va chizmalar o'rniga zamonaviy fotolar kerak.
const ENG_ESKI_YIL = 1950;
const SAN_ASAR = /Google_Art_Project|painting|drawing|engraving|lithograph|postcard|invitation|stamp|Berann|_map\b|_map_/i;

// Wikimedia API natijalaridan (`pages`) post uchun yaroqlilarini ajratadi: JPEG, eni kamida 1400 px,
// gorizontal, 1950-yildan keyingi foto. API tartibi saqlanadi, `nechta` tasi olinadi.
export function yaroqliRasmlar(sahifalar, nechta) {
  return Object.values(sahifalar ?? {})
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map((s) => s.imageinfo?.[0])
    .filter((i) => i && i.mime === 'image/jpeg' && i.width >= 1400 && i.width >= i.height * 1.2 && i.thumburl)
    .filter((i) => (rasmYili(i) ?? ENG_ESKI_YIL) >= ENG_ESKI_YIL && !SAN_ASAR.test(i.descriptionurl ?? ''))
    .slice(0, nechta)
    .map((i) => ({
      url: i.thumburl,
      sahifa: i.descriptionurl,
      muallif: htmlsiz(i.extmetadata?.Artist?.value).slice(0, 80),
      litsenziya: htmlsiz(i.extmetadata?.LicenseShortName?.value),
    }));
}
