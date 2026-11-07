import { TURKUMLAR } from './sozlar.js';

export const DARSDAGI_SOZLAR = 10;
export const VARIANTLAR_SONI = 4;
// Telegram chegaralari (sendPoll).
export const CHEGARA = { savol: 300, variant: 100, izoh: 200 };
// Testlar shu tartibda almashib keladi.
export const SAVOL_TURLARI = ['bosh_joy', 'birikma', 'gap'];

const QAVS = /\[([^\]]+)\]/;

export const gapdagiShakl = (gap) => gap.match(QAVS)[1];
export const ochiqGap = (gap) => gap.replace(QAVS, '$1');
export const boshJoyliGap = (gap) => gap.replace(QAVS, '___');

// Keyingi dars so'zlari: avval hali yuborilmagan so'zlar (bazadagi tartibda). Ular yetmasa,
// eng uzoq vaqt oldin yuborilgan so'zlar takrorlanadi. `tarix`: soz → { birinchi, oxirgi }.
export function darsSozlariniTanla(sozlar, tarix, soni = DARSDAGI_SOZLAR) {
  const yangilar = sozlar.filter((s) => !tarix.has(s.soz));
  if (yangilar.length >= soni) return yangilar.slice(0, soni);
  const eskilar = sozlar
    .filter((s) => tarix.has(s.soz))
    .sort((a, b) => tarix.get(a.soz).oxirgi - tarix.get(b.soz).oxirgi);
  return [...yangilar, ...eskilar].slice(0, soni);
}

// Toza bazada `tartib`-dars qaysi so'zlardan iborat bo'lishi (namuna va testlar uchun).
export function darsSozlari(sozlar, tartib, soni = DARSDAGI_SOZLAR) {
  return Array.from({ length: soni }, (_, k) => sozlar[(tartib * soni + k) % sozlar.length]);
}

function aralashtir(royxat, tasodif) {
  const nusxa = [...royxat];
  for (let i = nusxa.length - 1; i > 0; i--) {
    const j = Math.floor(tasodif() * (i + 1));
    [nusxa[i], nusxa[j]] = [nusxa[j], nusxa[i]];
  }
  return nusxa;
}

// Guruhlar ustuvorlik tartibida: avval birinchi guruhdan, yetmasa keyingisidan olinadi.
function chalgituvchilar(togri, guruhlar, soni, tasodif) {
  const tanlangan = [];
  const korilgan = new Set([togri.toLowerCase()]);
  for (const guruh of guruhlar) {
    for (const variant of aralashtir(guruh, tasodif)) {
      if (tanlangan.length === soni) return tanlangan;
      const kalit = variant.toLowerCase();
      if (!korilgan.has(kalit)) {
        korilgan.add(kalit);
        tanlangan.push(variant);
      }
    }
  }
  if (tanlangan.length < soni) {
    throw new Error(`"${togri}" uchun yetarli noto'g'ri variant topilmadi`);
  }
  return tanlangan;
}

// Bo'sh joy testida grammatik shakli o'xshash variantlar tanlanadi (lost / found / gave).
function qoshimcha(shakl) {
  const s = shakl.toLowerCase();
  if (s.endsWith('ed')) return 'ed';
  if (s.endsWith('ing')) return 'ing';
  if (s.endsWith('ly')) return 'ly';
  if (s.endsWith('s')) return 's';
  return '';
}

function qisqart(matn, chegara) {
  return matn.length <= chegara ? matn : `${matn.slice(0, chegara - 1)}…`;
}

export function savolTuz(soz, tur, dars, barcha, tasodif = Math.random) {
  const darsdagilar = dars.filter((s) => s !== soz);
  const boshqalar = barcha.filter((s) => s !== soz);
  let savol;
  let togri;
  let guruhlar;
  let izoh;

  if (tur === 'bosh_joy') {
    togri = gapdagiShakl(soz.gap);
    const shakli = (s) => gapdagiShakl(s.gap);
    const turkumi = (s) => s.turkum === soz.turkum;
    const oxshash = (s) => turkumi(s) && qoshimcha(shakli(s)) === qoshimcha(togri);
    guruhlar = [
      darsdagilar.filter(oxshash),
      boshqalar.filter((s) => s.daraja === soz.daraja && oxshash(s)),
      boshqalar.filter(oxshash),
      boshqalar.filter(turkumi),
    ].map((g) => g.map(shakli));
    savol = `Bo'sh joyni to'ldiring:\n${boshJoyliGap(soz.gap)}`;
    izoh = `${soz.soz} — ${soz.tarjima}. ${soz.gapTarjima}`;
  } else if (tur === 'birikma') {
    togri = soz.birikmaTarjima;
    guruhlar = [darsdagilar, boshqalar].map((g) => g.map((s) => s.birikmaTarjima));
    savol = `«${soz.birikma}» qanday tarjima qilinadi?`;
    izoh = `${soz.soz} — ${soz.tarjima}. ${ochiqGap(soz.gap)}`;
  } else if (tur === 'gap') {
    togri = soz.gapTarjima;
    guruhlar = [darsdagilar, boshqalar].map((g) => g.map((s) => s.gapTarjima));
    savol = `Gapning to'g'ri tarjimasini toping:\n${ochiqGap(soz.gap)}`;
    izoh = `${soz.soz} — ${soz.tarjima}`;
  } else {
    throw new Error(`Noma'lum savol turi: ${tur}`);
  }

  const variantlar = aralashtir(
    [togri, ...chalgituvchilar(togri, guruhlar, VARIANTLAR_SONI - 1, tasodif)],
    tasodif,
  );
  return {
    savol: qisqart(savol, CHEGARA.savol),
    variantlar,
    togriIndeks: variantlar.indexOf(togri),
    izoh: qisqart(izoh, CHEGARA.izoh),
  };
}

export function darsSavollari(dars, barcha, tasodif = Math.random) {
  return dars.map((soz, i) => savolTuz(soz, SAVOL_TURLARI[i % SAVOL_TURLARI.length], dars, barcha, tasodif));
}

export function sozlarMatni(dars, tartib, vaqt) {
  const darajalar = [...new Set(dars.map((s) => s.daraja))].join('–');
  const qism = Number(vaqt.slice(0, 2)) < 12 ? 'Ertalabki' : 'Kechki';
  const royxat = dars.map(
    (s, i) => `${i + 1}. ${s.soz} (${TURKUMLAR[s.turkum]}) — ${s.tarjima}\n    ${s.birikma} — ${s.birikmaTarjima}`,
  );
  return [
    `📚 ${tartib + 1}-dars · ${darajalar}`,
    `${qism} ${dars.length} ta yangi so'z:`,
    '',
    royxat.join('\n\n'),
    '',
    `✍️ Endi ${dars.length} ta test bilan o'zingizni sinab ko'ring!`,
  ].join('\n');
}
