import assert from 'node:assert/strict';
import { test } from 'node:test';
import { joriyDars, toshkentVaqti } from './jadval.js';

// Toshkent = UTC+5.
const utc = (matn) => new Date(`${matn}Z`);

test('Toshkent vaqti UTC+5 bo\'yicha hisoblanadi', () => {
  assert.deepEqual(toshkentVaqti(utc('2026-11-07T03:00:00')), { sana: '2026-11-07', daqiqa: 8 * 60 });
  assert.deepEqual(toshkentVaqti(utc('2026-11-07T19:30:00')), { sana: '2026-11-08', daqiqa: 30 });
});

test('dars vaqti kelganda va 2 soat ichida yuboriladi', () => {
  assert.deepEqual(joriyDars(utc('2026-11-07T03:00:00')), { sana: '2026-11-07', vaqt: '08:00' });
  assert.deepEqual(joriyDars(utc('2026-11-07T04:59:00')), { sana: '2026-11-07', vaqt: '08:00' });
  assert.deepEqual(joriyDars(utc('2026-11-07T15:00:00')), { sana: '2026-11-07', vaqt: '20:00' });
});

test('boshqa paytlarda dars yo\'q', () => {
  assert.equal(joriyDars(utc('2026-11-07T02:59:00')), null); // 07:59
  assert.equal(joriyDars(utc('2026-11-07T05:00:00')), null); // 10:00, kechikish chegarasi o'tgan
  assert.equal(joriyDars(utc('2026-11-07T17:00:00')), null); // 22:00
  assert.equal(joriyDars(utc('2026-11-07T19:30:00')), null); // ertasi 00:30
});
