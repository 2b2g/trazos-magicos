# Registro de cambios — Garabati

Formato inspirado en [Keep a Changelog]. Documento vivo: **cada cambio de
comportamiento añadido aquí y reflejado en `docs/ARCHITECTURE.md`/`docs/TESTING.md`.**

## [0.10.0] — 2026-10-02 · Las categorías del mapa, con ficha y sin letras

### Corregido
- **Las cuatro pestañas de fase no decían nada de su fase.** Eran emoji de
  texto (✏️ 🔷 🔤 🔢) que 0.9.0 dejó fuera del cambio de iconos con el
  argumento de que «Android 5 sí los tiene». Era cierto y estaba equivocado por
  el motivo que importa: **🔤 (el abecedario) y 🔷 (el diamante) son el mismo
  tipo de dibujo** — un cuadrado azul — así que el niño no tenía forma de saber
  qué iba a encontrar detrás de cada pestaña, y eso es justo lo que tiene que
  distinguir **antes de saber leer**.
- **El nombre de la fase vivía en el emoji.** Al sustituirlo por un dibujo, el
  nombre pasó al `aria-label` del botón (`.btn--only`), que es lo que leen los
  lectores de pantalla y lo que un adulto lee si lo inspecciona.

### Añadido
- **`src/ui/categories.ts` — las cuatro fichas de categoría** (`trazos`,
  `figuras`, `letras`, `numeros`), dibujadas a partir del diseño de referencia
  de las cuatro fichas y reproducidas **con el estilo del juego** (colores
  planos, sin degradados ni brillos). Cada una lleva **su propio color** —
  es el que dice «aquí se trazan» o «aquí se cuentan»—, así que a diferencia de
  `ui/icons.ts` no heredan el color del botón: van en la rejilla de **32**,
  con relleno plano y borde de 1,8. `categoryEl(id, class)`, nodos con
  `createElementNS` y las figuras como dato, **0 dependencias**.
- **`src/screens/map.ts` + `.btn--tile` — la pestaña ahora *es* la ficha.** El
  botón va transparente, porque un fondo blanco o morado detrás solo ponía un
  rectángulo de otro color dentro de la ficha. La fase activa se marca con el
  tamaño (×1,14) y la misma sombra de fondo que llevan los demás botones. La
  ficha pasó de **6,4vmin** a **12vmin**: es lo que el niño tiene que
  distinguir de un vistazo, y es el elemento más grande de la fila.
- **`tests/categorias.test.ts` — 11 tests** sobre las fichas. La suite pasa de
  **98 a 109 tests**.

### Sin glifos, a propósito
El diseño de referencia de LETRAS usa **A B C** y el de NÚMEROS **1 2 3**, pero
**la app entera está sin texto**, así que un icono con una «A» dentro le pide
al niño algo que todavía no sabe. Las dos fichas hablan de lo que va a
**hacer**, no de lo que va a ver: **LETRAS** es un cuaderno abierto con el lápiz
escribiendo, y **NÚMEROS** son tres manzanas — tres de verdad, y se cuentan con
el dedo. En **FIGURAS** y **TRAZOS** el diseño de referencia ya era pictórico
(círculo/estrella/triángulo, y el lazo con el lápiz) y se ha replicado tal cual.

### Cambiado
- **`PhaseInfo.emoji` → `PhaseInfo.cat`** en `src/content/families.ts`: la clave
  pasa a ser la de la ficha. Un test comprueba que `emoji` no vuelve a
  aparecer en las fases.
- `ui/mark.ts` documenta ahora **tres** reglas (chrome, contenido, categoría) y
  reexporta `categoryEl` junto a `iconEl`.

### Detalle que costó un rato
Los lápices y el cuaderno se dibujan **horizontales** y se giran con
`rotate(ángulo centro)`, una sola `transform` por figura. Componer dos
transformaciones seguidas (`rotate(...) translate(...)`) **gira también la
traslación**: el lápiz se iba de la ficha **sin dar ningún error**. Por eso el
centro de giro va en la propia figura (`tf`) y no como dato suelto, y por eso
el test de que las figuras no se salen **aplica la rotación** en vez de mirar
las coordenadas crudas.

