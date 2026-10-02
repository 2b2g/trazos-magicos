# Arquitectura — Garabati

> Documento vivo: **cada cambio de código relevante debe reflejarse aquí y en `docs/CHANGELOG.md`.**

## 1. Visión general

Videojuego web de grafomotricidad (FDD v2.0, MVP Fases A–D) para 3–6 años.
Sin framework, sin backend, sin dependencias en runtime. Un solo artefacto
estático: `dist/` (HTML + bundle moderno + bundle ES5 legacy + CSS + SW).

```
┌──────────────────────────────────────────────────────────────────┐
│                        NAVEGADOR (tableta)                       │
│                                                                  │
│  main.ts (orquestador) ── pantallas: perfiles · mapa · actividad │
│        │                                   ajustes (con gate)    │
│        │                                         │               │
│  ┌─────┴──────────────────────────────────────────┴───────────┐   │
│  │                    MOTOR DE TRAZADO                        │   │
│  │  content (datos) → sampling → render (Canvas 2D)           │   │
│  │                       ↓             ↑                      │   │
│  │  touch (entrada) → evaluator (veredicto) → demo (animación)│   │
│  └───────────────────────────┬────────────────────────────────┘   │
│  ui: mascot (Lapi) · decor (cielo) ── util/dom · util/fx (confeti) │
│  services: audio (voz grabada + TTS + SFX) · storage · content/brand│
│  voz: voiceSequencer (nunca corta) → voiceClips (MP3) / TTS          │
│       voiceId · voiceLines ↔ scripts/generate-voice                  │
└──────────────────────────────────────────────────────────────────┘
```

**Regla de dependencias**: `screens → ui + services + engine + content`;
`engine` no conoce pantallas; `ui/` solo pinta a partir de datos simples
(estado de ánimo, estrellas); `content` solo define datos con tipos de `engine/types`.
Ver §13 para el sistema de diseño y sus reglas de compatibilidad.

## 2. Flujo de una actividad (secuencia real)

```
Elige nodo (mapa)
  → renderActivity(res)          (screens/activity.ts)
  → present: TTS + plantilla completa      [input off]
  → playDemo(paths): lápiz recorre trazos  [input off]
  → trace: attachDrawing(canvas)           [input on]
      dedo → onMove → state.live (≥2 px entre puntos)
      dedo up → evaluateStroke(ideal, user, opts adaptativos)
          ├─ passed  → tinta verde + siguiente trazo (o recompensa)
          └─ failed  → "¡Casi!" + failCount++
                        failCount=2 → demo del trazo fallido
                        cada fallo relaja umbrales (ver §4)
  → finishResource: evaluateResource → estrellas 1..3 → reward-layer
  → store.recordAttempt (monótono) → seguir/otra vez
```

## 3. Coordenadas y muestreo

- El contenido define trazos en **normalizado 0..1** (y=0 arriba, como CSS).
- `sampleStroke(segments, {w,h}, inset)` los convierte a px del lienzo.
- **Invariante**: el render y el evaluador usan los MISMOS `scale` e `inset`
  (en la actividad: `inset = 0`; el contenido ya lleva sus márgenes).
- Cada segmento se muestrea proporcionalmente a su longitud (8–160 puntos);
  los trazos multi-segmento se encadenan eliminando duplicados (< 0.5 px).
- `resampleUniform` iguala la densidad de puntos para comparar dedo vs. ideal
  (el dedo emite puntos según hardware, no según distancia).

## 4. Evaluación (engine/evaluator.ts)

Dado `ideal` (remuestreado a `tol/3`) y `user` (remuestreado a 6 px):

| Métrica | Cálculo | Umbral EASY | Umbral STRICT |
|---|---|---|---|
| **Cobertura** | fracción de puntos del ideal a ≤ `tol` de algún punto del niño | 0.65 | 0.72 |
| **Precisión** | `100·(1 − distMedia/(tol·1.6))` | 50 | 65 |
| **Inicio** | `dist(user[0], ideal[0]) ≤ tol·1.6` | — | sí |
| **Dirección** | desplazamiento neto (abiertos) o área con signo (cerrados) | — | sí |
| **Veredicto** | cobertura ∧ precisión ∧ (inicio) ∧ (dirección) | | |

**Relajación adaptativa** (en `screens/activity.ts`, no en el evaluador):
con `f` fallos del trazo actual (tope 4):

```
tol        × (1 + f·0.12)
minCov     − f·0.04   (piso 0.30)
minAcc     − f·3      (piso 35)
checkStart / checkDirection  → off si f ≥ 2
```

