// ============================================================
//  Bot de Discord "Traductor de canal".
//  Flujo: cada persona elige el idioma en el que quiere LEER (con /idioma,
//  que muestra un menu de banderas). Cada mensaje se traduce a todos los
//  idiomas elegidos. Es bidireccional.
// ============================================================
import 'dotenv/config';
import {
  Client, GatewayIntentBits, Events, EmbedBuilder, MessageFlags,
  REST, Routes, SlashCommandBuilder,
  StringSelectMenuBuilder, ActionRowBuilder,
} from 'discord.js';
import { traducir, norm } from './translate.js';
import { setIdioma, getIdiomas } from './store.js';

// Limpia valores del entorno: quita espacios, saltos de linea y comillas que
// a veces se cuelan al pegar en el panel del hosting (y provocan el error
// "invalid Authorization header" al conectar con Discord).
const limpiar = (v) => (v || '').trim().replace(/^["']|["']$/g, '').trim();

const TOKEN = limpiar(process.env.DISCORD_TOKEN);
const GUILD_ID = limpiar(process.env.GUILD_ID);
const CHANNEL_ID = limpiar(process.env.CHANNEL_ID); // opcional: limita a un canal
const DEFAULTS = (process.env.TARGET_LANGS || 'es,en')
  .split(',').map((s) => norm(s)).filter(Boolean);

// ---- Catalogo de idiomas (unica fuente de la verdad) ----
// c = codigo, n = nombre, f = bandera. De aqui salen tanto las etiquetas
// bonitas como las opciones del menu desplegable.
const LANGS = [
  { c: 'es', n: 'Español', f: '🇪🇸' }, { c: 'en', n: 'English', f: '🇬🇧' },
  { c: 'pt', n: 'Português', f: '🇧🇷' }, { c: 'fr', n: 'Français', f: '🇫🇷' },
  { c: 'de', n: 'Deutsch', f: '🇩🇪' }, { c: 'it', n: 'Italiano', f: '🇮🇹' },
  { c: 'nl', n: 'Nederlands', f: '🇳🇱' }, { c: 'pl', n: 'Polski', f: '🇵🇱' },
  { c: 'ru', n: 'Русский', f: '🇷🇺' }, { c: 'uk', n: 'Українська', f: '🇺🇦' },
  { c: 'tr', n: 'Türkçe', f: '🇹🇷' }, { c: 'sv', n: 'Svenska', f: '🇸🇪' },
  { c: 'no', n: 'Norsk', f: '🇳🇴' }, { c: 'da', n: 'Dansk', f: '🇩🇰' },
  { c: 'fi', n: 'Suomi', f: '🇫🇮' }, { c: 'cs', n: 'Čeština', f: '🇨🇿' },
  { c: 'sk', n: 'Slovenčina', f: '🇸🇰' }, { c: 'ro', n: 'Română', f: '🇷🇴' },
  { c: 'hu', n: 'Magyar', f: '🇭🇺' }, { c: 'el', n: 'Ελληνικά', f: '🇬🇷' },
  { c: 'bg', n: 'Български', f: '🇧🇬' }, { c: 'hr', n: 'Hrvatski', f: '🇭🇷' },
  { c: 'sr', n: 'Српски', f: '🇷🇸' }, { c: 'is', n: 'Íslenska', f: '🇮🇸' },
  { c: 'zh', n: '中文', f: '🇨🇳' }, { c: 'ja', n: '日本語', f: '🇯🇵' },
  { c: 'ko', n: '한국어', f: '🇰🇷' }, { c: 'hi', n: 'हिन्दी', f: '🇮🇳' },
  { c: 'bn', n: 'বাংলা', f: '🇧🇩' }, { c: 'ta', n: 'தமிழ்', f: '🇮🇳' },
  { c: 'te', n: 'తెలుగు', f: '🇮🇳' }, { c: 'ur', n: 'اردو', f: '🇵🇰' },
  { c: 'fa', n: 'فارسی', f: '🇮🇷' }, { c: 'ar', n: 'العربية', f: '🇸🇦' },
  { c: 'he', n: 'עברית', f: '🇮🇱' }, { c: 'th', n: 'ไทย', f: '🇹🇭' },
  { c: 'vi', n: 'Tiếng Việt', f: '🇻🇳' }, { c: 'id', n: 'Indonesia', f: '🇮🇩' },
  { c: 'ms', n: 'Melayu', f: '🇲🇾' }, { c: 'tl', n: 'Filipino', f: '🇵🇭' },
  { c: 'my', n: 'မြန်မာ', f: '🇲🇲' }, { c: 'km', n: 'ខ្មែរ', f: '🇰🇭' },
  { c: 'sw', n: 'Kiswahili', f: '🇰🇪' }, { c: 'af', n: 'Afrikaans', f: '🇿🇦' },
  { c: 'sq', n: 'Shqip', f: '🇦🇱' }, { c: 'lt', n: 'Lietuvių', f: '🇱🇹' },
  { c: 'lv', n: 'Latviešu', f: '🇱🇻' }, { c: 'et', n: 'Eesti', f: '🇪🇪' },
];

const INFO = Object.fromEntries(LANGS.map((l) => [l.c, [l.n, l.f]]));
const etiqueta = (c) => {
  const i = INFO[norm(c)];
  return i ? `${i[1]} ${i[0]}` : c;
};

if (!TOKEN) {
  console.error('❌ Falta DISCORD_TOKEN en el archivo .env (copia .env.example a .env).');
  process.exit(1);
}

// Idiomas activos = los del .env  +  los que la gente eligio con /idioma.
function idiomasActivos() {
  return [...new Set([...DEFAULTS, ...getIdiomas().map(norm)])];
}

// Menus desplegables con banderas (Discord permite max 25 opciones por menu,
// asi que partimos el catalogo en varios menus dentro del mismo mensaje).
function menusDeIdioma() {
  const filas = [];
  for (let k = 0; k < LANGS.length; k += 25) {
    const grupo = LANGS.slice(k, k + 25);
    const menu = new StringSelectMenuBuilder()
      .setCustomId(`sel_idioma_${k}`)
      .setPlaceholder('🌐 Elige tu idioma...')
      .addOptions(grupo.map((l) => ({ label: `${l.f} ${l.n}`, value: l.c })));
    filas.push(new ActionRowBuilder().addComponents(menu));
  }
  return filas;
}

// ---------- Slash commands ----------
const comandos = [
  new SlashCommandBuilder()
    .setName('idioma')
    .setDescription('Elige el idioma en el que quieres LEER los mensajes')
    .addStringOption((o) => o
      .setName('codigo')
      .setDescription('Opcional: codigo ISO (es, en, pl...). Si lo dejas vacio, te muestro un menu.')
      .setRequired(false))
    .toJSON(),
  new SlashCommandBuilder()
    .setName('idiomas')
    .setDescription('Muestra a que idiomas se esta traduciendo ahora')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Publica un panel fijo para que TODOS elijan su idioma')
    .toJSON(),
];

async function registrarComandos(appId) {
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  if (GUILD_ID) {
    await rest.put(Routes.applicationGuildCommands(appId, GUILD_ID), { body: comandos });
    console.log(`✓ Comandos /idioma y /idiomas registrados en el servidor ${GUILD_ID}`);
  } else {
    await rest.put(Routes.applicationCommands(appId), { body: comandos });
    console.log('✓ Comandos globales registrados (pueden tardar ~1h en aparecer)');
  }
}

// ---------- Cliente ----------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // PRIVILEGIADO: activar en el portal
  ],
});

