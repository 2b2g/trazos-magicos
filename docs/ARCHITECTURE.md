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
  → locución de la recompensa por PASOS (services/voiceSteps.ts):
      ánimo → "A de Avión" | "Cuenta conmigo." → uno ⭐ → dos ⭐⭐ → …
      → "4 estrellas"   (cada estrella aparece al terminar su número)
```

### 2.1 La recompensa cuenta con la voz (0.8.1)

Las estrellas del conteo **no salen por su cuenta**: cada una seenseña
cuando la voz termina de decir su número, así que contar con Lapi y
contar en pantalla son lo mismo (antes iban con un escalón fijo de 0,28 s
mientras la voz tardaba ~0,78 s por número: el conteo sacaba tres veces de
ventaja a la locución).

- **`services/voiceSteps.ts`**: `playVoiceSteps(speaker, steps, {isAlive})`
  encadena frases y ejecuta la acción de cada una al terminar. Es lógica
  pura (recibe el locutor), como `voiceSequencer.ts`, y hereda sus dos
  garantías: **nada se pisa** (el siguiente paso espera al anterior) y **se
  corta sola** si el niño se va o silencia el juego.
- **Un paso por número**: antes el conteo era un único clip ("uno, dos,
  tres"); ahora cada número es su propio paso y su estrella aparece en su
  `onDone`. Todos los números tienen clip (`content/phrases.ts`), así que no
  hace falta regenerar audios.
- **Sin voz** no hay ritmo al que pegarse: se mantiene el escalón visual de
  0,28 s (`audio.voiceEnabled` lo consulta la propia recompensa).
- El ánimo se sortea **una sola vez** para la pantalla y para la voz: antes
  se sorteaban dos y el niño leía una frase mientras oía otra.

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

- **Cada pantalla habla al entrar, una sola vez**: la de perfiles pide su
  saludo (`sayOnFirstGesture`, ver abajo) y la del mapa pide "Elige una
  actividad." en `renderMap` —no en `refresh()`, que se dispara al volver de
  una actividad— para que la frase que suena sea la misma que está en el
  bocadillo y no se repita. Como todo pasa por `sayAll`, si el saludo
  anterior sigue sonando la bienvenida **espera** su turno.
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
- **Audios** en `public/voice/` (~3 MB, 299 frases): el service worker los
  cachea al usarlos (`/voice/` cache-first); no se precargan.
- **Desbloqueo** (política de autoplay): en el primer toque suena
  `voice/silencio.mp3` (100 ms, volumen mínimo) para habilitar el elemento;
  si el navegador bloquea un clip, `onFallback` continúa con TTS.
- **La primera locución de la sesión espera al primer toque**
  (`sayOnFirstGesture` + `services/firstGesture.ts`, 0.8.1): pedirla al
  arrancar no sirve, porque el navegador rechaza el `play()` y la frase
  cae a la voz del sistema. La espera se engancha en `touchstart` /
  `mousedown` / `keydown` (fase capture), se dispara **una sola vez**,
  desbloquea el audio y pide la locución en ese mismo gesto; la pantalla
  puede cancelarla (`sayOnFirstGesture` devuelve el `cancel`) o descartar
  ese toque si ya era una elección del niño (`onGesture` → `false`). Con
  el audio ya desbloqueado (segunda visita), el saludo sale inmediato.
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

### 13.1 Iconografía: emoji fuera del chrome (0.9.0)

Hasta 0.8.1 los botones, las píldoras del HUD y los interruptores se dibujaban
con **emoji de texto**. El emoji se ve como lo pinte la **fuente del
dispositivo**, y en los objetivos del juego eso significa *cajas vacías*:

- **Android 5** (WebView Chromium 37) llega a **Unicode 6**; su WebView no trae
  los emoji de **Unicode 7/8/9** ([issuetracker 37057931][it55764]). Todo
  **U+1F900 en adelante** sale como **cuadro vacío**.
- **Safari 9 / iOS 9** se quedó en el set de emoji de 2015.

De las 151 apariciones de emoji que había en `src/`, **40 eran chrome**
(botones, píldoras, HUD) y **111 eran contenido** (el significado de cada
letra, los avatares, los objetos que se cuentan). La regla que se aplicó:

| Dónde | Qué es | Antes | Ahora |
|---|---|---|---|
| Chrome | botón, píldora del HUD, interruptor | emoji | **SVG** de `ui/icons.ts` |
| Contenido | "A de Avión", avatares, objetos contables | emoji | ilustración SVG de `ui/artwork.ts` |
| Contenido antiguo | 🍎 🐶 🐱 🐮 … (Unicode ≤ 6) | emoji | **se queda**: la fuente sí lo tiene y no hay ganancia |

Los botones de chrome **no llevan texto**: solo el icono, con el nombre en el
`aria-label` (`.btn--only`). El niño no lee, el botón se toca.

#### Módulos

| Pieza | Qué hace |
|---|---|
| `ui/icons.ts` | **22 iconos** de chrome como **datos** (`IconShape[]` de `path`/`circle`/`rect`), rejilla de 24, trazo 2.4 con remates redondos. `iconEl(name, class)` construye el `<svg>` con `createElementNS`. **7 kB / 2,8 kB gzip, 0 dependencias.** |
| `ui/artwork.ts` | **17 ilustraciones** de contenido con `{viewBox, paths:[{fill, d}]}`, generadas desde los SVG de **Fluent Emoji Flat** (Microsoft, MIT) por `scripts/build-artwork.mjs`. **31 kB / 9,2 kB gzip.** |
| `ui/mark.ts` | La regla única de "una marca": `markEl(valor)` devuelve el vector si hay arte y un `<span>` de texto si no. `isVectorArt()` para consultar el modo. |

#### Por qué **no** una librería de iconos

Se miraron Phosphor, Tabler y Lucide (las tres más «libres» de ese estilo) y
se descartaron por peso y por estética:

- El juego usa **22 pictogramas**. Un paquete con licencia Apache-2.0 y
  `node_modules` son 100 kB–1 MB; afinando 22 formas a mano sale en 2,8 kB.
- El estilo del juego es de **trazo grueso con remates redondos**; las tres
  librerías usan trazo fino (1,5–2 px) optimizado para 16 px. Engordarlo
  hasta 2,4 con remates redondos es reescribir la geometría de todos modos.
- Sin dependencia nueva, el bundle sigue siendo **cero dependencias en
  runtime** y el SVG escala a cualquier tamaño sin reescalar nada.

#### Restricciones heredadas de §10

Los nodos se crean con **`createElementNS`** y cada trazo se escribe como
dato: **nada de `innerHTML` en SVG** (Safari 9 lo ignora en silêncio), nada de
`var()`, CSS Grid ni flex `gap`. Los SVG son `aria-hidden="true"`
decorativos: lo que se lee sigue siendo el `aria-label` del botón. El coste
del cambio es **+34 kB sin comprimir / +11 kB gzip** en el bundle moderno
(98,66 kB / 34,22 kB gzip, antes 64,89 / 23,28); los MP3 de la voz no cambian,
así que el service worker se queda en `garabati-v6` (los assets llevan hash).

`tests/icons.test.ts` (9 tests) blinda el sistema: geometría presente en cada
icono, `ICON_NAMES` sincronizado con las claves, **cero emoji en
`btn__emoji`/`pill__icon`**, caja y rutas en cada arte, **flags de arco sin
decimales**, **números separados** y **figuras que no se aplastan**, y **todo
emoji U+1F900+ de `src/` con ilustración**.

#### Licencia del arte

Las ilustraciones de `artwork.ts` derivan de **Fluent Emoji Flat** de Microsoft
(**MIT**: uso libre, sin obligación de atribución). Se eligió este pack sobre
Noto (Apache 2.0, pero **29,5 kB gzip** para los mismos 17 dibujitos) y sobre
Twemoji (**CC BY 4.0**, que obliga a atribuir y además pesaba más). Los **22
iconos de chrome son propios**. Detalle en `docs/ATTRIBUTION.md`.

#### El redondeo de la geometría daña los dibujos en silencio

`scripts/build-artwork.mjs` redondea la geometría a un decimal para ahorrar
gzip, y **no se puede hacer con un `replace` de números**, porque en SVG dos
números pueden ir pegados y el parser decide dónde acaba uno y empieza el otro.
Dos fallos reales, los dos **sin error de consola** — el navegador dibuja lo que
puede y descarta el resto:

1. **Los flags de arco no son medidas.** En `A rx ry rot large-arc sweep x y` los
   dos flags se leen como un **único carácter** `0`/`1`. Escribirlos `0.0` hace
   el token inválido y **descarta la ruta entera**. Con el redondeo ingenuo,
   **91 de las 79 rutas** quedaban rotas y los animales se veían como trozos
   sueltos (solo el zorro sin orejas).
2. **Los números necesitan separador.** `17.6` y `6.0` escritos pegados son
   `17.66`: un número distinto, y la figura se deforma. El script mete un
   **espacio explícito** antes de cada número cuando el anterior no es letra.

Los dos casos están blindados por tests (`tests/icons.test.ts`), porque un `d`
inválido no falla nunca por otra vía: si no se comprueba, el arte se degrada y
nadie se entera hasta que se mira la pantalla.

[it55764]: https://issuetracker.google.com/issues/37057931

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
| Espera del primer toque (autoplay) | `services/firstGesture.ts` |
| Locución por pasos (recompensa) | `services/voiceSteps.ts` |
| Generador (macos/ElevenLabs/OpenAI/Piper) | `scripts/generate-voice.mjs` |
| Manifiesto (generado) | `content/voiceManifest.ts` |
| Audios | `public/voice/<id>.mp3` |

Garantías comprobadas por tests: el manifiesto solo anuncia audios que
existen, no quedan frases sin audio, no hay audios huérfanos, ninguna
pantalla locuta frases literales fuera del catálogo (caerían al TTS sin
que nadie lo notase) y **la cola nunca corta una locución en curso**
(`tests/voiceQueue.test.ts`).

Estado actual: **299 MP3 con `Paulina (Español (México))`** (voz femenina
es_MX del Mac, `provider: "macos"` en el manifiesto), generados con
`--rate 155 --pitch 1.06 --force --prune` y versionados en `public/voice/`.
El juego no contacta con ningún servicio: los MP3 viajan en el bundle. Ojo
con publicar: las voces de Apple valen para desarrollo (§3 de
`docs/VOICE.md`).

**La primera frase se oía con otra voz (corregido en 0.8.1)**: el saludo de
la pantalla de perfiles se pedía solo, sin gesto previo, y el navegador
rechazaba el MP3 → respaldo a la Web Speech API del dispositivo. Con eso la
primera locución de la sesión (la que más se oye al arrancar) era la única
que no usaba la voz del juego. Ahora el saludo **espera al primer toque**
(`services/firstGesture.ts`) y suena con el clip como todas las demás.

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