Ese test marca además la **caja del radio** de los arcos, porque el arco se
curva *entre* sus extremos: con solo mirar el punto final, un `A 14 14` pasaba
por estar dentro de la ficha y se salía por arriba. Los cuatro fallos se
comprobaron **reintroduciendo el bug a mano** (números pegados, arco con radio
enorme, lápiz girado fuera, dos fichas con el mismo fondo, flag de arco con
decimales): los cinco los cazan, con el nombre de la figura y la coordenada.

### Coste
**+3,14 kB sin comprimir / +0,94 kB gzip** (101,80 kB / 35,16 kB gzip, antes
98,66 / 34,22). Los MP3 de la voz no cambian, así que el service worker se
queda en `garabati-v6` (los assets llevan hash).

## [0.9.0] — 2026-10-02 · Fuera los emoji: iconos SVG propios para todos los botones

### Corregido
- **Los botones se veían distinto en cada tableta, y en las antiguas se veían
  como cajas vacías.** El chrome de la interfaz (botones, píldoras del HUD,
  interruptores) se dibujaba con **emoji de texto**, que sale de la **fuente
  del dispositivo**. En los objetivos del juego —**Android 5** (WebView
  Chromium 37) y **Safari 9**— la fuente de emoji llega como mucho a
  **Unicode 6** ([issuetracker 37057931][it55764]), así que **todo emoji de
  U+1F900 en adelante sale como un cuadrado vacío**. La auditoría encontró
  **151 apariciones de emoji en 97 líneas**: ~40 de *chrome* y ~111 de
  *contenido*. Las 40 de chrome están ahora dibujadas como SVG.
- **El significado de las letras y los avatares también se rompían**:
  🦊 🐼 🐸 🦁 🐧 🦄 🐯 🐨 🪁 🧊 🥛 🤖 🦒 🧀 🦋 🧡 🦓 son de **Unicode 8.0 o
  posterior**, es decir, de 2016 en adelante. Los **17** que aparecen en
  pantallas reales (8 avatares + 6 significados de letras + 3 palabras
  post-MVP) están ahora **dibujados como ilustración vectorial**, igual que el
  resto de la fila. Los emoji antiguos (🍎 🐶 🐱 🐮 …) **se quedan**: su
  fuente sí los tiene y no hay nada que ganar.

### Añadido
- **`src/ui/icons.ts` — 22 iconos de chrome** dibujados para el juego: `home`,
  `gear`, `arrowLeft`, `arrowRight`, `refresh`, `plus`, `check`, `smile`, `key`,
  `slow`, `soundOn`, `soundOff`, `star`, `starFilled`, `sparkles`, `lock`,
  `sleep`, `mic`, `grown`, `heart`, `music`, `trash`. Cada icono es **dato**
  (`IconShape[]` de `path`/`circle`/`rect`) sobre una rejilla de 24, con trazo
  de 2,4 y remates redondos: el aire que necesita un botón que toca un niño
  de 3 años. **7 kB / 2,8 kB gzip, cero dependencias**, y se construye con
  `createElementNS` porque **Safari 9 ignora `innerHTML` en SVG**.
- **`src/ui/artwork.ts` — 17 ilustraciones de contenido** (`{viewBox, paths}`),
  generadas desde los SVG de **Fluent Emoji Flat** de Microsoft (**MIT**) con
  `scripts/build-artwork.mjs`, que los descarga de Iconify y los cachea en
  `.design/art-src/` para poder repetir la generación sin red. **31 kB /
  9,2 kB gzip.**
- **`src/ui/mark.ts` — la regla única de "una marca"**: `markEl(valor)` devuelve
  el vector si hay ilustración y un `<span>` de texto si no; las pantallas ya no
  deciden por su cuenta si va un emoji o un dibujo.
- **`tests/icons.test.ts` — 6 tests** que blindan el sistema: cada icono tiene
  geometría, `ICON_NAMES` está sincronizado con las claves, **no queda ningún
  emoji en `btn__emoji` ni en `pill__icon`**, cada arte tiene caja y rutas, y
  **todo emoji U+1F900+ de `src/` tiene ilustración** (si mañana alguien mete
  un emoji nuevo, el test lo dice).
- **`docs/ATTRIBUTION.md`**: créditos y licencias del arte, de la tipografía y
  de la voz, con la comparativa de packs que justificó la elección.