Así el niño que lo necesita consigue aprobar por esfuerzo, pero **medio
trazo nunca aprueba** (con tol 34 px sobre un trazo de ~300 px, dibujar la
mitad da cobertura ≈ 0.61 < 0.65). `starsFor`: ≥90 → 3★, ≥75 → 2★, si no 1★;
**nunca 0** y `completed` es pegajoso.

## 5. Entrada táctil (engine/touch.ts)

- Prioridad: Pointer Events → Touch Events + Mouse (Android 5).
- **Rechazo de palma**: solo un puntero activo; el rect se recalcula en cada `down`.
- `preventDefault` en touch (bloquea scroll/zoom nativos); `touch-action: none` en CSS.
- `setPointerCapture` con try/catch (WebViews antiguos lanzan NotFoundError
  si el puntero se suelta antes del capture).
- `attachHold(el, ms, onTick, onDone)`: puerta parental; soltar antes cancela;
  respaldo con `setTimeout` si rAF está congelado.

## 6. Render (engine/render.ts)

`TraceRenderer` dibuja por frame: plantilla (trazos pasados en verde, activo
en púrpura con corredor translúcido 2.4×, futuros tenues), punto de inicio
naranja pulsante, flecha de dirección al 18 % del recorrido, tinta del niño
y superposición de demo. **DPR limitado a 1.5** (gama baja Android 5).

## 7. Audio (services/audio.ts)

Dos proveedores de voz en cadena, una **cola que no corta** y efectos
procedurales. El niño nunca se queda sin voz: si falta un audio, se locuta
con la voz del sistema.

```
sayAll(["¡Muy bien!", "Hacia abajo."])
        │
        ├─ 0. VoiceSequencer       la locución en curso SIEMPRE termina; la
        │      services/voiceSequencer.ts   nueva espera su turno (tope: 2 en
        │                                   cola). onDone encadena sin timers
        ├─ 1. ClipVoiceProvider   ¿existen TODOS los MP3?  →  cola de <audio>
        │      services/voiceClips.ts   (voice/<id>.mp3, offline, voz igual en
        │                                todas las tabletas)
        └─ 2. TtsVoiceProvider    respaldo: Web Speech API del dispositivo
               (es-ES/es-419, rate 0.72/0.9, pitch 1.3/1.15 con ajuste 🐢)
```

- **Ninguna locución se corta** (`services/voiceSequencer.ts`, 1.0): la voz
  es la instrucción y una frase a medias no comunica nada. Lo que llega
  mientras algo suena se pone en cola (tope 2; si se acumula se descartan
  los avisos más viejos, nunca el que suena). Interrumpir es solo
  `stopVoice()`: salir de pantalla o silenciar.
- **`onDone` en vez de temporizadores**: `sayAll(texts, onDone)` avisa del
  final real (clips: `ended`; TTS: `onend`/`onerror`; perro guardián de
  seguridad si un WebView nunca avisa). `screens/activity.ts` encadena
  *presentación → demostración* con ese aviso, no con 1,6 s a ojo.
- **Nunca se mezcla** clip y TTS en la misma locución: si falta una sola
  frase, todo ese turno va al TTS (las pausas quedan naturales).
- **`sayAll(segmentos)`** en vez de concatenar cadenas: la app habla frases
  del catálogo, así que todo es pre-generable. `screens/activity.ts` locuta
  `[ánimo, pista del trazo]` o `[ánimo, "Cuenta conmigo.", "uno, dos",
  "3 estrellas"]` con respiros reales entre segmentos.
- **Ids deterministas** (`services/voiceId.ts`): `slug + hash FNV-1a` del
  texto → mismo id en Node (generador) y en el navegador, sin tabla de
  correspondencia que se pueda desincronizar.
- **Manifiesto compilado** (`content/voiceManifest.ts`, generado): lista de
  ids disponibles. Al ir dentro del bundle no hay petición extra y el juego
  sabe al instante si puede usar el clip (sin esperas ni 404).
- **Audios** en `public/voice/` (~3 MB, 303 frases): el service worker los
  cachea al usarlos (`/voice/` cache-first); no se precargan.
- **Desbloqueo** (política de autoplay): en el primer toque suena
  `voice/silencio.mp3` (100 ms, volumen mínimo) para habilitar el elemento;
  si el navegador bloquea un clip, `onFallback` continúa con TTS.
- **Ajuste 🐢 "voz pausada"** (por defecto): `playbackRate` 0.88 en los clips
  (los MP3 ya se graban a 155 ppm y tono 1.06, más lento que un locutor
  adulto: medido, 112 palabras/min dentro del juego).
