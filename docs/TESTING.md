# Estrategia de pruebas — Garabati

> Documento vivo: cualquier fix o funcionalidad nueva entra aquí con su resultado.

## 1. Tres niveles

| Nivel | Herramienta | Qué cubre |
|---|---|---|
| **Unitarios** | Vitest (`npm test`) | sampling, evaluación, umbrales, almacenamiento, integridad del contenido, mascota y marca |
| **E2E sintético** | navegador + eventos Pointer sintéticos (`preview_evaluate`) | flujo completo real: perfiles → mapa → demo → trazado → recompensa → progreso |
| **Checklist de dispositivo** | manual (README) | Android 5 WebView real, iPad, gama baja, offline, rechazo de palma |

## 2. Suite unitaria (98 tests, todos en verde)

- `tests/engine.test.ts` — muestreo (extremos exactos, continuidad de la O,
  espaciado uniforme), evaluador (trazo perfecto, temblor infantil, trazo
  desplazado, trazo corto, **medio trazo rechazado**, dirección invertida en
  modo estricto, **tolerancia adaptativa: lo que falla estricto pasa relajado**,
  curva ∪ vs ∩, fronteras de estrellas), contenido (27 letras con Ñ, 10 dígitos
  con `count` correcto, ids únicos, habla en cada recurso, **continuidad
  geométrica: ningún salto > 40 px en todo el catálogo**, significado
  emoji+palabra, frases en español) y **fidelidad de la forma** (bloque
  `fidelidad de la caja de escritura`, 10 tests queblindan el0.8.0):
  toda grafía llega a la ceja y apoya en la base, ninguna se sale de la caja,
  **cada trazo toca al menos otro trazo** (la letra es una figura sola), las
  **uniones son exactas** (barra de la A, puente de la H, valles del M, cola
  del 2, tangencia del 9…), las curvas son arcos o cúbicas de verdad, ninguna
  letra se dibuja con ondas o zigzag, la tilde de la Ñ está encima de la ceja, el
  7 va sin raya y el 1 con palito y base, y letras y números declaran las
  4 líneas de la pauta mientras que los trazos sueltos no.
- `tests/storage.test.ts` — ciclo de perfiles, **monotonía del progreso**
  (un intento peor nunca resta), `completed` pegajoso, suma de estrellas,
  **JSON corrupto no rompe**, ajustes con defaults y merge, **localStorage
  bloqueado no rompe**.
- `tests/mascot.test.ts` — **etapas de crecimiento de Lapi** (0–4 ⭐, 5–19 ⭐,
  20+ ⭐) y monotonía: más estrellas nunca hacen retroceder a la mascota.
- `tests/brand.test.ts` — **coherencia del renombrado a Garabati**: manifest
  PWA, `<title>`, `package.json`, imagen Docker, caché del service worker y
  ausencia del nombre anterior en las pantallas.
- `tests/voice.test.ts` — **integridad de la voz pregrabada**: ids
  deterministas y seguros como nombre de fichero, catálogo de frases sin
  duplicados, manifiesto que solo anuncia MP3 existentes, **cero frases sin
  audio**, cero audios huérfanos, aceptación/rechazo del proveedor de clips y
  **ninguna frase literal fuera del catálogo** en las pantallas (esas caerían
  al TTS robótico sin que nadie lo notase).
- `tests/voiceQueue.test.ts` — **la voz nunca se corta**: la frase que suena
  termina antes de la siguiente, el orden se mantiene, `onDone` encadena sin
  temporizadores (presentación → demo), el tope de cola descarta los avisos
  viejos sin tocar el que suena, `cancel()` interrumpe y vacía (cambio de
  pantalla), el perro guardián desatasca una locución que nunca avisa, y la
  fachada `AudioService` no cancela lo que está sonando (sí en `stopVoice`).
