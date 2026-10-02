# La voz de Garabati

Cómo darle al juego **una voz bonita, cálida y siempre igual** sin depender de
ningún servicio mientras el niño juega.

## 1. por qué no basta el TTS del navegador

La Web Speech API locuta en el dispositivo del niño. Eso trae tres problemas:

1. **Suena robótica.** La voz del sistema en Android es una voz de 2005; el
   truco de subirle el tono (pitch 1.3) para "infantilizarla" la vuelve más
   metálica todavía.
2. **Cambia según la tableta.** El mismo juego suena distinto —o directamente
   no suena— en un Android 5 barato, en un iPad o en un portátil. La estética
   del producto deja de ser tuya.
3. **No hay control de ritmo, emoción ni pausas.** No se puede pedir "más
   despacio" ni "con una sonrisa".

La solución de Garabati: **generar los audios una vez y empaquetarlos con el
juego**. El guion es fijo y corto (**299 frases ≈ 4.700 caracteres ≈ 9 minutos**
de audio), así que se puede pre-renderizar completo. La Web Speech API queda
solo como **respaldo** si falta algún audio o el navegador no deja sonar un MP3.

## 2. cómo funciona (por dentro)

```
texto → voiceId(texto)  →  voice/<id>.mp3        (lo que se empaqueta)
                        →  content/voiceManifest.ts (ids existentes, generado)

audio.sayAll([...]) → VoiceSequencer     la que suena termina; la nueva espera
                        → ClipVoiceProvider  ¿están TODOS los MP3?
                                             sí → cola de <audio> (onDone real)
                                             no → TtsVoiceProvider (sistema)
```

- Ids **deterministas** (`slug` legible + hash FNV-1a del texto exacto): el
  generador y la app calculan el mismo id, sin tabla que se desincronice.
- **Ninguna locución se corta** (`services/voiceSequencer.ts`): la voz es la
  instrucción, y una frase partida a media palabra no comunica nada a un
  peque. Lo que llega mientras algo suena espera su turno; solo "salir de
  pantalla" o "silenciar" interrumpen (`stopVoice()`). La cola acepta 2
  locuciones pendientes: si se acumulan más, se descartan las más viejas
  (los avisos nuevos son los relevantes) sin tocar la que está sonando.
- **`onDone` real, no temporizadores**: cada locución avisa de su final
  (clip `ended`, TTS `onend`, perro guardián si un WebView nunca avisa). Con
  eso la actividad encadena *presentación → demostración* sin cortar nada.
- El juego **nunca mezcla** clip y TTS en la misma locución.
- **Cada pantalla da su frase al entrar**: el saludo "¿Quién quiere jugar?"
  (pantalla de perfiles) y "Elige una actividad." (mapa) se piden una vez al
  entrar, no en cada refresco; el mapa solo al abrirse de verdad, para no
  repetirla al volver de una actividad. Ninguna pisa a la anterior: la cola
  las encadena.
- **La recompensa cuenta por pasos** (`services/voiceSteps.ts`): "Cuenta
  conmigo." → "uno" → "dos" → … y **cada estrella aparece cuando su número
  termina de sonar**, no con un temporizador propio. Es el patrón general
  para(locución + visual) sincronizados: el siguiente paso arranca con el
  `onDone` del anterior.
- **La primera locución de la sesión espera al primer toque** (0.8.1): es la
  saludación de la pantalla de perfiles, y pedirla al arrancar no funcionaba
  (el navegador rechaza `play()` sin gesto → respaldo a la voz del sistema,
  que es justo lo que se oía en la pantalla principal). Ahora
  `audio.sayOnFirstGesture("¿Quién quiere jugar?")` engancha un solo disparo en
  `touchstart`/`mousedown`/`keydown` (`services/firstGesture.ts`), desbloquea el
  audio y pide la locución en ese mismo gesto: **con el clip de Paulina**. Si el
  primer toque ya es elegir jugador, no se saluda; y con la voz silenciada la
  espera se cancela.
- **Voz del juego: `Paulina (Español (México))`** (`es_MX`, voz femenina de
  macOS; la mascota, **Lapi**, es femenina). Los 299 MP3 del repositorio
  están generados con ella (`--rate 155 --pitch 1.06`, ver §5) y el manifiesto
  lo declara.
- Los audios viven en `public/voice/` (~3 MB) y el service worker los cachea al
  usarlos, así que se juega sin conexión.
- Los tests (`tests/voice.test.ts`) fallan si el manifiesto, los ficheros y el
  catálogo de frases dejan de coincidir, y `tests/firstGesture.test.ts` falla si
  alguna locución se pide antes de un gesto del niño (la que se caía al TTS).

## 3. servicios que puedes usar

