# Registro de cambios — Garabati

Formato inspirado en [Keep a Changelog]. Documento vivo: **cada cambio de
comportamiento añadido aquí y reflejado en `docs/ARCHITECTURE.md`/`docs/TESTING.md`.**

## [0.6.0] — 2026-10-02 · Voz pregrabada (adiós a la voz robótica)

### Cambiado
- **La voz ya no depende del TTS del dispositivo.** El guion completo
  (**303 frases**, ≈ 4.700 caracteres) se pre-renderiza a MP3 y viaja con el
  juego: suena igual, cálida y nítida en cualquier tableta, y funciona sin
  conexión. La Web Speech API queda como **respaldo** para lo que falte.
- **La app locuta por segmentos** en vez de concatenar cadenas nuevas
  (`sayAll([ánimo, pista])`, `sayAll([ánimo, "Cuenta conmigo.", "uno, dos",
  "3 estrellas"])`): así cada frase del catálogo puede tener su audio y las
  pausas suenan naturales.
- **Ajuste 🐢 "voz pausada"**: ahora alarga los clips un 12 %
  (`playbackRate` 0.88) en vez de subir el tono del TTS. Los MP3 se graban a
  155 ppm, ya más lentos que un locutor adulto.
- **Frase de nodo bloqueado** movida a `PHRASES.lockedNode`: estaba escrita a
  mano en la pantalla y habría caído al TTS sin audio propio.
- Los números ahora cierran el conteo con su unidad: **"3 estrellas" /
  "1 estrella"** (`content/speech.ts`), antes se locutaba un número suelto.
- **Service worker**: caché `garabati-v3` con regla cache-first para
  `/voice/` y `/fonts/` (los audios se guardan al usarlos, no en la
  instalación).

### Añadido
- **`services/voiceClips.ts`**: reproductor de clips con cola, cancelación
  (barge-in), desbloqueo de autoplay con `voice/silencio.mp3` y respaldo
  automático al TTS si un clip no puede sonar.
- **`services/voiceId.ts`**: id determinista por frase (slug legible + hash
  FNV-1a) compartido por la app y el generador.
- **`services/voiceLines.ts`** + **`content/speech.ts`**: catálogo completo de
  frases hablables derivado del contenido, para que nada quede sin audio.
- **`content/voiceManifest.ts`** (generado): manifiesto compilado de audios
  disponibles; sin él el juego arranca igual usando TTS.
- **`scripts/generate-voice.mjs`**: generador con adaptadores para **macOS
  `say`**, **ElevenLabs**, **OpenAI** y **Piper**, más audiciones de voz
  (`--audition`), `--dry-run`, `--limit`, `--force` y `--prune`. Compila el
  catálogo TS con esbuild para leerlo desde Node.
- **`docs/VOICE.md`**: qué servicio elegir, coste real del guion (céntimos en
  la nube, 0 € en local), licencias (ojo: las voces de Apple no valen para
  publicar) y el flujo de trabajo al cambiar frases.
- **Ajustes**: fila informativa con la voz activa (*"macos · Flo (Español
  (España)) (303 audios)"*).
- **11 tests nuevos** (`tests/voice.test.ts`): ids estables y seguros como
  nombre de fichero, catálogo sin duplicados, manifiesto ↔ MP3 en disco, cero
  frases sin audio, cero audios huérfanos y **ninguna frase literal fuera del
  catálogo** en las pantallas → **48 tests** en total.
- `public/voice/` con los 303 MP3 (≈3,3 MB, mono 22 kHz / 48 kbps).

### Notas
- Los audios del repositorio se generaron con las voces del sistema de macOS
  (desarrollo). Antes de publicar el producto hay que regenerarlos con un
  servicio con licencia comercial: `docs/VOICE.md` §3.
- El generador nunca se ejecuta en el build ni en el despliegue: la app
  publicada no contacta con ningún servicio.

## [0.5.0] — 2026-10-02 · Garabati: rediseño de UI para 3–6 años

### Cambiado
- **El producto pasa a llamarse Garabati**: `index.html`, manifest PWA
  (`name`/`short_name`), `package.json` (`garabati@0.5.0`), caché del
  service worker (`garabati-v2`), imagen y servicio Docker (`garabati:latest`),
  icono SVG y documentación. La fase A deja de llamarse "Trazos mágicos"
  (ahora **Primeros trazos**) para no reciclar el nombre del producto.
- **Interfaz rediseñada con la guía estética infantil**: fondo de cielo con
  degradado, **sol con cara** y nubes que pasean; **máximo 4–5 colores**
  dominantes por pantalla (cielo, sol, uva, hierba, coral) y texto tinta
  `#231a3d` sobre fondos saturados (**≥ 7:1, WCAG AAA**).
