// Prueba rapida de la capa de traduccion, SIN necesitar Discord ni token.
//   node src/test-traductor.js
import { traducir } from './translate.js';

const casos = [
  { texto: 'Hola, como estas?', destino: 'en' },
  { texto: '你好，很高兴认识你', destino: 'es' },
  { texto: 'Good morning everyone', destino: 'es' },
];

for (const c of casos) {
  try {
    const r = await traducir(c.texto, c.destino);
    console.log(`[${r.origen} -> ${c.destino}] "${c.texto}"  =>  "${r.texto}"`);
  } catch (e) {
    console.error(`FALLO "${c.texto}" -> ${c.destino}:`, e.message);
  }
}
