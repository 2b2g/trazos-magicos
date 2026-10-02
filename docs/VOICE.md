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
juego**. El guion es fijo y corto (**303 frases ≈ 4.700 caracteres ≈ 9 minutos**
de audio), así que se puede pre-renderizar completo. La Web Speech API queda
solo como **respaldo** si falta algún audio o el navegador no deja sonar un MP3.

## 2. cómo funciona (por dentro)

```
texto → voiceId(texto)  →  voice/<id>.mp3        (lo que se empaqueta)
                        →  content/voiceManifest.ts (ids existentes, generado)

audio.sayAll([...]) → ClipVoiceProvider  ¿están TODOS los MP3? → sí: cola de <audio>
                                         no → TtsVoiceProvider (voz del sistema)
```

- Ids **deterministas** (`slug` legible + hash FNV-1a del texto exacto): el
  generador y la app calculan el mismo id, sin tabla que se desincronice.
- El juego **nunca mezcla** clip y TTS en la misma locución.
- Los audios viven en `public/voice/` (~3 MB) y el service worker los cachea al
  usarlos, así que se juega sin conexión.
- Los tests (`tests/voice.test.ts`) fallan si el manifiesto, los ficheros y el
  catálogo de frases dejan de coincidir.

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

## 4. comandos

```bash
# ver el guion completo del juego (frases + ids) y cuántas frases hay
npm run voice:lines

# 19 muestras (misma frase, todas las voces es_* del Mac) para elegir a oído
# → quedan en .voice/auditions/
npm run voice:audition

# generar TODO con las voces del Mac (lo que usa el repositorio hoy)
npm run voice:generate -- --voice "Flo (Español (España))" --prune

# regenerar con otra voz / otro ritmo / otro tono
npm run voice:generate -- --voice "Sandy (Español (México))" --rate 150 --pitch 1.08 --force

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

- **Ajuste 🐢 "voz pausada"** (activado por defecto en la puerta parental):
  reproduce los clips a `playbackRate` 0.88, sin cambiar el tono. Los MP3 se
  graban a 155 palabras por minuto (un locutor adulto va a ~175), ya pensados
  para 3–6 años.
- **Desbloqueo de audio**: en el primer toque suena `voice/silencio.mp3`
  (100 ms, volumen mínimo) para que Chrome/Android permita los audios después.
- **Si falta un audio**, esa locución completa pasa al TTS: el juego nunca se
  queda mudo ni a medias.
- **Ajustes** muestra qué voz está activa: *"🎙️ Voz del juego: macos · Flo
  (Español (España)) (303 audios)"* o *"voz del sistema"*.
- **Peso**: 3,3 MB de MP3 mono 22 kHz a 48 kbps (~6 KB por segundo de voz). Se
  descargan bajo demanda y quedan en la caché del service worker; no se
  precargan.
- **Escribir para voz**: frases de 2–5 palabras, con exclamaciones y signos
  (las pausas del guion se oyen en el audio final), y nada de siglas. Lo que
  el adulto lee en pantalla y lo que el niño oye deben ser exactamente el
  mismo texto: por eso el catálogo es único.
- **Nada de claves en el cliente**: los servicios se llaman solo desde tu
  ordenador al generar; la app publicada no habla con nadie.