- **Efectos**: osciladores WebAudio procedurales (`strokeDone`, `success`,
  `retry`, `tap`, `unlockPrize`) — sin ficheros: offline total y 0 KB extra.
- **Cambiar de voz**: `docs/VOICE.md` (servicios, costes, licencias y el
  comando de un solo paso). El contrato está en `services/voiceTypes.ts`:
  para añadir un proveedor propio basta implementar `VoiceProvider`.

## 8. Persistencia (services/storage.ts)

Claves: `tm.profiles.v1` (array `Profile`), `tm.currentProfile.v1` (id),
`tm.settings.v1` (`{voice, sfx, toleranceBoost}`).

```jsonc
// Profile.progress[recursoId]
{ "bestScore": 97, "stars": 3, "attempts": 2, "completed": true }
```

Garantías: nunca lanza (storage bloqueado → memoria); JSON corrupto → defaults;
progreso **monótono** (max score/stars, completed pegajoso). Sin cuentas ni
red: COPPA/GDPR-K por diseño.

**Regla de desbloqueo (única, vive en `screens/map.ts`)**:
`jugable(i) = completado(i) || i ≤ 1 || completado(i−1)`.
El nodo "actual" es el primero sin completar y jugable.

## 9. Contenido (content/)

Todo es **datos** con tipos de `engine/types.ts`:

```ts
// FDD §8 — anatomía de un grafema
{ id: "letter_A_upper", kind: "letter", char: "A",
  strokes: [ { id: "s1", label: "diagonal izquierda", segments: [...] }, … ],
  meaningEmoji: "✈️", meaningWord: "Avión",
  altOrders: [ ["s1","s2","s3"], ["s2","s1","s3"] ] }  // FDD §7
```

Segmentos disponibles: `line`, `quad`, `cubic`, `arc` (con `sweep` explícito
para evitar ambigüedad módulo 2π), `wave`, `zigzag`. **Añadir una letra**
= una entrada en `lettersPhaseC.ts`; las familias/fases se reordenan en
`families.ts` sin tocar código. Los tests de `tests/engine.test.ts`
validan continuidad geométrica (ningún salto > 40 px) de todo el catálogo.

### 9.1 Caja de escritura y fidelidad de la forma (0.8.0)

Las 27 letras y los 10 números **no llevan números escritos a ojo**: se construyen
con la métrica única de `content/writingBox.ts` (ceja 0,16 · altura de barras
0,50 · media 0,67 · base 0,84 · columnas 0,24/0,76), y las piezas que se tocan se
tocan porque **se calculan** (`diagX()`, `cBody()`, `bowl()`, `ring()`), no porque
alguien las escribiera cerca. Antes la barra de la A iba de 0,28 a 0,72 y se
salía de la letra por los dos lados, y la "~" de la Ñ caía dentro de la caja
de la N en vez de encima.

| Pieza | Dónde |
|---|---|
| Métrica compartida + helpers de geometría | `content/writingBox.ts` |
| Letras construidas con ella | `content/lettersPhaseC.ts` |
| Números (estilo europeo: 1 con palito y base, 4 cerrado, 7 sin raya, 9 recto) | `content/numbersPhaseD.ts` |
| Pauta de 4 líneas que pinta el motor | `ResourceDef.guideLines` → `engine/render.ts` |
| Garantías (10 tests) | `tests/engine.test.ts` → *fidelidad de la caja de escritura* |

- **La pauta**: el contenido declara las líneas (`guideLines`, en `y`
  normalizado) y el render solo las pinta — el motor no sabe qué es una letra.
  Las fases A y B (trazos sueltos) no declaran ninguna, así que no ven pauta.
- **Estilo de escritura**: mayúsculas y cifras comparten altura y caja, para que
  el niño perciba "una fila de letras" y no 37 símbolos sueltos.

## 10. PWA y compatibilidad Android 5 (Chromium 37)