- **Botones físicos**: área táctil ≥ 64 px (ideal 80–120 px), radio 24–34 px,
  relieve con sombra sólida y **hundimiento real** al pulsar
  (`translateY(6px) scale(0.96)`), separación ≥ 18 px, y `:active` en todo
  elemento tocable.
- **Animaciones lentas y exageradas** (300–500 ms ease-out): entrada de
  pantalla, rebote de la mascota, pulso del nodo actual, salto al acertar,
  negación suave al fallar. Nunca hay animación de castigo.
- **Tipografía balloon autohospedada**: Fredoka One (OFL, woff2 + woff con
  respaldo) con pila de sistema `Baloo 2 → Quicksand → Comic Sans MS`.
  Sin peticiones a Google Fonts: sigue funcionando offline.
- **Tema del lienzo** (`engine/render.ts`): corredor y trazo activo en uva
  `#5f28cf`, trazo conseguido en verde `#2fb45c`, tinta del niño en azul
  brillante `#1f8fff`, punto de inicio naranja.
- **Mapa**: HUD flotante con atrás grande (🏠 coral), píldora de estrellas
  (progreso siempre visible), botón de sonido y ajustes; pestañas de fase
  grandes y nodos 3D con sendero de puntos; el nodo bloqueado muestra 💤 y
  Liro anima en vez de regañar.
- **Actividad**: HUD con atrás y silencio a la vista, **progreso por puntos**
  (no números), Liro que reacciona a cada intento y **recompensa con
  confeti**, estrellas que aparecen una a una y mascota celebrando.
- **Ajustes**: filas e interruptores más grandes (60 px de alto), mismos
  textos para adultos tras la puerta de 3 s.
- **Emojis compatibles con Android 5** (pre-2014): 🫶 → ❤️, 👩‍👦 → 👨,
  🧩 → 🌀. Los ZWJ y los emoji posteriores a 2014 no se renderizan en
  Android 5 y rompían la estética.
- **nginx**: caché de 30 días para `/fonts/`.

### Añadido
- **`src/ui/mascot.ts` — Liro**, la mascota (un lápiz con cara dibujado en
  CSS, sin imágenes): ojos grandes con brillo, mofletes y boca expresiva;
  cuatro emociones (`idle`, `happy`, `oh`, `party`) y **tres etapas de
  crecimiento** según las estrellas del perfil (0–4, 5–19, 20+ con corona).
- **`src/ui/decor.ts`** — capa decorativa de cielo (sol con cara + tres nubes
  a distintas velocidades, solo `transform`).
- **`src/util/fx.ts`** — confeti de colores de la paleta y fila de estrellas
  que aparecen una a una; ambos se autodestruyen y no usan librerías.
- **`src/content/brand.ts`** — identidad (nombre, mascota, lema) en un solo
  sitio: renombrar el producto vuelve a ser un cambio de un campo.
- **Conmutador de sonido 🔊/🔇 de un toque** en mapa y actividad (además de
  los interruptores de la puerta parental), persistido en los ajustes.
- **Tests nuevos**: 4 de las etapas de la mascota y 5 de coherencia del
  renombrado (manifest, título, paquete, Docker, service worker y ausencia
  del nombre antiguo en la app) → **37 tests** en total.

### Notas
- Los PNG del icono (`icon-192.png`, `icon-512.png`) conservan el arte
  anterior; el SVG ya usa la paleta nueva. Regenerarlos cuando haya
  herramienta de rasterizado (no bloquea la instalación de la PWA).
- El proyecto sigue sin dependencias de runtime: fuentes, efectos y mascota
  son locales y offline.

## [0.4.0] — 2026-10-01 · Voz infantil y pausada

### Cambiado
- **TTS más amable para peques**: ritmo bajado de 0.92× a **0.72×** y
  timbre más agudo (pitch 1.12 → **1.3**), el estilo que mejor siguen
  los niños de 3–6 años.
- **Selección de voz preferente**: el proveedor puntúa las voces del
  sistema y elige `es-ES`/`es-419` por delante del resto y, si existen,
  voces con nombre "infantil" (niñ*, kid, child, junior, infantil).

### Añadido
- **Ajuste 🐢 "Voz pausada (para peques)"** en la puerta parental
  (activado por defecto). Nuevo campo `Settings.voiceSlow` persistido
  con merge compatible: instalaciones con ajustes antiguos heredan el
  default pausado sin migración.
- Test del default y del merge parcial de `voiceSlow`.