- `tests/firstGesture.test.ts` — **el saludo espera al primer toque** (13
  tests, 0.8.1): antes del gesto **no se locuta nada** (ni clip ni TTS, que
  era justo el bug: la primera frase caía a la voz del sistema), el primer
  toque desbloquea el audio y dice el saludo **con el clip** (el TTS de
  respaldo no suena), el disparo ocurre una sola vez, cuentan `touchstart`,
  `mousedown` y `keydown`, un toque que ya elegía jugador no saluda, una
  espera cancelada no suena ni deja escuchas colgadas, con la voz silenciada
  no suena, al volver a la pantalla con el audio ya desbloqueado el saludo
  es inmediato, sin clips la frase se dice entera con la voz del sistema, y
  **la bienvenida del mapa espera su turno si el saludo sigue sonando**
  (nadie pisa a nadie, ninguna cae al TTS).
  Además, la espera por sí sola sin DOM: no se arma sin destino de gestos, el
  callback recibe el evento original y se desengancha, y armar dos veces deja
  solo la última espera viva.
- `tests/rewardSteps.test.ts` — **las estrellas cuentan con la voz** (5 tests,
  0.8.1): la estrella solo aparece cuando termina su número y nunca antes, el
  orden de los pasos se respeta, las frases vacías se saltan sin romper la
  cadena, si el niño se va a mitad no aparece ninguna estrella a destiempo y
  sin pasos no se dice nada (pero el final se avisa igual). Bloquea el defecto
  de la recompensa: el conteo visual con escalón fijo de 0,28 s contra los
  ~0,78 s por número de la locución.