| Restricción | Decisión |
|---|---|
| Sin ES6 | bundle legacy ES5 + core-js (plugin-legacy), targets `chrome>=37, android>=5` |
| Sin CSS Grid / `var()` / flex `gap` | solo flexbox con márgenes, colores literales |
| Pointer Events ausentes | Touch Events primarios, Pointer como mejora |
| DPR alto en gama baja | canvas a 1.5× máx |
| Service Worker desde Chrome 40 | cache-first para assets hash, network-first para navegación |
| `setPointerCapture` frágil | try/catch defensivo |
| Sin `clamp()`/`min()`/`max()` ni `clip-path` | tamaños en `vmin` con media query en px para pantallas cortas |
| Sin woff2 en Safari 9 | `@font-face` con woff2 **y** woff + pila de respaldo del sistema |
| Emoji posteriores a 2014 no existen | solo emoji pre-2014 de un solo code point (nada de ZWJ) |
| Font variable (Fredoka del repo) no soportada | se autohospeda **Fredoka One** estática (OFL) en `public/fonts/` |
| `play()` sin promesa en Chromium 37 | se comprueba si hay `.then` antes de encadenar |
| MP3 mono 22 kHz | compatible con cualquier decodificador de Android 5 (~6 KB/s) |

## 11. Despliegue (Docker)

```
┌─────────────┐   docker build (multi-stage)   ┌──────────────────┐
│  node:20    │ ─────────────────────────────► │  nginx:1.27-alpine│
│  npm ci     │        copia dist/             │  listen :8080     │
│  npm run build │                             │  gzip + cabeceras │
└─────────────┘                                └──────────────────┘
                                                       │
                              estado del juego: localStorage del navegador
                              (el contenedor es 100% sin estado)
```

- **Dockerfile** multi-stage: la etapa de build ejecuta `tsc --noEmit &&
  vite build` (mismo pipeline que CI); la de runtime solo copia `dist/`.
- **nginx.conf**: SPA fallback, `/assets/*` con `Cache-Control: immutable`
  (los assets llevan hash), `index.html` y `sw.js` con `no-cache` para que
  las actualizaciones del juego lleguen sin purgas manuales; gzip y
  cabeceras `nosniff` / `SAMEORIGIN` / `Referrer-Policy`.
- **Sin estado**: no hay base de datos ni volumen; escalar = duplicar el
  contenedor. El progreso de cada niño vive en su tableta.
- **HTTPS obligatorio para el service worker**: el SW solo se registra en
  `https://` (o `localhost`); en LAN por HTTP el juego funciona pero sin
  modo offline. Recomendado: reverse proxy TLS delante (Caddy/Traefik).
- Healthcheck con `wget --spider` cada 30 s; el puerto interno es 8080.

## 13. Sistema de diseño de UI (0.5.0)

Estética para 3–6 años (etapa preoperacional): **grande, brillante,
redondo, sonoro, con caras, un solo camino, feedback inmediato y
celebración constante**. La estética no es decoración: a esta edad es la
interfaz.

### Tokens (literales en `src/styles.css`, sin `var()`)

| Uso | Color | Nota |
|---|---|---|
| Cielo (fondo) | `#5cc4f5 → #a9e4ff → #e7f9ff` | degradado vertical |
| Sol (acción principal, nodo actual) | `#ffd23f` | texto tinta |
| Uva (marca, trazo activo, botones severos) | `#5f28cf` | texto blanco (7.8:1) |
| Hierba (avanzar / conseguido) | `#4ee08a` | texto tinta |
| Coral (atrás / cancelar) | `#ff7a7a` | texto tinta oscura |
| Tinta (texto) | `#231a3d` | ≥ 7:1 sobre sol, hierba, cielo, coral y blanco |

Máximo 4–5 colores dominantes por pantalla; la semántica nunca se
invierte (verde = avanzar, coral = atrás).

### Piezas reutilizables

- **`.btn`** (`--green/--purple/--coral/--sky/--white/--orange`, `--sm`,
  `--big`, `--icon`): botón físico con sombra sólida, relieve interior y
  hundimiento al pulsar. Mínimo táctil 80×64 px (68 px en pantallas de
  menos de 460 px de alto, nunca por debajo de 60 px).
- **`.pill`**: chapa de progreso y conmutadores de un toque (⭐ estrellas,
  🔊/🔇 sonido); el progreso vive siempre en una esquina.
- **`.node`** (`--done`, `--current`, `--locked`): nodo del sendero; el
  actual pulsa y emite un halo, el bloqueado duerme (💤) en vez de prohibir.
- **`.mascot`** (`src/ui/mascot.ts`): Lapi, lápiz con cara; emociones
  `idle`/`happy`/`oh`/`party` y escalado por etapa de estrellas.
- **`.bubble`**: bocadillo de Lapi, siempre con voz (TTS) acompañando.
- **`.reward-layer` + `util/fx`**: celebración con confeti, estrellas
  secuenciales y mascota bailando.

### Reglas de interacción

- Solo **tap** y **drag simple**; ningún gesto complejo ni long-press para
  el niño (el único hold es la puerta parental de adultos).
