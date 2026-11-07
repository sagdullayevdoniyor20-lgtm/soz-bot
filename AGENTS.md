# So'z bot: loyiha qoidalari

Telegram bot ingliz tilini o'rganuvchilar uchun kanalga har kuni 2 marta (08:00 va 20:00, Toshkent) dars yuboradi: 10 ta yangi so'z (birikmasi bilan) va shu so'zlar bo'yicha 10 ta test (quiz, 4 variant).

## Texnik cheklovlar

- Faqat Node.js (22.13 yoki yangiroq) va uning ichki modullari. **Kutubxona o'rnatilmaydi:** `package.json` da `dependencies` bo'lmaydi.
- Baza: `node:sqlite`, `soz.db` fayli, `darslar` va `sozlar_tarixi` jadvallari.
- Telegram API bilan ichki `fetch` orqali ishlanadi. Bot faqat yuboradi, xabar qabul qilmaydi (`admin-id.js` bundan mustasno).
- Kod ES modul (`import`) ko'rinishida yoziladi. Nomlar va foydalanuvchiga chiqadigan matnlar o'zbekcha (lotin).

## Fayllar

| Fayl | Vazifasi |
|---|---|
| `bot.js` | Kompyuterda doimiy ishlash: har 30 soniyada jadvalni tekshiradi (`npm start`, baza `soz.db`) |
| `bir-marta.js` | GitHub Actions: vaqti kelgan darsni yuboradi va chiqadi (baza `holat/darslar.db`) |
| `.github/workflows/dars.yml` | Actions jadvali: har bir darsga 3 ta urinish, oxirida holatni commit qiladi |
| `telegram.js` | Telegram API so'rovlari (`sendMessage`, `sendPoll`), 429 da qayta urinish |
| `baza.js` | Barcha SQL shu yerda |
| `jadval.js` | Toshkent vaqti va qaysi dars yuborilishi kerakligi |
| `sozlar.js` | `sozlar/*.json` ni yuklash |
| `savollar.js` | Dars so'zlari, so'zlar xabari va testlarni tuzish; tarmoqqa chiqmaydi |
| `yuborish.js` | Bitta darsni ketma-ket yuborish va qayerga yetganini saqlash |
| `xabarnoma.js` | So'zlar tugab qolayotgani haqida adminga xabar matni; tarmoqqa chiqmaydi |
| `admin-id.js` | `npm run admin-id`: botga /start bosgan odamlarning Telegram ID sini chiqaradi |
| `sinov.js` | `npm run sinov`: bitta darsni hozir ADMIN_ID ga (`-- kanal` bilan kanalga) yuboradi; vaqtinchalik bazada |
| `namuna.js` | Darsni tarmoqsiz ekranga chiqarish: `npm run namuna -- 5` |

## So'zlar bazasi

- `sozlar/a2.json`, `b1.json`, `b2.json`. Har bir qator: `[so'z, turkum, tarjima, birikma, birikma tarjimasi, gap, gap tarjimasi]`.
- Turkum: `n`, `v`, `adj`, `adv`. Gapda so'z shakli kvadrat qavsda bo'ladi: `She [lost] her keys.`
- Qavsdan oldin `a`/`an` turmasin (javobni oshkor qiladi). Tarjimalar 100 belgidan oshmasin (Telegram variant chegarasi).
- Darslar A2 → B1 → B2 tartibida, har bir daraja ichida turkumlar aralash keladi.
- Har bir darsga hali yuborilmagan so'zlar (bazadagi tartibda) olinadi; yuborilgan so'zlar `sozlar_tarixi` da saqlanadi. Yangi so'zlar tugasa, eng uzoq vaqt oldin yuborilgan so'zlar takrorlanadi.
- So'zlar har bir dars oldidan qayta o'qiladi: faylga qo'shilgan so'z botni qayta ishga tushirmasdan keyingi darsga tushadi.
- Yangi so'z qo'shilsa, `npm test` bazani to'liq tekshiradi.

## Xulq-atvor qoidalari

- Dars: avval 10 ta so'z ro'yxati (oddiy matn, `parse_mode` siz), keyin 10 ta test. Test turlari navbat bilan: bo'sh joyni to'ldirish, birikma tarjimasi, gap tarjimasi.
- Kanalda testlar anonim (`is_anonymous: true`).
- Xabarlar orasida 4 soniya pauza (Telegram: bitta chatga daqiqasiga ~20 xabar).
- `ADMIN_ID` (ixtiyoriy) ga xabar: yangi so'zlar 60 tadan (3 kun) kamayganda bir marta, tugaganda bir marta, takrorlash davrida har kuni ertalabki darsdan keyin. Adminga yuborib bo'lmasa, faqat logga yoziladi, dars to'xtamaydi.
- Bot o'chiq bo'lib qolsa, dars 2 soat ichida kechikib yuboriladi, keyin o'tkazib yuboriladi. Bitta dars ikki marta yuborilmaydi; uzilib qolsa, qolgan joyidan davom etadi.

## Ishga tushirish usullari

- **Asosiy usul: GitHub Actions.** `dars.yml` 08:07, 08:37, 09:17 va 20:07, 20:37, 21:17 da (Toshkent) `bir-marta.js` ni ishga tushiradi. Dars faqat bir marta yuboriladi. GitHub jadvalni kechiktirishi mumkin, shuning uchun urinishlar 2 soatlik oyna ichida.
- Sozlamalar GitHub Secrets'da: `BOT_TOKEN`, `KANAL_ID`, `ADMIN_ID`.
- `holat/darslar.db` repozitoriyda saqlanadi va uni faqat workflow o'zgartiradi. Qo'lda tahrirlanmaydi.
- **Ikki usulni bir vaqtda ishlatmang:** Actions yoqiq bo'lsa, kompyuterda `npm start` ishlamasin, aks holda darslar ikki marta boradi.

## Maxfiylik

- `BOT_TOKEN` faqat `.env` da turadi. Uni kodga, logga yoki javoblarga chiqarmang.
- `.env` va `soz.db` Git'ga qo'shilmaydi. Yangi sozlama qo'shilsa, `.env.example` ham yangilanadi.

## Tekshirish

- O'zgarishdan keyin `npm test` ishlatiladi. Testlar tarmoqqa chiqmaydi va vaqtinchalik (`:memory:`) bazada ishlaydi.
- Kompyuterda ishga tushirish: `npm start`. GitHub'da: Actions → «Dars yuborish» → Run workflow.