### Cambiado
- **Los botones ya no llevan texto.** Solo el icono, con el nombre en el
  `aria-label` (`.btn--only`): el niño no lee y lo que se toca es el dibujo.
  Afecta a *Volver* (perfiles, actividad, recompensa), *¡Listo!* (perfiles),
  *Repetir la actividad* y *Seguir jugando* (recompensa), la llave de los
  ajustes, la casa, el sonido y la rueda de ajustes del mapa, y las pestañas de
  fase del mapa, que ahora llevan **solo la marca** de la fase.
- **Los interruptores de ajustes llevan icono delante** (`soundOn`, `slow`,
  `music`, `heart`, `mic`, `trash`) y el título ya no muestra 👨.
- **Las pestañas de fase y los nodos del mapa** usan marcas vectoriales; el
  candado y el "dormido" (💤) también son SVG, y `setSound` vuelve a insertar
  el nodo del sonido con su icono al cambiar.
- **La recompensa** cuenta las estrellas con el icono `starFilled` y la
  cantidad va en `.phrase--count`.
- **El aviso de navegador antiguo** de `main.ts` lleva el icono `sparkles`.
- **Coste**: el bundle moderno pasa de **64,89 kB / 23,28 kB gzip** a
  **98,66 kB / 34,22 kB gzip** (+34 kB sin comprimir, +11 kB gzip) a cambio de
  40 emoji que se veían de 40 maneras distintas. Los MP3 de la voz no cambian,
  así que el service worker **se queda en `garabati-v6`** (los assets llevan
  hash y no hay audio nuevo).
- **`src/util/dom.ts`**: `children` acepta ya `SVGElement` junto a `HTMLElement`.

### Corregido
- **El generador de arte estaba destruyendo las ilustraciones.** Los animales
  salían **rotos**: al zorro se le cortaban las orejas, a la jirafa la cabeza,
  y el queso y la mariposa eran bloques sin cara. La causa no era el dibujo sino
  `scripts/build-artwork.mjs`, que redondeaba la geometría con un `replace` de
  números, y **en SVG eso no funciona**: dos números pueden ir pegados y el
  parser decide dónde acaba uno. Dos fallos, ambos **sin error de consola**
  (el navegador dibuja lo que puede y descarta el resto en silencio):
  - **Los flags de arco no son medidas.** En `A rx ry rot large-arc sweep x y`
    los dos flags se leen como un **único carácter** `0`/`1`; escritos `0.0`
    son un token inválido y **descartan la ruta entera**. **91 de las 79 rutas**
    quedaron rotas.
  - **Los números necesitan separador.** `17.6` y `6.0` pegados son `17.66`:
    otro número, y la figura se deforma.

  Ahora el script tokeniza la ruta, cuenta la posición de cada argumento y
  emite un **espacio explícito** entre números. Los tests nuevos de
  `tests/icons.test.ts` lo blindan (flags sin decimales, números separados,
  figuras que no se aplastan): **un `d` inválido no falla por ninguna otra vía**,
  así que sin ellos el arte se degrada en silencio.

### Decidido
- **El arte de contenido viene de un pack descargable, no de un dibujo propio.**
  Se compararon los packs libres que cubren los 17 dibujitos enteros, con los
  SVG reales medidos y puestos uno al lado del otro en el navegador:

  | Pack | Licencia | gzip de los 17 | Veredicto |
  |---|---|---|---|
  | **Fluent Emoji Flat** (Microsoft) | MIT, sin atribución | **11,4 kB** | **Elegido** |
  | Noto Emoji (Google) | Apache 2.0, sin atribución | 29,5 kB | 2,6× más pesado |
  | Twemoji (Twitter) | CC BY 4.0, atribución obligatoria | 13,8 kB | Más pesado y obliga a atribuir |

  Fluent además usa **color plano sin gradientes ni filtros**, que es lo que
  necesita `createElementNS`, y su estilo de pegatina encaja con la app.
- **No se mete una librería de iconos.** Se miraron Phosphor, Tabler y Lucide:
  para **22** pictogramas, el paquete con licencia Apache-2.0 son 100 kB–1 MB
  y su trazo fino de 1,5–2 px no es el de la app (aquí va 2,4 con remates
  redondos, pensado para dedos de 3 años). Afinados a mano: **2,8 kB gzip y
  cero dependencias**, y el bundle sigue siendo un artefacto estático sin
  arbor de `node_modules`. Detalle en `docs/ARCHITECTURE.md` §13.1.

