# Arquitectura — Trazos Mágicos

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
│  services: audio (TTS+SFX) · storage (localStorage) · util/dom    │
└──────────────────────────────────────────────────────────────────┘
```

**Regla de dependencias**: `screens → services + engine + content`;
`engine` no conoce pantallas; `content` solo define datos con tipos de `engine/types`.

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

- **Voz**: `TtsProvider` (Web Speech API, voz `es-*`, rate 0.92, pitch 1.12).
  Falta de TTS no bloquea nada (texto + iconos ya guían).
- **Efectos**: osciladores WebAudio procedurales (`strokeDone`, `success`,
  `retry`, `tap`, `unlockPrize`) — sin ficheros: offline total y 0 KB extra.
- **Sustituir TTS por MP3**: implementar `VoiceProvider` y asignar
  `audio.tts = miProveedor` — las claves del catálogo están en
  `content/phrases.ts`.

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

## 10. PWA y compatibilidad Android 5 (Chromium 37)

| Restricción | Decisión |
|---|---|
| Sin ES6 | bundle legacy ES5 + core-js (plugin-legacy), targets `chrome>=37, android>=5` |
| Sin CSS Grid / `var()` / flex `gap` | solo flexbox con márgenes, colores literales |
| Pointer Events ausentes | Touch Events primarios, Pointer como mejora |
| DPR alto en gama baja | canvas a 1.5× máx |
| Service Worker desde Chrome 40 | cache-first para assets hash, network-first para navegación |
| `setPointerCapture` frágil | try/catch defensivo |

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

## 12. Mantenimiento de la documentación

- Cambio de comportamiento → actualizar la sección correspondiente aquí +
  entrada en `docs/CHANGELOG.md` en el mismo commit.
- Nuevo módulo → añadirlo al árbol de §1 y a la tabla de §10 si toca
  compatibilidad.
- Los umbrales pedagógicos (§4) solo se cambian con test que los respalde.