// ============================================================
//  Persistencia simple del idioma preferido de cada usuario.
//  Se guarda en data/idiomas.json  ->  { "userId": "es", ... }
//  (Suficiente para una demo; si algun dia quieres, se cambia por Postgres.)
// ============================================================
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = join(__dirname, '..', 'data', 'idiomas.json');

function cargar() {
  try {
    return JSON.parse(readFileSync(FILE, 'utf8'));
  } catch {
    return {};
  }
}

function guardar(obj) {
  mkdirSync(dirname(FILE), { recursive: true });
  writeFileSync(FILE, JSON.stringify(obj, null, 2));
}

let cache = cargar();

/** Fija (o cambia) el idioma preferido de un usuario. */
export function setIdioma(userId, codigo) {
  cache[userId] = codigo;
  guardar(cache);
}

/** Lista de codigos de idioma elegidos por los usuarios (con repetidos). */
export function getIdiomas() {
  return Object.values(cache);
}