[it55764]: https://issuetracker.google.com/issues/37057931

## [0.8.1] — 2026-10-02 · Las pantallas ya hablan con la voz de Paulina y la recompensa cuenta con ella

### Corregido
- **El saludo de la pantalla de perfiles sonaba con la voz equivocada.**
  "¿Quién quiere jugar?" se pedía 400 ms después de arrancar, **sin que el niño
  hubiera tocado nada**: el navegador rechaza ese `play()` por la política de
  autoplay, el MP3 no sonaba y la frase caía al respaldo de la Web Speech API —
  la **voz del sistema**, que en muchos equipos (Mac) es masculina. Ahora el
  saludo **espera al primer toque**: se desbloquea el audio y se pide la locución
  dentro de ese mismo gesto, que es justo cuando el navegador deja sonar el clip.
  Traza real en el navegador antes → después:
  - antes: `play · ¿Quién quiere jugar?` → `audio:error` → `TTS-respaldo` →
    `play-rechazado (NotAllowedError)`, a los ~550 ms del arranque;
  - después: al primer toque, `play · ¿Quién quiere jugar?` (rate 0.88) →
    `audio:playing` → `audio:ended` en 1,28 s, **sin `TTS-respaldo`** y sin
    errores de red; al arrancar no se pide ninguna locución.
- **El desbloqueo ya no pide el silencio dos veces**: `main.ts` y el saludo
  caen en el mismo toque, y la marca de "ya desbloqueado" se ponía al
  resolverse el MP3 (demasiado tarde). Ahora se marca de inmediato y solo se
  reintenta si el navegador lo rechaza.
- **El mapa tenía la boca muda**: pintaba el bocadillo "Elige una actividad."
  pero nunca lo locutaba (el clip `elige-una-actividad-7e38d65c.mp3` existía y
  no se usaba, herencia de la auditoría de 0.7.1). Ahora Lapi lo dice **al
  entrar al mapa** con su clip, sincronizado con el texto que aparece en
  pantalla, y **no lo repite** al volver de una actividad (`refresh()`), ni
  al cambiar de pestaña de fase.
- **El conteo de estrellas de la recompensa ya no se adelanta a la voz**:
  las estrellas del conteo salían con un escalón fijo de **0,28 s** mientras
  Lapi tardaba ~**0,78 s** en decir cada número, así que las cuatro ya estaban
  en pantalla cuando todavía no había dicho "tres". Ahora cada estrella
  aparece **cuando la voz termina de decir su número** ("uno" ⭐, "dos" ⭐⭐…),
  medido en el navegador a **+16/+19/+51/+16 ms** del final de cada palabra.
- **El ánimo se sortea una sola vez**: se sorteaban dos, así que la frase de
  la pantalla y la frase locutada podían ser distintas ("¡Muy bien!" escrito,
  "¡Fantástico!" dicho).

### Cambiado
- Si el primer toque del niño ya es **elegir jugador** (una tarjeta, un botón o
  el campo del nombre), el saludo se omite: el niño ya sabe qué hacer y no hace
  falta preguntárselo. Al volver a la pantalla principal con el audio ya
  desbloqueado, el saludo suena de inmediato.
- `Sfx.ensure()` ya no exige `window`: el desbloqueo se puede probar sin DOM.
- `package.json` sube a **0.8.1**.

### Añadido
- **`src/services/firstGesture.ts`**: `FirstGestureGate`, la espera del primer
  gesto del niño (`touchstart` / `mousedown` / `keydown`, en fase capture, un
  solo disparo). Recibe el objeto al que engancharse, así que es lógica pura.
- **`audio.sayOnFirstGesture(frase, onGesture?, onDone?)`**: saludo que espera al
  toque, desbloquea el audio y dice la frase; la pantalla decide si ese toque
  sirve para saludar, y puede cancelar la espera si la pantalla cambia.