## [0.3.0] — 2026-10-01 · Despliegue en Docker

### Añadido
- **Dockerfile** multi-stage: etapa de build (`node:20-alpine`, `npm ci` +
  `tsc --noEmit && vite build`) y etapa de runtime `nginx:1.27-alpine`
  (~30 MB final) sirviendo `dist/` en el puerto **8080** con healthcheck.
- **nginx.conf** para SPA + PWA: fallback de rutas, `Cache-Control: immutable`
  para `/assets/*` (hash del build), `no-cache` para `index.html` y `sw.js`
  (actualizaciones automáticas), gzip y cabeceras de seguridad.
- **docker-compose.yml** de un comando con healthcheck y `restart:
  unless-stopped`.
- **.dockerignore** con contexto mínimo (sin node_modules, dist, tests ni docs).
- Documentación de despliegue: README §Despliegue y
  `docs/ARCHITECTURE.md` §11 (topología, caché, sin estado, HTTPS/SW).
- **Repositorio**: `.gitignore` (excluye `node_modules/`, `dist/` y datos
  locales) y primera publicación del proyecto en GitHub (repo privado).

### Notas
- El contenedor no guarda estado: el progreso de cada niño vive en el
  `localStorage` de su tableta (sin volumen ni BD necesarios).
- El service worker (juego offline) solo se activa bajo `https://` o
  `localhost`; ver nota de reverse proxy TLS en el README.

## [0.2.0] — 2026-10-01 · Batería intensiva de pruebas + documentación

### Corregido
- **Pedagógico**: un trazo de medio camino aprobaba por el margen de
  tolerancia → `EASY_EVAL.minCoverage 0.5 → 0.65` (con test que documenta
  el cálculo: corredor 34 px sobre trazo de ~300 px ≈ 0.61 a medio camino).
- **Desbloqueo**: regla duplicada (mapa vs. storage) marcaba como "actual"
  un nodo ya completado. Ahora regla única en `screens/map.ts`
  (`playable`/`nextIndex`); eliminado `ProfileStore.isUnlocked`.
- **Feedback de nodo bloqueado**: el bocadillo de la mascota avisa
  "Primero termina el de antes 💪" (antes solo era sonoro).
- **`setPointerCapture` NotFoundError** en WebViews donde el puntero se
  suelta antes del capture → try/catch defensivo (`engine/touch.ts`).
- **Geometría de contenido**: zigzag con discontinuidad en `phase=0.5`
  (fórmula triangular corregida a `phase*4−1 / 3−phase*4`) y estrella de 4
  puntas con un segmento apuntando al punto incorrecto. Nuevo test de
  **continuidad geométrica** de todo el catálogo (ningún salto > 40 px).

### Añadido
- Tests de almacenamiento con stub de localStorage: monotonía del progreso,
  `completed` pegajoso, JSON corrupto, storage bloqueado, ajustes.
- Tests del evaluador: medio trazo rechazado, **tolerancia adaptativa**
  (lo que falla estricto pasa relajado), curva invertida ∪/∩, fronteras de
  estrellas.
- Documentación: `docs/ARCHITECTURE.md`, `docs/TESTING.md`, `docs/MANUAL.md`
  y este registro. JSDoc completo en `engine/` y `services/`.
- Batería E2E sintética en navegador (16 escenarios) — ver
  `docs/TESTING.md` §3.

## [0.1.0] — 2026-10-01 · MVP Fases A–D

### Añadido
- **Motor de trazado** reutilizable: 6 primitivas geométricas con barrido de
  arco explícito, muestreo/remuestreo, evaluador (precisión, cobertura,
  inicio, dirección) con **tolerancia adaptativa**, entrada táctil unificada
  con rechazo de palma, render Canvas 2D (corredor de tolerancia, punto de
  inicio, flecha de dirección) y demo animada.
- **Contenido como datos**: 8 trazos (Fase A), 6 formas (B), 27 mayúsculas
  con Ñ en 5 familias motoras (C), dígitos 0–9 con conteo (D), catálogo de
  frases TTS en español, palabras post-MVP preparadas.
- **Experiencia completa**: perfiles multi-usuario con avatares, mapa de 4
  fases con desbloqueo, bucle presentación→demo→trazado→recompensa,
  recompensa con significado (letras) y cantidad contada (números), ajustes
  tras puerta parental de 3 s, TTS configurable + SFX WebAudio,
  persistencia localStorage monótona.
- **PWA** instalable y offline (manifest + service worker cache-first),
  build dual moderno/legacy ES5 para Android 5+ (Chromium 37).
- Suite unitaria inicial (15 tests) y README con checklist de dispositivos.