client.once(Events.ClientReady, async (c) => {
  console.log(`🤖 Bot conectado como ${c.user.tag}`);
  console.log(`🌐 Idiomas por defecto: ${idiomasActivos().join(', ')}`);
  console.log(`🗂️  Idiomas disponibles en el menu: ${LANGS.length}`);
  try {
    await registrarComandos(c.user.id);
  } catch (e) {
    console.error('No se pudieron registrar los comandos:', e.message);
    console.error('   → Re-invita el bot con el scope "applications.commands" y reinicia.');
  }
});

client.on(Events.InteractionCreate, async (i) => {
  try {
    // Comando /idioma  (con codigo directo o mostrando el menu)
    if (i.isChatInputCommand() && i.commandName === 'idioma') {
      const code = i.options.getString('codigo');
      if (code) {
        const c = norm(code);
        setIdioma(i.user.id, c);
        await i.reply({
          content: `✅ Listo. Ahora recibirás los mensajes en **${etiqueta(c)}**.`,
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await i.reply({
          content: '🌐 Elige el idioma en el que quieres **leer** los mensajes:',
          components: menusDeIdioma(),
          flags: MessageFlags.Ephemeral,
        });
      }
      return;
    }

    // Comando /idiomas
    if (i.isChatInputCommand() && i.commandName === 'idiomas') {
      await i.reply({
        content: `🌐 Ahora mismo se traduce a: ${idiomasActivos().map(etiqueta).join('  ·  ')}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Comando /panel  -> publica el selector PUBLICO en el canal (para todos)
    if (i.isChatInputCommand() && i.commandName === 'panel') {
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('🌐 Elige tu idioma · Choose your language')
        .setDescription(
          'Selecciona en el menú el idioma en el que quieres **leer** los mensajes.\n' +
          'Todo lo que se escriba en este canal se traducirá automáticamente para ti.',
        );
      await i.reply({ embeds: [embed], components: menusDeIdioma() });
      return;
    }

    // El usuario eligio idioma en el menu (sirve igual en /idioma y en el panel).
    // Responde en PRIVADO y no toca el panel, para que siga disponible para todos.
    if (i.isStringSelectMenu() && i.customId.startsWith('sel_idioma')) {
      const c = norm(i.values[0]);
      setIdioma(i.user.id, c);
      await i.reply({
        content: `✅ Listo. Ahora recibirás los mensajes en **${etiqueta(c)}**.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  } catch (e) {
    console.error('Error en interacción:', e.message);
  }
});

client.on(Events.MessageCreate, async (msg) => {
  try {
    if (msg.author.bot || msg.system) return;        // ignora bots y avisos
    if (!msg.guild) return;                            // solo en servidores
    if (CHANNEL_ID && msg.channelId !== CHANNEL_ID) return;

    const texto = msg.content?.trim();
    if (!texto) return;                                // adjuntos sin texto
    if (/^[/!.]/.test(texto)) return;                  // parece un comando

    const objetivos = idiomasActivos();
    const lineas = [];
    let origen = null;

    for (const destino of objetivos) {
      try {
        const { texto: traducido, origen: src } = await traducir(texto, destino);
        if (origen === null) origen = src;
        if (norm(destino) === norm(src)) continue;     // no traducir al mismo idioma
        if (traducido.trim().toLowerCase() === texto.toLowerCase()) continue;
        lineas.push(`${etiqueta(destino)} — ${traducido}`);
      } catch (e) {
        console.error(`Error traduciendo a ${destino}:`, e.message);
      }
    }

    if (!lineas.length) return; // nada que aportar (todos hablaban ese idioma)

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setAuthor({
        name: msg.member?.displayName || msg.author.username,
        iconURL: msg.author.displayAvatarURL(),
      })
      .setDescription(lineas.join('\n'))
      .setFooter({ text: origen ? `Idioma detectado: ${etiqueta(origen)}` : 'Traducción automática' });

    await msg.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
  } catch (e) {
    console.error('Error en messageCreate:', e.message);
  }
});

client.login(TOKEN);