- **13 tests** (`tests/firstGesture.test.ts`): antes del gesto **no se locuta
  nada** (ni clip ni TTS), el primer toque desbloquea y usa el clip, el disparo
  es único, cualquier gesto cuenta, un toque que ya elige jugador no saluda, una
  espera cancelada no suena ni deja escuchas, con la voz silenciada no suena, sin
  clips la frase se dice entera con la voz del sistema, y **la bienvenida del
  mapa espera su turno si el saludo sigue sonando** (nadie pisa a nadie).
- **`src/services/voiceSteps.ts`**: `playVoiceSteps(speaker, steps)` encadena
  la locución de la recompensa y ejecuta la acción de cada paso al terminar
  (enseñar la siguiente estrella). Lógica pura, con las mismas garantías que
  la cola de voz: nada se pisa y se corta si el niño se va.
- **5 tests** (`tests/rewardSteps.test.ts`): la estrella aparece **solo** al
  terminar su número, nunca antes; el orden de pasos se respeta; las frases
  vacías se saltan sin romper la cadena; si el niño se va a mitad no aparece
  ninguna estrella a destiempo → **89 tests**.

### Notas
- Sin MP3 nuevos: el catálogo sigue con **299 frases** y los audios no cambian
  ("Elige una actividad." ya estaba grabado desde 0.6.0, solo faltaba pedirlo;
  los números sueltos, de "uno" a "diez", también estaban: el conteo deja de
  ser un único clip para poder enseñar estrella por estrella).
- Documentación: el recuento de la voz se había quedado en “303 frases” en
  README, MANUAL, VOICE, ARCHITECTURE y el generador desde 0.8.0 (el manifiesto
  tiene 299); corregido al número real.
- Verificado en el navegador con la voz instrumentada: saludo de perfiles
  (1,28 s completos) y bienvenida del mapa (1,65 s completos) suenan con clip,
  uno detrás del otro, **0 locuciones al TTS y 0 cortes**; el mapa no repite la
  bienvenida al volver de una actividad. En la recompensa del número 4 las
  cuatro estrellas caen a **+16/+19/+51/+16 ms** del final de
  "uno/dos/tres/cuatro" y todas están en pantalla antes de que Lapi diga
  "4 estrellas"; con la voz silenciada el conteo conserva el escalón visual de
  0,28 s.
  El service worker se queda en `garabati-v6` (los assets llevan hash y el
  `index.html` es network-first, así que el arreglo llega sin purgar cachés).
- Queda pendiente de la auditoría de voz anterior (no lo pedía este arreglo):
  "Mírame. Yo lo hago así." es más corta que la demostración de los trazos
  largos.

## [0.8.0] — 2026-10-02 · Letras y números fieles al trazo, con pauta de escritura

### Corregido
- **Las letras ya no son “estimaciones”.** Todas las mayúsculas se rehacen sobre
  una **caja de escritura compartida** (`content/writingBox.ts`: ceja 0,16 ·
  altura de barras 0,50 · línea media 0,67 · base 0,84 · columnas 0,24/0,76), y
  las piezas que se tocan **se calculan** en vez de escribirse “cerca”. Casos
  reales que estaban mal y ahora no:
  - **La A**: la barra iba de 0,28 a 0,72 y **sobresalía de la letra por los dos
    lados**; ahora nace y muere exactamente en las diagonales (`diagX`).
  - **La Ñ**: la “~” estaba en 0,26, **dentro** de la caja de la N; ahora es una
    cúbica **por encima** de la ceja.
  - **El 6**: el bucle empezaba **114 px lejos** de donde llegaba el palito (un
    salto visible); ahora nace en el mismo punto.
  - **La S** no llegaba a la línea base y **el 2** no llegaba a la ceja: ambos
    arcos corregidos.
  - **La I** estaba pegada al margen izquierdo (parecía una raya suelta): ahora
    es un palo centrado; **la N** llevaba la diagonal al revés y la voz la
    describía mal (“Abajo, arriba y abajo”); **la J** era una curva hecha de
    rectas; **la G** tenía la patita despegada de la barriga.
- **Los números se escriben como se enseñan** (estilo de España y Latinoamérica):
  el **1** lleva palito y base, el **4** es cerrado, el **7 va sin raya** cruzada y
  el **9 cae con la pata recta**; el 0 es ovalado y el 3 tiene las dos barrigas
  reales. Antes el 1 era un palo suelto.
