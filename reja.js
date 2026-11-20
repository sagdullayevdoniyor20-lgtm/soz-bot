// 30 kunlik kontent reja (reja.json): Telegram'ga avtomatik postlar va adminga kunlik eslatma.
// Bu fayl tarmoqqa chiqmaydi: faqat rejani o'qiydi va matnlarni tuzadi.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const ESLATMA_VAQTI = '09:00';
export const XATO_VAQTI = '14:00';
// YouTube'da video chiqqandan keyin Telegram'ga havola shuncha daqiqadan keyin boradi.
export const HAVOLA_KECHIKISHI = 5;

const OYLAR = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'];
const HAFTA = ['yakşanba', 'duşanba', 'seşanba', 'çorşanba', 'payşanba', 'juma', 'şanba'];

export function rejaniYukla(fayl = join(import.meta.dirname, 'reja.json')) {
  return JSON.parse(readFileSync(fayl, 'utf8'));
}

export function kunniTop(reja, sana) {
  return reja.kunlar.find((kun) => kun.sana === sana) ?? null;
}

export function sanaMatni(sana) {
  const [y, o, k] = sana.split('-').map(Number);
  const hafta = HAFTA[new Date(Date.UTC(y, o - 1, k)).getUTCDay()];
  return `${k}-${OYLAR[o - 1]}, ${hafta}`;
}

function vaqtQosh(vaqt, daqiqa) {
  const [s, d] = vaqt.split(':').map(Number);
  const jami = s * 60 + d + daqiqa;
  return `${String(Math.floor(jami / 60)).padStart(2, '0')}:${String(jami % 60).padStart(2, '0')}`;
}

export function xatoMatni(xato) {
  return [
    'Inglizlar buni eşitsa kuladi 😄',
    '',
    `❌ ${xato.notogri}`,
    `✅ ${xato.togri}`,
    '',
    `💡 ${xato.izoh}`,
    '',
    '#kun_xatosi',
  ].join('\n');
}

export function havolaMatni(video) {
  const sarlavha = video.tur === 'uzun' ? '🎬 YouTube\'da yangi video!' : '🎬 YouTube\'da yangi Shorts!';
  return `${sarlavha}\n\n${video.nomi}\n\nKöring va takrorlang 👇\n${video.havola}`;
}

// Kun bo'yicha Telegram kanalga avtomatik ketadigan postlar: [{ kalit, vaqt, matn, korinish }].
// korinish: havola oldindan ko'rinishi (preview) yoqilsinmi.
export function kanalPostlari(kun) {
  const postlar = [];
  for (const video of kun.youtube ?? []) {
    if (!video.havola) continue;
    const vaqt = vaqtQosh(video.vaqt, HAVOLA_KECHIKISHI);
    postlar.push({ kalit: `${kun.sana} ${vaqt} youtube`, vaqt, matn: havolaMatni(video), korinish: true });
  }
  if (kun.xato) {
    postlar.push({ kalit: `${kun.sana} ${XATO_VAQTI} xato`, vaqt: XATO_VAQTI, matn: xatoMatni(kun.xato), korinish: false });
  }
  return postlar.sort((a, b) => a.vaqt.localeCompare(b.vaqt));
}

const BELGI = { 'rejalaştirilgan': '✅ rejalaştirilgan', 'tayyorlanadi': '⏳ tayyorlanadi', 'yuklanadi': '⬆️ yuklanadi', 'joylandi': '✅ joylandi' };