El generador trae cuatro adaptadores; el resto del juego no cambia. Coste
calculado para el guion completo (≈ 4.700 caracteres / ≈ 9 min de audio).

| Servicio | Qué tal para niños | Coste del guion | Licencia y notas |
|---|---|---|---|
| **macOS `say`** (`--provider macos`) | Buena y natural con las voces nuevas (Eddy, Flo, Sandy…), acento es_ES/es_MX. Lo que usa hoy el repositorio. | **0 €** (local, sin cuenta) | Voces del sistema de Apple: válidas para **desarrollo y uso interno**, no para redistribuir comercialmente. Perfecto para prototipar y para decidir el guion. |
| **Piper** (`--provider piper`) | Decente, voz "de audiolibro". 100 % offline. | **0 €** | Modelos MIT/CC-BY → **se puede publicar**. Ideal si quieres coste cero y licencia limpia. |
| **OpenAI** `gpt-4o-mini-tts` | Muy buena y **acepta instrucciones de estilo** ("habla como una maestra de infantil, cálida y pausada"). Voces `nova`, `shimmer`, `coral` encajan bien. | céntimos (< 1 $) | Salida utilizable comercialmente. |
| **Azure Neural TTS** | Muy buena, el catálogo es_ES/es_MX más amplio (incluye voces infantiles y SSML para pausas). | ~0,1 $ (y nivel gratuito mensual) | Comercial. Buena opción para varias voces/personajes. |
| **Google Cloud** (Chirp 3 HD / Neural2) | Muy expresiva y natural. | ~0,1-0,2 $ | Comercial. |
| **Amazon Polly** (Neural) | Buena y muy barata; es-ES y es-MX. | ~0,1 $ (12 meses gratis) | Comercial. |
| **ElevenLabs** | **La más "de dibujos animados"**: su *Voice Library* tiene categoría *Cute* y voces infantiles; `eleven_multilingual_v2` mantiene el acento español. | el guion cabe en el **plan gratuito** (≈ 4.700 créditos de 10.000/mes); Starter (~5 $/mes) para uso comercial | Según plan: la capa gratuita exige atribución; los planes de pago permiten uso comercial. |
| **Clonar una voz propia** | La mejor para un producto infantil: alguien de confianza hablando despacio y con sonrisa. | igual que el servicio del clonador | Necesitas **consentimiento** de la persona; nunca la voz de un niño ajeno. |

**Recomendación**: prototipa con `macos` (ya está hecho), decide el texto con
calma, y publica con **ElevenLabs** (si buscas el tono "dibujo animado") o
**Azure/Google** (si quieres varias voces y control fino con SSML). Si el
proyecto tiene que ser 100 % libre, usa **Piper**.

> **Decisión actual (0.6.1)**: el juego usa **Paulina (Español (México))**, una
> voz femenina `es_MX` de macOS, porque a oído es la que mejor encaja con una
> mascota femenina (**Lapi**) y no cuesta nada. Los audios están versionados en
> `public/voice/`, así que el juego no depende de ningún servicio en
> ejecución. Antes de un lanzamiento comercial hay que **regenerar los 299 MP3
> con un proveedor con licencia de redistribución** (Piper, OpenAI, Azure,
> Google, Polly o ElevenLabs): es un solo comando, el resto del juego no cambia.

## 4. comandos

```bash
# ver el guion completo del juego (frases + ids) y cuántas frases hay
npm run voice:lines

# 19 muestras (misma frase, todas las voces es_* del Mac) para elegir a oído
# → quedan en .voice/auditions/
npm run voice:audition

# generar TODO con las voces del Mac (lo que usa el repositorio hoy;
# Paulina + rate 155 + pitch 1.06 son ya los valores por defecto)
npm run voice:generate -- --prune
# rehacer los 299 audios desde cero (el comando canónico del repo)
npm run voice:generate -- --voice "Paulina (Español (México))" --rate 155 \
  --pitch 1.06 --concurrency 4 --force --prune

# regenerar con otra voz / otro ritmo / otro tono
npm run voice:generate -- --voice "Sandy (Español (México))" --rate 150 --pitch 1.12 --force

# servicios en la nube (la clave solo vive en tu máquina, nunca en la app)
ELEVENLABS_API_KEY=xxx npm run voice:generate -- --provider elevenlabs --voice "<VOICE_ID>"
OPENAI_API_KEY=xxx     npm run voice:generate -- --provider openai --voice nova
npm run voice:generate -- --provider piper --model ~/piper/es_ES-voz.onnx

# utilidades
npm run voice:generate -- --dry-run        # qué haría, sin llamar a nada
npm run voice:generate -- --limit 5        # probar con las 5 primeras
npm run voice:generate -- --prune          # borrar MP3 de frases que ya no existen
```

