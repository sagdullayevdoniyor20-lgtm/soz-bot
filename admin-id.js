// Telegram ID ingizni topadi: avval botga Telegramda /start yozing, keyin `npm run admin-id`.
// Topilgan ID ni .env fayliga ADMIN_ID=... qilib yozing.
import { join } from 'node:path';

try {
  process.loadEnvFile(join(import.meta.dirname, '.env'));
} catch (xato) {
  if (xato.code !== 'ENOENT') throw xato;
}
const token = process.env.BOT_TOKEN?.trim();
if (!token) {
  console.error(".env faylida BOT_TOKEN yo'q.");
  process.exit(1);
}

const javob = await fetch(`https://api.telegram.org/bot${token}/getUpdates`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ allowed_updates: ['message'] }),
  signal: AbortSignal.timeout(20_000),
});
const natija = await javob.json();
if (!natija.ok) {
  console.error(`Telegram xatosi ${natija.error_code}: ${natija.description}`);
  process.exit(1);
}

const yozganlar = new Map();
for (const { message: xabar } of natija.result) {
  if (xabar?.chat?.type === 'private' && xabar.from) {
    const f = xabar.from;
    yozganlar.set(f.id, [f.first_name, f.last_name].filter(Boolean).join(' ') + (f.username ? ` (@${f.username})` : ''));
  }
}

if (yozganlar.size === 0) {
  console.log("Hech kim botga yozmagan. Telegramda botingizni ochib /start bosing va buyruqni qayta ishga tushiring.");
} else {
  for (const [id, ism] of yozganlar) console.log(`${ism}: ADMIN_ID=${id}`);
  console.log("O'zingizning qatoringizni .env fayliga qo'shing.");
}