- **Feedback multimodal inmediato** en cada toque: sonido + animación +
  vibración cuando existe (`buzz`).
- Máximo 3–5 botones por pantalla, jerarquía de dos niveles
  (perfiles → mapa → actividad → recompensa) con **atrás grande siempre
  visible** y el resto del camino en una sola pantalla (sin scroll infinito
  ni menús hamburguesa).
- **Nunca castigo visual**: los fallos solo producen ánimo de Lapi y
  tolerancia adaptativa (§4).

### Rendimiento y accesibilidad

- Animaciones con `transform`/`opacity` y 300–500 ms ease-out; el confeti
  se autodestruye y usa 16–26 piezas para no castigar la GPU de gama baja.
- El texto va siempre acompañado de icono y voz; tamaños ≥ 24 px en móvil y
  ≥ 40 px en tablet (los `vmin` van con suelo en px en pantallas cortas).
- Sin publicidad, sin compras, sin dark patterns; el único control de
  adultos está tras la puerta de 3 s.

## 14. Voz pregrabada (0.6.0 · voz Paulina desde 0.6.1)

La voz del sistema sonaba robótica y **cambiaba según la tableta** (en
Android 5 de gama baja es la peor parte del juego). La solución es
generar los audios **una vez** y empaquetarlos: calidad constante,
idéntica y offline, sin depender de ningún servicio en tiempo de
ejecución. Detalle completo en `docs/VOICE.md`.

| Pieza | Dónde |
|---|---|
| Id determinista de cada frase | `services/voiceId.ts` |
| Catálogo de frases hablables | `services/voiceLines.ts` (+ `content/speech.ts`) |
| Reproductor con cola y respaldo | `services/voiceClips.ts` |
| Cola que no corta + `onDone` | `services/voiceSequencer.ts` |
| Generador (macos/ElevenLabs/OpenAI/Piper) | `scripts/generate-voice.mjs` |
| Manifiesto (generado) | `content/voiceManifest.ts` |
| Audios | `public/voice/<id>.mp3` |

Garantías comprobadas por tests: el manifiesto solo anuncia audios que
existen, no quedan frases sin audio, no hay audios huérfanos, ninguna
pantalla locuta frases literales fuera del catálogo (caerían al TTS sin
que nadie lo notase) y **la cola nunca corta una locución en curso**
(`tests/voiceQueue.test.ts`).

Estado actual: **303 MP3 con `Paulina (Español (México))`** (voz femenina
es_MX del Mac, `provider: "macos"` en el manifiesto), generados con
`--rate 155 --pitch 1.06 --force --prune` y versionados en `public/voice/`.
El juego no contacta con ningún servicio: los MP3 viajan en el bundle. Ojo
con publicar: las voces de Apple valen para desarrollo (§3 de
`docs/VOICE.md`).

**Ritmo y tono** (0.7.1): se barrieron 19 combinaciones de `--rate` ×
`--pitch` midiendo duración, F0 y reparto espectral de cada muestra
(`docs/VOICE.md` §5). Resultado: **155 ppm** (ritmo) y **1.06** (F0 173 Hz,
un semitono sobre la voz natural) — cálido y claro para 3–6 años. Tres
cosas que se aprendieron por el camino y conviene no volver a descubrir:
`say` **cuantiza `--rate`** (145, 155 y 165 dan MP3 bit a bit idénticos, el
ajuste fino de ritmo vive en el `playbackRate` del ajuste 🐢), `--pitch` **no
altera la duración** (el `atempo` compensa el `asetrate`) y el tono es un
**desplazamiento puro**, sin cambiar la expresividad.

## 12. Mantenimiento de la documentación

- Cambio de comportamiento → actualizar la sección correspondiente aquí +
  entrada en `docs/CHANGELOG.md` en el mismo commit.
- Nuevo módulo → añadirlo al árbol de §1 y a la tabla de §10 si toca
  compatibilidad.
- Los umbrales pedagógicos (§4) solo se cambian con test que los respalde.
- Tocar la UI → respetar las reglas duras de §13 (tokens, tamaños táctiles,
  compatibilidad CSS y de emoji) y anotarlo en el CHANGELOG.
- Renombrar el producto → `src/content/brand.ts` + manifest + `index.html` +
  `package.json` + `sw.js` + Docker; `tests/brand.test.ts` verifica que no
  quede ninguna mención al nombre anterior en la app.
- Tocar una frase hablada → `npm run voice:generate` y commit de los MP3
  nuevos en el mismo paso (§14); `tests/voice.test.ts` falla si el
  manifiesto, los ficheros y el catálogo se desincronizan.