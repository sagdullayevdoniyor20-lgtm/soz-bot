import { DatabaseSync } from 'node:sqlite';

// `darslar`: har bir dars (sana + vaqt) uchun bitta qator. `tartib` darsning umumiy raqami (0 dan),
// `sozlar` shu darsga tanlangan so'zlar (JSON), `qadam` nechta xabar yuborib bo'linganini saqlaydi:
// bot uzilib qolsa, qolgan joyidan davom etadi.
// `sozlar_tarixi`: har bir so'z birinchi va oxirgi marta qaysi darsda yuborilgani.
export function bazaniOch(yol) {
  const db = new DatabaseSync(yol);
  db.exec(`
    CREATE TABLE IF NOT EXISTS darslar (
      sana   TEXT    NOT NULL,
      vaqt   TEXT    NOT NULL,
      tartib INTEGER NOT NULL UNIQUE,
      sozlar TEXT    NOT NULL,
      qadam  INTEGER NOT NULL DEFAULT 0,
      tugadi INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (sana, vaqt)
    );
    CREATE TABLE IF NOT EXISTS sozlar_tarixi (
      soz      TEXT    PRIMARY KEY,
      birinchi INTEGER NOT NULL,
      oxirgi   INTEGER NOT NULL
    );
  `);

  const ol = db.prepare('SELECT tartib, sozlar, qadam, tugadi FROM darslar WHERE sana = ? AND vaqt = ?');
  const soni = db.prepare('SELECT COUNT(*) AS soni FROM darslar');
  const qosh = db.prepare('INSERT INTO darslar (sana, vaqt, tartib, sozlar) VALUES (?, ?, ?, ?)');
  const tarixOl = db.prepare('SELECT soz, birinchi, oxirgi FROM sozlar_tarixi');
  const tarixYoz = db.prepare(`
    INSERT INTO sozlar_tarixi (soz, birinchi, oxirgi) VALUES (?, ?, ?)
    ON CONFLICT (soz) DO UPDATE SET oxirgi = excluded.oxirgi
  `);
  const qadamYoz = db.prepare('UPDATE darslar SET qadam = ?, tugadi = ? WHERE sana = ? AND vaqt = ?');

  const yozuvga = (q) => q && { tartib: q.tartib, sozlar: JSON.parse(q.sozlar), qadam: q.qadam, tugadi: q.tugadi };

  function tarix() {
    return new Map(tarixOl.all().map((q) => [q.soz, { birinchi: q.birinchi, oxirgi: q.oxirgi }]));
  }

  return {
    darsniOl: (sana, vaqt) => yozuvga(ol.get(sana, vaqt)),
    tarix,
    // `tanla(tarix)` shu dars uchun so'zlar ro'yxatini qaytaradi. Hammasi bitta tranzaksiyada.
    darsniBoshla(sana, vaqt, tanla) {
      db.exec('BEGIN');
      try {
        const tartib = soni.get().soni;
        const sozlar = tanla(tarix());
        qosh.run(sana, vaqt, tartib, JSON.stringify(sozlar));
        for (const soz of sozlar) tarixYoz.run(soz, tartib, tartib);
        db.exec('COMMIT');
        return { tartib, sozlar, qadam: 0, tugadi: 0 };
      } catch (xato) {
        db.exec('ROLLBACK');
        throw xato;
      }
    },
    qadamniYoz: (sana, vaqt, qadam, tugadi) => qadamYoz.run(qadam, tugadi ? 1 : 0, sana, vaqt),
    yop: () => db.close(),
  };
}