- `tests/icons.test.ts` — **el chrome ya no depende de la fuente de emoji y el
  arte no se corrompe** (9 tests, 0.9.0). Los cuatro últimos son los
  importantes, porque un `d` inválido **no da error**: el navegador dibuja lo
  que puede y descarta el resto en silencio, así que sin ellos el arte se
  degrada sin que nada falle. Comprueban que **los flags de arco no llevan
  decimales** (`A rx ry rot 0.0 0.0 x y` es un token inválido que descarta la
  ruta entera), que **no hay números pegados** (`17.6` + `6.0` son `17.66`) y
  que **ninguna figura está aplastada**. Verificado que fallan reintroduciendo
  el bug a mano. Y el resto: cada icono de `ICONS` tiene geometría real (ningún `path>
  vacío) y respeta la rejilla de 24; `ICON_NAMES` está sincronizado con las
  claves (un icono que existe pero no se lista, o al revés, falla); **cero
  emoji en `.btn__emoji` y `.pill__icon`** en todo `src/` (es la regresión que
  vuelve en cuanto alguien "arregla" un botón metiendo un emoji); cada
  ilustración de `ARTWORK` tiene `viewBox` y al menos un `path` con `d`; y
  **todo emoji U+1F900+ que aparezca en `src/` tiene ilustración vectorial**
  (recorre los ficheros por `codePointAt`, no por regex `u`, para no depender de
  la versión de Node). Ese último es el que atrapa el 🧊 o el 🤖 que alguien
  meta mañana y que en un Android 5 saldría como un cuadrado vacío.

## 3. Batería E2E en navegador (sesión de prueba intensiva)

Ejecutada con Chromium (preview) sobre el bundle de producción, simulando el
dedo con PointerEvents sintéticos y leyendo localStorage como oráculo.

| # | Escenario | Resultado |
|---|---|---|
| 1 | Crear perfil (avatar+nombre) y entrar al mapa | ✅ |
| 2 | Ajustes: puerta parental 3 s, toggles, persistencia en localStorage | ✅ |
| 3 | Ajustes persistidos tras recarga y aplicados al arrancar | ✅ |
| 4 | Multi-perfil: 2 perfiles, **aislamiento de progreso** (⭐12 vs ⭐0), cambio y vuelta | ✅ |
| 5 | Nodo bloqueado: no abre actividad | ✅ (fix #3: ahora con feedback en bocadillo) |
| 6 | Trazado fallido ×2 → ánimo → demo individual → **relajación de tolerancia** → éxito | ✅ |
| 7 | Detección geométrica: curva ∪ trazada como ∩ rechazada | ✅ |
| 8 | **Medio trazo rechazado** (umbral pedagógico) | ✅ (fix #1) |
| 9 | Fase A completa trazada con geometría exacta: línea, horizontal, ∪, ∩, onda, zigzag, círculo | ✅ |
| 10 | Multi-trazo (cruz): "trazo 2 de 2", avance correcto | ✅ |
| 11 | Letra I: recompensa con significado (🪁 "I de Isla") | ✅ |
| 12 | Número 1: relación símbolo→cantidad (1 objeto contable) | ✅ |
| 13 | Recompensa: estrellas 1–3, precisión %, "Otra vez" y "Seguir" | ✅ |
| 14 | Progreso persistente y desbloqueo encadenado | ✅ (fix #2: regla única) |
| 15 | Botón casa a mitad de actividad: vuelve al mapa sin errores | ✅ |
| 16 | Consola limpia con el bundle final (fix #4 del `setPointerCapture`) | ✅ |
| 17 | **Letra A con la geometría nueva**: 3 trazos, barra cruzada en las diagonales, 3 ⭐, precisión 98 %, "A de Avión" | ✅ (0.8.0) |
| 18 | **Pauta de 4 líneas dibujada** detrás del grafema, medidas en el lienzo: 0,16 / 0,50 / 0,67 / 0,84 | ✅ (0.8.0) |
| 19 | **Recorrido de voz completo** (perfiles → mapa → letra → número → recompensa con conteo), 17 clips: ninguno cortado, ninguno al TTS salvo el saludo previo al primer toque | ✅ (0.7.1) |
| 20 | **Saludo de perfiles con la voz buena**: al arrancar no se pide nada; al primer toque en zona neutra suena `¿Quién quiere jugar?` (clip, rate 0.88, 1,28 s completos) **sin `TTS-respaldo`** ni errores; al primer toque en una tarjeta no se saluda y se abre el formulario; al volver de la pantalla principal el saludo es inmediato | ✅ (0.8.1) |
| 21 | **El mapa habla al entrar**: `Elige una actividad.` con su clip (1,65 s completos), sincronizada con el bocadillo, sin repetir al volver de una actividad (botón casa) ni al cambiar de fase; después la actividad encadena su presentación sin cortes | ✅ (0.8.1) |
| 22 | **Recompensa del número 4**: las 4 estrellas caen a +16/+19/+51/+16 ms del final de "uno/dos/tres/cuatro" y están todas antes de "4 estrellas"; el ánimo escrito y el locutado coinciden; con la voz silenciada el conteo mantiene el escalón de 0,28 s | ✅ (0.8.1) |
| 23 | **Iconografía de las cuatro pantallas**: perfiles (avatar vector, botón ➕ → `plus`, estrella vector, *Volver* y *¡Listo!* sin texto), mapa (pestañas de fase solo con marca, candados y estrellas vector, 💤 → `sleep`, casa/sonido/ajustes vector), actividad (recompensa con `markEl`, 3 estrellas `starFilled`, *"4 ⭐"* como `.phrase--count`, *Otra vez* y *Seguir jugando* sin texto) y ajustes (título con `grown`, llave sin texto, 6 filas con 1 icono cada una). **Cero emoji de U+1F900+ a la vista** | ✅ (0.9.0) |
| 24 | **El SVG se construye sin `innerHTML`**: los nodos salen de `createElementNS` y el `slow` (tortuga) se lee a 64 px — la primera versión en trazo se fundía en un borrón y se rehizo en relleno | ✅ (0.9.0) |
| 25 | **Los 17 dibujos de contenido, completos**: cada ilustración a 128 px (hoja de diseño), 64 px (avatar del perfil) y 40 px (pestaña de fase). Los 8 avatares en fila, los 6 significados de letras y los 3 post-MVP. Comprobado con `getBBox()` que ninguna figura está aplastada (todas ocupan 24–28 de las 32 unidades de su caja) | ✅ (0.9.0) |

## 4. Hallazgos y correcciones de la batería

1. **Pedagógico** — la mitad de un trazo aprobaba (cobertura 0.5). → `EASY_EVAL.minCoverage 0.5→0.65` (el corredor de 34 px sobre ~300 px de trazo daba 0.61 a medio camino).
2. **Regla de desbloqueo duplicada** — el mapa y el storage divergían y el nodo "actual" señalaba uno completado. → Regla única en `map.ts` (`playable/nextIndex`), `ProfileStore.isUnlocked` eliminada.
3. **Feedback de nodo bloqueado** solo sonoro → ahora actualiza el bocadillo de la mascota.
4. **`setPointerCapture` NotFoundError** con punteros que sueltan antes del capture (WebViews antiguos) → try/catch defensivo.
5. **Geometría** — zigzag con discontinuidad en `phase=0.5` (salto 86 px) y estrella de 4 puntas con un segmento mal apuntado (salto 124 px). El nuevo test de continuidad los habría cazado desde el principio; ahora forma parte de la suite.
6. **Fidelidad de las letras (0.8.0)** — al rehacer el contenido con la caja de escritura compartida, la propia suite nueva encontró tres fallos reales: la barra de la A se salía 50 px de las diagonales, la "~" de la Ñ flotaba dentro de la caja de la N y el bucle del 6 empezaba 114 px lejos de donde llegaba el palito. Con `guideLines` y la métrica única, los tests de caja, uniones y curvas exactas los impiden volver.
7. **Voz de la primera pantalla (0.8.1)** — el saludo se pedía 400 ms después de arrancar, sin gesto: el navegador rechazaba el MP3 (`NotAllowedError`) y la frase caía a la Web Speech API del dispositivo (voz del sistema, masculina en muchos Mac). Traza antes: `play` → `audio:error` → `TTS-respaldo` → `play-rechazado`. Después: sin locución al arrancar y, al primer toque, `play` (rate 0,88) → `playing` → `ended` en 1,28 s, sin respaldo. Además el silencio de desbloqueo se pedía dos veces (marca puesta al resolverse el MP3) y `Sfx.ensure()` exigía `window`, lo que impedía probar el desbloqueo sin DOM.
8. **El mapa era la única pantalla muda (0.8.1)** — pintaba "Elige una actividad." pero nunca lo locutaba, aunque el clip existía desde 0.6.0: era un audio huérfano de facto. Al pedirlo al entrar (y no en `refresh()`) el niño oye dónde puede tocar y la frase queda sincronizada con el bocadillo; el orden con el saludo de perfiles lo fija la cola de voz, comprobado con un test donde el saludo sigue sonando.
9. **El conteo de la recompensa iba tres veces por delante de la voz (0.8.1)** — las estrellas salían con `animation-delay` de 0,28 s en bloque, mientras Lapi tardaba ~0,78 s por número: las cuatro ya estaban en pantalla antes de que dijera "tres". Ahora la locución va por pasos (`services/voiceSteps.ts`) y cada estrella se enseña en el `onDone` de su número. Midiendo el DOM y el audio en el mismo reloj: +16/+19/+51/+16 ms. De paso, el ánimo se sorteaba dos veces (el texto y la voz podían no ser la misma frase).
10. **Los botones eran emoji y no se veían (0.9.0)** — la auditoría de `src/` encontró 151 apariciones de emoji: 40 de *chrome* (botones, píldoras, HUD) y 111 de *contenido*. En Android 5 (Chromium 37) la fuente llega a Unicode 6, así que los 17 emoji de U+1F900+ del juego (avatares 🦊🐼🐸🦁🐧🦄🐯🐨 y significados 🪁🧊🥛🤖🦒🧀) salían como cuadros vacíos; en Safari 9, los de 2016 en adelante también. Se distinguieron los dos grupos: el chrome pasa a SVG propio y el contenido antiguo se queda. El fallo lo cazó el test, no el ojo: los 6 tests nuevos fallan si alguien vuelve a meter un emoji en un botón.

## 5. Cómo reproducir la batería sintética

```js
// en la consola del navegador (o preview_evaluate):
const c = document.querySelector('.canvas-holder canvas');
const r = c.getBoundingClientRect();
const ev = (t,x,y) => c.dispatchEvent(new PointerEvent(t,
  {clientX:x, clientY:y, pointerId:1, pointerType:'touch', isPrimary:true,
   bubbles:true, cancelable:true, button:0}));
// esperar a que termine la demo (~4 s), luego trazar:
ev('pointerdown', r.left+r.width*0.5, r.top+r.height*0.16);
for (let i=1;i<=20;i++) ev('pointermove', r.left+r.width*0.5, r.top+r.height*(0.16+0.68*i/20));
ev('pointerup', r.left+r.width*0.5, r.top+r.height*0.84);
// oráculo: !!document.querySelector('.reward-layer')
```

## 6. Pendiente de dispositivo real (bloqueante para lanzar)

Ver checklist completo en el README: Android 5 real, iPad Safari, gama baja,
modo avión/PWA, rechazo de palma física, TTS del sistema.