export function eslatmaMatni(kun) {
  const qatorlar = [`📋 Bugungi kontent reja — ${sanaMatni(kun.sana)}`, '', '▶️ YouTube:'];
  for (const v of kun.youtube ?? []) {
    const tur = v.tur === 'uzun' ? 'uzun video' : 'Shorts';
    const holat = BELGI[v.holat] ?? v.holat ?? '';
    qatorlar.push(`• ${v.vaqt} ${tur}: ${v.nomi}${holat ? ` (${holat})` : ''}${v.izoh ? ` — ${v.izoh}` : ''}`);
  }
  qatorlar.push('', '📸 Instagram:');
  for (const p of kun.instagram ?? []) {
    qatorlar.push(`• ${p.vaqt} ${p.tur === 'story' ? 'story' : 'Reels'}: ${p.nomi}`);
  }
  qatorlar.push(
    '',
    '✈️ Telegram (avtomatik):',
    '• 08:00 va 20:00 — söz darsi, 10:00 — rasm',
    `• ${XATO_VAQTI} — kun xatosi: ${kun.xato?.notogri ?? '—'}`,
  );
  for (const p of kanalPostlari(kun).filter((p) => p.korinish)) {
    qatorlar.push(`• ${p.vaqt} — YouTube havolasi`);
  }
  return qatorlar.join('\n');
}

// Hozir yuborilishi kerak bo'lganlar: vaqti kelgan (kechikish oynasi ichida) va hali yuborilmagan.
export function vaqtiKelganlar(postlar, daqiqa, yuborilgan = [], kechikish = 120) {
  const bor = new Set(yuborilgan);
  return postlar.filter((p) => {
    const [s, d] = p.vaqt.split(':').map(Number);
    const boshi = s * 60 + d;
    return daqiqa >= boshi && daqiqa < boshi + kechikish && !bor.has(p.kalit);
  });
}

// Kunning barcha avtomatik ishlari: adminga eslatma + kanal postlari.
export function kunIshlari(kun, admin) {
  const ishlar = kanalPostlari(kun).map((p) => ({ ...p, qayerga: 'kanal' }));
  if (admin) {
    ishlar.unshift({ kalit: `${kun.sana} ${ESLATMA_VAQTI} eslatma`, vaqt: ESLATMA_VAQTI, matn: eslatmaMatni(kun), korinish: false, qayerga: 'admin' });
  }
  return ishlar;
}

// REJA.md: rejaning odam o'qiydigan ko'rinishi (node reja-md.js bilan yangilanadi).
export function rejaMarkdown(reja) {
  const q = [
    '# Kontent reja: «Ingliz tili 0 dan» (30 kun)',
    '',
    `> Bu fayl \`reja.json\` dan yaratiladi: \`node reja-md.js\`. Qo'lda tahrirlamang, \`reja.json\` ni o'zgartiring.`,
    '',
    '**Avtomatik (GitHub Actions, `reja.yml`):** Telegram kanalga 14:00 da kun xatosi; YouTube havolasi bor videolar chiqqandan 5 daqiqa keyin kanalga havola; 09:00 da ADMIN_ID ga kunlik eslatma.',
    '',
    '**Doimiy Telegram jadvali:** 08:00 va 20:00 so\'z darsi (`dars.yml`), 10:00 AQSh/UK rasmi (`rasm.yml`).',
    '',
    '**Qo\'lda:** YouTube Shorts va uzun videolar (Studio\'da oldindan rejalashtiriladi), Instagram Reels va story.',
    '',
    '| Sana | YouTube | Instagram | Telegram: kun xatosi (14:00) |',
    '|---|---|---|---|',
  ];
  for (const kun of reja.kunlar) {
    const yt = (kun.youtube ?? []).map((v) => `${v.vaqt} ${v.tur === 'uzun' ? '**uzun:** ' : ''}${v.havola ? `[${v.nomi}](${v.havola})` : v.nomi}`).join('<br>');
    const ig = (kun.instagram ?? []).map((p) => `${p.vaqt} ${p.tur === 'story' ? 'story' : 'Reels'}: ${p.nomi}`).join('<br>');
    const xato = kun.xato ? `❌ ${kun.xato.notogri} → ✅ ${kun.xato.togri}` : '';
    q.push(`| ${sanaMatni(kun.sana)} | ${yt.replaceAll('|', '\\|')} | ${ig.replaceAll('|', '\\|')} | ${xato.replaceAll('|', '\\|')} |`);
  }
  return q.join('\n') + '\n';
}