- **Las curvas son curvas de verdad**: cada letra de las familias “curvas” y
  “curvas y líneas” (C, O, S, U, D, G, P, R, J) tiene al menos un arco o una
  cúbica; ya no hay letras “aproximadas” con poligonales de rectas.

### Añadido
- **Pauta de escritura de 4 líneas en el lienzo** (ceja, altura de barras, media
  discontinua y base), como el cuaderno de escritura infantil. El contenido la
  declara (`ResourceDef.guideLines`) y el motor solo la pinta: las fases A y B
  (trazos sueltos) no la muestran.
- **`src/content/writingBox.ts`**: la métrica compartida y los helpers de
  geometría (`diagX`, `cBody`, `bowl`, `ring`, `arcDeg` en grados) que hacen que
  las uniones sean exactas por construcción.
- **10 tests de fidelidad** (`tests/engine.test.ts` → *fidelidad de la caja de
  escritura*): toda grafía llega a la ceja y apoya en la base, ninguna se sale de
  la caja, **cada trazo toca al menos otro trazo** (la letra es una figura sola),
  las **uniones son exactas** (barra de la A, puente de la H, valles del M, cola
  del 2, tangencia del 9…), las curvas son reales, la tilde de la Ñ está encima,
  el 7 va sin raya y el 1 con base, y la pauta está declarada donde toca →
  **71 tests** en total.
- Voz regenerada: las 6 frases nuevas (“Dos patas y una diagonal.”, “Un palito, un
  palo y una base.” y las cuatro pistas nuevas del 1 y el 8) tienen audio y los
  10 MP3 huérfanos de las etiquetas antiguas quedaron podados (**299 frases**).

### Cambiado
- El catálogo de la voz pasa de 303 a **299 frases** (las etiquetas de trazo
  cambian: “vuelta de arriba/abajo” en el 8, “el palito/el palo/la base” en el 1).
- `package.json` sube a **0.8.0**.

### Notas
- Verificado en el navegador: la **A** completa los 3 trazos, la barra cae exacta
  entre las diagonales, la pauta se dibuja en 0,16 / 0,50 / 0,67 / 0,84 sobre el
  lienzo y la recompensa da 3 ⭐ con 98 % de precisión.
- La app **no cambia de comportamiento**: mismos ids, mismos recursos, mismos
  umbrales. Solo la forma de la letra, la pista que se locuta y el fondo del
  lienzo.

## [0.7.1] — 2026-10-02 · La voz de Lapi, más cálida y clara (ritmo y tono ajustados)

### Cambiado
- **Los 303 MP3 se han regrabado** con la voz **Paulina (es_MX)** a
  **`--rate 155 --pitch 1.06`** (antes `pitch 1.12`): la F0 baja de 183 a
  **173 Hz** —un semitono, justo por encima de la voz natural— y el timbre
  resulta **más cálido** sin entrar en la zona aguda y fina. La **duración de
  los clips no cambia** (el tono se aplica con `asetrate`+`atempo`, que
  compensan la velocidad), así que el encadenamiento *presentación → demo* y
  el perro guardián de la cola siguen valiendo igual. **Un semitono medido es
  lo que separa una voz "clara" de una voz "cálida" en 3–6 años**: por debajo
  de ~1.0 se apaga, por encima de ~1.18 se afina.
- **Ritmo elegido: 155 ppm** (bucket natural de `say`), que dentro del juego
  con el ajuste 🐢 son **112 palabras por minuto y 11,3 caracteres/s**: pausado
  para un peque de 3 años y sin feeling de arrastre en los ánimos cortos
  (*"¡Bien hecho!"*).
- **Service worker `garabati-v5`**: los MP3 conservan sus nombres, así que la
  caché v4 habría servido el audio con el tono anterior; al activar se purga.
- **`scripts/generate-voice.mjs`**: los valores por defecto pasan a ser los
  que suenan en el repo (`Paulina (Español (México))`, `rate 155`,
  `pitch 1.06`) y el resumen final imprime voz + ritmo + tono, para que una
  regeneración sin flags no se lleve por delante el ajuste.
- `package.json` sube a **0.7.1**.

