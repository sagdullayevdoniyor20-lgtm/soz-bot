import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Darajalar shu tartibda keladi: avval A2, keyin B1, keyin B2.
export const DARAJALAR = ['A2', 'B1', 'B2'];
export const TURKUMLAR = { n: 'noun', v: 'verb', adj: 'adjective', adv: 'adverb' };

// Bir darsda fe'l, ot, sifat va ravishlar aralash kelishi uchun har bir turkumni ro'yxat bo'ylab
// teng yoyadi: guruhdagi i-so'z (i + 0.5) / guruh uzunligi o'rniga qo'yiladi.
export function turkumlabAralashtir(sozlar) {
  const guruhlar = Object.values(Object.groupBy(sozlar, (s) => s.turkum));
  return guruhlar
    .flatMap((guruh) => guruh.map((soz, i) => ({ soz, orin: (i + 0.5) / guruh.length })))
    .sort((a, b) => a.orin - b.orin)
    .map((x) => x.soz);
}

// Har bir JSON qatori: [so'z, turkum, tarjima, birikma, birikma tarjimasi, gap ([so'z] bilan), gap tarjimasi]
export function sozlarniYukla(papka = join(import.meta.dirname, 'sozlar')) {
  return DARAJALAR.flatMap((daraja) => {
    const qatorlar = JSON.parse(readFileSync(join(papka, `${daraja.toLowerCase()}.json`), 'utf8'));
    return turkumlabAralashtir(
      qatorlar.map(([soz, turkum, tarjima, birikma, birikmaTarjima, gap, gapTarjima]) => ({
        daraja, soz, turkum, tarjima, birikma, birikmaTarjima, gap, gapTarjima,
      })),
    );
  });
}
