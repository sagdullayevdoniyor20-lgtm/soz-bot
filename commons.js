// Joy rasmini topish va yuklab olish. Rasmlar Wikimedia Commons'da saqlanadi; ularni
// inglizcha Wikipedia'dagi shu joy maqolasi orqali olamiz, shunda rasm doim mavzuga mos keladi.
import { yaroqliRasmlar } from './joylar.js';

const API = 'https://en.wikipedia.org/w/api.php';
// Wikimedia so'rovlarda bot nomini User-Agent'da ko'rsatishni talab qiladi.
const UA = 'soz-bot/1.0 (https://github.com/sagdullayevdoniyor20-lgtm/soz-bot)';
const IMAGEINFO = { prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '1600' };

async function sorov(parametrlar) {
  const p = new URLSearchParams({ action: 'query', format: 'json', redirects: '1', ...parametrlar });
  const javob = await fetch(`${API}?${p}`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20_000) });
  if (!javob.ok) throw new Error(`Wikipedia ${javob.status}`);
  return (await javob.json()).query?.pages;
}

// Yarim ehtimol bilan maqolaning bosh rasmi (eng tanilgan foto), aks holda maqoladagi fayl nomida
// `kalit` (masalan "Tower_Bridge|London_Eye") bor boshqa katta gorizontal fotolardan biri — shunda
// rasm har oy bir xil chiqmaydi. Natija: { url, sahifa, muallif, litsenziya, rasm, nechtadan }.
export async function joyRasmi(joy) {
  const kalit = new RegExp(joy.kalit, 'i');
  const boshNomi = Object.values((await sorov({ prop: 'pageimages', titles: joy.maqola, piprop: 'name' })) ?? {})[0]?.pageimage;
  const bosh = boshNomi ? yaroqliRasmlar(await sorov({ titles: `File:${boshNomi}`, ...IMAGEINFO }), 1) : [];
  const boshqalar = yaroqliRasmlar(await sorov({ generator: 'images', titles: joy.maqola, gimlimit: '100', ...IMAGEINFO }), 100)
    .filter((r) => kalit.test(decodeURIComponent(r.sahifa.split('File:')[1] ?? '')) && r.sahifa !== bosh[0]?.sahifa);
  const topildi = [...bosh, ...boshqalar];
  if (!topildi.length) throw new Error(`Rasm topilmadi: ${joy.maqola}`);
  const tanlangan = bosh.length && (!boshqalar.length || Math.random() < 0.5)
    ? bosh[0]
    : boshqalar[Math.floor(Math.random() * boshqalar.length)];
  const javob = await fetch(tanlangan.url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30_000) });
  if (!javob.ok) throw new Error(`Rasm yuklanmadi: ${javob.status}`);
  return { ...tanlangan, rasm: new Uint8Array(await javob.arrayBuffer()), nechtadan: topildi.length };
}