### Añadido
- **`docs/VOICE.md` §5 "Ritmo y tono"**: el barrido de **19 combinaciones**
  (`rate` 145/155/165 × `pitch` 1.00–1.24) con las tablas de duración, F0 y
  energía en la banda de inteligibilidad 300–3400 Hz, más tres hallazgos
  que no se oyen a oído: **`say` cuantiza `--rate`** (145, 155 y 165 producen
  MP3 **bit a bit idénticos**; el ajuste fino de ritmo vive en el ajuste 🐢),
  **`--pitch` no altera la duración** y el tono es un **desplazamiento puro**
  (no cambia la expresividad).
- `docs/ARCHITECTURE.md` §14 y `README` reflejan el comando canónico con
  `--rate 155 --pitch 1.06`.

### Notas
- Sin cambios de comportamiento en la app: mismo manifiesto (los ids dependen
  del texto, no de la voz), mismos 303 clips, ~3,2 MB.
- Sigue en pie el aviso de licencias: antes de publicar hay que regenerar con
  un proveedor con licencia de redistribución (`docs/VOICE.md` §3).

## [0.7.0] — 2026-10-02 · Voz de Paulina, mascota Lapi y locuciones que no se cortan

### Corregido
- **Se acabaron las frases cortadas.** Cada `sayAll` cancelaba la locución en
  curso para "dar paso" a la nueva: la presentación de la actividad se partía
  a media palabra cuando arrancaba la demo (un `setTimeout` de 1,6 s heredado
  del TTS) y un ánimo nuevo pisaba la pista del trazo. Ahora
  **`services/voiceSequencer.ts`** garantiza que **la locución que suena
  termina siempre**; lo que llega espera su turno y se oye completo, en orden.
  Solo interrumpen `stopVoice()` (salir de pantalla) y silenciar el juego.
- **La demo arranca cuando termina la presentación**, no con un temporizador
  a ojo: `screens/activity.ts` encadena con el `onDone` real de la voz
  (mínimo 1,2 s en pantalla para que el peque vea el recurso aunque el audio
  esté silenciado).

### Cambiado
- **La voz del juego es `Paulina (Español (México))`** (es_MX, femenina):
  los **303 MP3 se han regenerado con `--force --prune`** y el manifiesto lo
  declara (`provider: "macos"`). El juego sigue sin depender de ningún
  servicio en ejecución: los audios viajan en el bundle.
- **La mascota ahora se llama Lapi** (femenina, a juego con la voz):
  `content/brand.ts` (`mascot: "Lapi"`), la bienvenida —*"¡Hola! Soy Lapi, tu
  lápiz mágico. ¿Jugamos?"*— y todos los comentarios/JSDoc y documentos. La
  bienvenida cambia de texto, así que tiene **id de audio nuevo** y el MP3
  anterior quedó podado.
- **Service worker `garabati-v4`**: los MP3 se regeneraron con otra voz
  conservando el nombre de fichero, así que la caché `v3` habría servido
  audio viejo; al activar se purga.
- `package.json` sube a **0.7.0** (estaba en 0.5.0, desincronizado del
  CHANGELOG).

### Añadido
- **`services/voiceSequencer.ts`**: cola pura (sin DOM) que serializa las
  locuciones, con tope de 2 pendientes (si se acumulan avisos se descartan los
  más viejos —nunca el que suena— avisando igual de su `onDone`), `cancel()`
  para el barge-in legítimo y un **perro guardián** que desatasca la cola si un
  WebView nunca avisa del final.
- **`VoiceProvider.speakAll(texts, onDone)`**: contrato de finalización real
  (clips: `ended` encadenado; TTS: `onend`/`onerror`; fichero roto o autoplay
  bloqueado: respaldo a TTS que también avisa). `audio.sayAll(texts, onDone)`
  lo expone a las pantallas.
- **`tests/voiceQueue.test.ts`** (11 tests): ninguna locución se corta, el
  orden se respeta, `onDone` encadena sin timers, el tope descarta los avisos
  viejos, `cancel()` vacía, el perro guardián funciona y la fachada no cancela
  lo que suena → **59 tests** en total.

### Notas
- Sigue en pie el aviso de licencias: las voces de Apple valen para
  desarrollo; antes de publicar, regenerar con un proveedor con licencia de
  redistribución (`docs/VOICE.md` §3). Es un comando y el resto no cambia.

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