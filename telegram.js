const API = 'https://api.telegram.org';
const QAYTA_URINISHLAR = 3;

export class TelegramXatosi extends Error {
  constructor(kod, tavsif, kutishSoniyasi) {
    super(`Telegram xatosi ${kod}: ${tavsif}`);
    this.kod = kod;
    this.kutishSoniyasi = kutishSoniyasi;
  }
}

const kutish = (ms) => new Promise((tugadi) => setTimeout(tugadi, ms));

export function telegramMijozi(token) {
  // malumot oddiy obyekt (JSON) yoki FormData (fayl yuborish uchun) bo'lishi mumkin.
  async function sorov(metod, malumot) {
    const forma = malumot instanceof FormData;
    for (let urinish = 0; ; urinish++) {
      try {
        const javob = await fetch(`${API}/bot${token}/${metod}`, {
          method: 'POST',
          headers: forma ? undefined : { 'Content-Type': 'application/json' },
          body: forma ? malumot : JSON.stringify(malumot),
          signal: AbortSignal.timeout(forma ? 60_000 : 20_000),
        });
        const natija = await javob.json();
        if (!natija.ok) {
          throw new TelegramXatosi(natija.error_code, natija.description, natija.parameters?.retry_after);
        }
        return natija.result;
      } catch (xato) {
        // 429 (juda ko'p so'rov) bo'lsa, Telegram aytgan vaqtcha kutib, qayta uriniladi.
        if (xato instanceof TelegramXatosi && xato.kutishSoniyasi && urinish < QAYTA_URINISHLAR) {
          await kutish(xato.kutishSoniyasi * 1000 + 500);
          continue;
        }
        throw xato;
      }
    }
  }

  return {
    botniOl: () => sorov('getMe', {}),
    chatniOl: (chatId) => sorov('getChat', { chat_id: chatId }),
    xabarYubor: (chatId, matn) =>
      sorov('sendMessage', { chat_id: chatId, text: matn, link_preview_options: { is_disabled: true } }),
    // rasm: Uint8Array (JPEG), izoh: HTML matn.
    rasmYubor(chatId, rasm, izoh) {
      const forma = new FormData();
      forma.append('chat_id', String(chatId));
      forma.append('caption', izoh);
      forma.append('parse_mode', 'HTML');
      forma.append('photo', new Blob([rasm], { type: 'image/jpeg' }), 'rasm.jpg');
      return sorov('sendPhoto', forma);
    },
    // Kanalda testlar faqat anonim bo'ladi.
    testYubor: (chatId, savol) =>
      sorov('sendPoll', {
        chat_id: chatId,
        question: savol.savol,
        options: savol.variantlar.map((text) => ({ text })),
        type: 'quiz',
        correct_option_id: savol.togriIndeks,
        explanation: savol.izoh,
        is_anonymous: true,
      }),
  };
}
