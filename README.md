# 🌐 Bot traductor de Discord

Traduce **automáticamente** los mensajes de un canal a varios idiomas, para que
gente que escribe en distintos idiomas se entienda. Pensado para tu servidor
**Resident Evil {Palmon Survival}**.

- Cada mensaje se traduce y el bot responde con las traducciones.
- Cada persona fija **su** idioma con `/idioma <código>` (ej. `/idioma es`).
- `/idiomas` muestra a qué idiomas se está traduciendo.
- Sin API key usa el **traductor libre de Google**; opcionalmente **DeepL** para mejor calidad.

> Requisitos: **Node.js 18 o superior**.

---

## Parte A — Lo que TÚ tienes que hacer en Discord (una sola vez)

Esto solo puedes hacerlo tú porque necesita tu cuenta de Discord.

### 1) Crear el bot y copiar el TOKEN
1. Entra a **https://discord.com/developers/applications** y pulsa **New Application**. Ponle un nombre (ej. `Traductor Palmon`).
2. Menú izquierdo → pestaña **Bot** → botón **Reset Token** → **Copy**. Guarda ese texto: es tu `DISCORD_TOKEN`.
   - ⚠️ El token es como una contraseña. No lo compartas ni lo subas a GitHub.

### 2) Activar el permiso para leer mensajes
En la misma pestaña **Bot**, baja hasta **Privileged Gateway Intents** y **activa**:
- ✅ **MESSAGE CONTENT INTENT**

(Sin esto el bot no puede leer el texto de los mensajes y no traducirá nada.)

### 3) Invitar el bot a tu servidor
1. Menú izquierdo → **OAuth2** → **URL Generator**.
2. En **Scopes** marca: `bot` y `applications.commands`.
3. En **Bot Permissions** marca: **View Channels**, **Send Messages**, **Read Message History**, **Embed Links**.
4. Copia la **URL generada** abajo, ábrela en el navegador y elige tu servidor **Resident Evil {Palmon Survival}** → **Autorizar**.

### 4) Copiar los IDs
1. En Discord: **Ajustes de usuario → Avanzado → activar "Modo desarrollador"**.
2. Clic derecho sobre el **icono del servidor** → **Copiar ID del servidor** → ese es tu `GUILD_ID`.
3. (Opcional) Clic derecho sobre el **canal** donde quieres el traductor → **Copiar ID del canal** → ese es tu `CHANNEL_ID`.

---

## Parte B — Poner en marcha el bot (en esta carpeta)

```bash
cd discord-bot

# 1. Instalar dependencias
npm install

# 2. Crear tu archivo de configuración a partir del ejemplo
#    (Windows PowerShell)
copy .env.example .env
#    (Mac/Linux)
#    cp .env.example .env

# 3. Abre .env y pega tu DISCORD_TOKEN y tu GUILD_ID (y CHANNEL_ID si quieres).

# 4. Arrancar el bot
npm start
```

Si todo va bien verás en la consola:

```
🤖 Bot conectado como Traductor Palmon#1234
🌐 Idiomas por defecto: es, en
✓ Comandos /idioma y /idiomas registrados en el servidor ...
```

Escribe algo en el canal y el bot responderá con la traducción. 🎉

---

## Uso dentro de Discord

| Acción | Comando / cómo |
|---|---|
| Fijar mi idioma | `/idioma es` (o `en`, `pt`, `fr`, `zh`, `ja`, `ru`, `ko`, `ar`...) |
| Ver idiomas activos | `/idiomas` |
| Traducir un mensaje | Solo **escríbelo**; el bot lo hace solo |

Los idiomas de `TARGET_LANGS` (en `.env`) se traducen **siempre**; además se añade
el idioma que cada persona elija con `/idioma`.

---

## Probar solo el traductor (sin Discord)

Para comprobar que la traducción funciona sin montar nada de Discord:

```bash
npm run test:traductor
```

---

## Calidad de la traducción (opcional)

Por defecto se usa un traductor **gratuito y sin registro** (bueno para demos, pero
puede limitarse si se usa mucho). Para traducción más estable y de mejor calidad:

1. Crea una cuenta gratis en **https://www.deepl.com/pro-api** (500.000 caracteres/mes gratis).
2. Copia tu API key y pégala en `.env` como `DEEPL_API_KEY=...`.

El bot detecta la key automáticamente y empieza a usar DeepL.

---

## Problemas frecuentes

- **No traduce nada** → revisa que activaste **MESSAGE CONTENT INTENT** (Parte A, paso 2).
- **No aparecen los comandos `/idioma`** → asegúrate de haber puesto `GUILD_ID` en `.env` (así aparecen al instante).
- **`Used disallowed intents` al arrancar** → igual que el primero: falta activar el intent en el portal.
- **El bot no ve el canal** → dale permiso de **Ver canal** y **Enviar mensajes** en ese canal.