Después de generar, **commitea `public/voice/` y el manifiesto**: el juego se
sirve ya con la voz nueva y sin ninguna dependencia externa en ejecución.

### Flujo de trabajo al cambiar frases

1. Editas `content/phrases.ts` (o el contenido de un recurso).
2. `npm test` → `tests/voice.test.ts` te dice exactamente qué frases quedan sin
   audio.
3. `npm run voice:generate` → solo sintetiza las nuevas (usa `--force` para
   rehacerlo todo con una voz distinta).
4. `npm test` en verde y commit.

## 5. detalles que conviene saber

### Ritmo y tono (por qué 155 y 1.06)

Los 299 MP3 se generan con `--rate 155 --pitch 1.06`. No es casualidad: se
barreron 19 combinaciones (`--rate` 145/155/165 × `--pitch` 1.00–1.24)
midiendo cada muestra con `ffprobe` y analizando el audio con numpy
(F0 por autocorrelación y reparto espectral). Lo que salió:

| `--rate` | dur. 20 frases | ritmo a la velocidad del juego (0.88) | veredicto |
|---|---|---|---|
| ≤ 154 (p. ej. 145) | 36,3 s | 102 palabras/min · 10,2 car/s | ~10 % más lento sin ganancia de claridad: cada frase se estira y el niño espera más |
| **155 – 181** | **33,0 s** | **112 palabras/min · 11,3 car/s** | **el que se queda**: pausado para 3–6 años y sin arrastrar |
| ≥ 182 | −4 % de duración | ~127 palabras/min · 12,8 car/s | ya demasiado rápido para una instrucción: descartado |

| `--pitch` | F0 | energía 300–3400 Hz (banda de inteligibilidad) | veredicto |
|---|---|---|---|
| 1.00 | 162 Hz | 32,8 % | la voz natural, pero más apagada |
| **1.06** | **173 Hz** | **34,6 %** | **el que se queda**: +1 semitono, cálido sin perder claridad |
| 1.12 (0.7.0) | 183 Hz | 35,8 % | válido, algo más agudo |
| 1.18 – 1.24 | 193–201 Hz | 37–39 % | más brillante pero fino, "chipmunk" en un móvil |

Tres hallazgos que no se oían a ojo:

- **`say` cuantiza `--rate`**: los valores de un mismo tramo producen MP3
  **bit a bit idénticos** (145 vs 155 vs 165 → solo dos ritmos reales; los
  cortes están en ~155, ~182 y ~190). Afinar el ritmo con `--rate` no tiene
  sentido; el ajuste fino de ritmo vive en el ajuste 🐢 (`playbackRate`).
- **`--pitch` no cambia la duración** (el `asetrate`+`atempo` de `toMp3`
  desplaza el tono y devuelve la velocidad), así que las duraciones son
  comparables entre tonos y el encadenamiento *presentación → demo* no varía
  al tocar el tono.
- **El tono es un desplazamiento puro**: la variación de F0 (p90−p10) es
  proporcional al factor (~45 % del propio F0 en todos los casos), o sea
  que `--pitch` no añade ni quita expresividad: elige por el F0 y déjalo.

- **Ajuste 🐢 "voz pausada"** (activado por defecto en la puerta parental):
  reproduce los clips a `playbackRate` 0.88, sin cambiar el tono. Los MP3 se
  graban a 155 ppm con tono 1.06 (un locutor adulto va a ~175 ppm), ya
  pensados para 3–6 años: medidos en el juego, **112 palabras por minuto** y
  11,3 caracteres por segundo. Si se busca aún más calma, ese ajuste 🐢 es
  el sitio; bajar `--rate` no añade nada (`say` lo cuantiza).
- **Desbloqueo de audio**: en el primer toque suena `voice/silencio.mp3`
  (100 ms, volumen mínimo) para que Chrome/Android permita los audios después.
- **Si falta un audio**, esa locución completa pasa al TTS: el juego nunca se
  queda mudo ni a medias.
- **Ajustes** muestra qué voz está activa: *"🎙️ Voz del juego: macos ·
  Paulina (Español (México)) (299 audios)"* o *"voz del sistema"*.
- **Peso**: 3,3 MB de MP3 mono 22 kHz a 48 kbps (~6 KB por segundo de voz). Se
  descargan bajo demanda y quedan en la caché del service worker; no se
  precargan.
- **Escribir para voz**: frases de 2–5 palabras, con exclamaciones y signos
  (las pausas del guion se oyen en el audio final), y nada de siglas. Lo que
  el adulto lee en pantalla y lo que el niño oye deben ser exactamente el
  mismo texto: por eso el catálogo es único.
- **Nada de claves en el cliente**: los servicios se llaman solo desde tu
  ordenador al generar; la app publicada no habla con nadie.
