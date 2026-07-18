// ============================================================
//  Capa de traduccion (independiente de Discord).
//  - Si hay DEEPL_API_KEY en el .env  -> usa DeepL (mejor calidad).
//  - Si no                            -> usa el traductor libre de Google
//                                        (sin API key, ideal para demos).
//  Ambos AUTODETECTAN el idioma de origen.
// ============================================================
import 'dotenv/config';

// Google detecta a veces codigos regionales (es-419, zh-CN...). Los reducimos
// a su codigo base para comparar "origen == destino".
export const norm = (c) => (c || '').toLowerCase().split('-')[0];

// Algunos idiomas usan un codigo distinto en DeepL.
const DEEPL_TARGET = {
  en: 'EN-US', pt: 'PT-PT', es: 'ES', fr: 'FR', de: 'DE', it: 'IT',
  ja: 'JA', ko: 'KO', ru: 'RU', zh: 'ZH', ar: 'AR', nl: 'NL',
};

// La libreria libre es ESM y su "shape" de export varia entre versiones,
// asi que la cargamos de forma defensiva una sola vez.
let _libre;
async function traductorLibre() {
  if (_libre) return _libre;
  const mod = await import('google-translate-api-x');
  _libre = mod.translate || mod.default || mod;
  return _libre;
}

/**
 * Traduce `texto` al idioma `destino` (codigo ISO: 'es', 'en', 'zh'...).
 * Devuelve { texto, origen } donde `origen` es el idioma detectado.
 */
export async function traducir(texto, destino) {
  if (process.env.DEEPL_API_KEY) return traducirDeepL(texto, destino);
  return traducirGoogleLibre(texto, destino);
}

async function traducirGoogleLibre(texto, destino) {
  const translate = await traductorLibre();
  const res = await translate(texto, { to: destino });
  return { texto: res.text, origen: norm(res.from?.language?.iso) };
}

async function traducirDeepL(texto, destino) {
  const target = DEEPL_TARGET[norm(destino)] || destino.toUpperCase();
  const key = process.env.DEEPL_API_KEY;
  // Las keys gratuitas terminan en ":fx" y usan otro host.
  const host = key.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com';

  const body = new URLSearchParams();
  body.append('text', texto);
  body.append('target_lang', target);

  const r = await fetch(`${host}/v2/translate`, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  if (!r.ok) throw new Error(`DeepL ${r.status}: ${await r.text()}`);
  const data = await r.json();
  const t = data.translations[0];
  return { texto: t.text, origen: norm(t.detected_source_language) };
}
