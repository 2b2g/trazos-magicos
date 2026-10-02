# Atribución — Garabati

Garabati no tiene dependencias en runtime, pero sí usa **arte** y **fuente**
de terceros. Este documento los nombra.

## Arte de las ilustraciones de contenido — Fluent Emoji Flat

**Qué:** los 17 dibujos de `src/ui/artwork.ts` (los 8 avatares de perfil, los
significados de letras y los emojis de las palabras post-MVP) provienen de
**Fluent Emoji Flat** de Microsoft.

- **Autoría:** © Microsoft Corporation
- **Licencia:** **MIT** — uso libre, también comercial, **sin obligación de
  atribución**
- **Licencia en texto:** <https://github.com/microsoft/fluentui-emoji/blob/main/LICENSE>
- **Origen:** <https://github.com/microsoft/fluentui-emoji> (descargado vía
  Iconify, `api.iconify.design/fluent-emoji-flat`)

### Por qué este pack

El juego dibuja los emojis que **no existen** en los dispositivos objetivo (la
fuente de Android 5 llega a Unicode 6 y la de Safari 9 se quedó en 2015), para
que un niño vea lo mismo en cualquier tableta. Se compararon los packs libres
que cubren los 17 dibujitos enteros:

| Pack | Licencia | gzip de los 17 | Veredicto |
|---|---|---|---|
| **Fluent Emoji Flat** (Microsoft) | MIT, sin atribución | **11,4 kB** | **Elegido** |
| Noto Emoji (Google) | Apache 2.0, sin atribución | 29,5 kB | 2,6× más pesado |
| Twemoji (Twitter) | **CC BY 4.0**, atribución obligatoria | 13,8 kB | Pesaba más y obliga a atribuir |

Además Fluent usa **color plano sin gradientes ni filtros**, que es lo que
necesita el juego: los nodos se crean con `createElementNS` y cada trazado se
escribe como dato, sin `innerHTML` (Safari 9 lo ignora en SVG).

### Cómo se ha derivado

Los SVG originales (32×32) se procesan con `scripts/build-artwork.mjs`, que:

1. descarga cada icono de Iconify y lo cachea en `.design/art-src/`;
2. **redondea la geometría a un decimal** (de 2 decimales): el arte se ve a
   128 px dentro de una caja de como mucho 15vmin, así que 0,05 unidades son
   ~0,2 px en pantalla. Ahorra un **27 % del gzip** del bloque de arte;
3. emite una tabla `ARTWORK` de datos planos (`{viewBox, paths:[{fill, d}]}`).

No se modifica el diseño de los dibujos: solo la representación numérica. El
redondeo tiene dos trampas que el script resuelve y que están documentadas en su
cabecera: los **flags de arco** (`A rx ry rot laf sf x y`) no son medidas sino
caracteres `0`/`1`, y los números deben llevar **separador explícito** porque en
SVG `-1.538.961` son dos números, no uno.

### Cómo sustituir o añadir arte

Para cambiar una ilustración basta con editar la lista `ORDEN` del script y
regenerar. Si algún día el arte pasa a ser **propio** (por ejemplo un avatar
nuevo dibujado a mano), no requiere atribución; mientras sea Fluent, la
atribución de arriba es la que corresponde. En cualquier caso, los 4 tests de
geometría de `tests/icons.test.ts` comprueban que la tabla no se corrompe.

## Iconos de la interfaz

Los **22 iconos de chrome** de `src/ui/icons.ts` (casa, rueda de ajustes,
flechas, sonido, candado, tortuga…) son **propios**, dibujados para este
proyecto como datos vectoriales. **No derivan de ninguna librería de iconos**
(Phosphor, Tabler, Lucide o similar); ver `docs/ARCHITECTURE.md` §13.1 para el
porqué de no usar ninguna. No requieren atribución.

## Tipografía — Fredoka One

**Qué:** la tipografía del juego (botones, bocadillos, títulos) es
**Fredoka One**.

- **Autoría:** © 2013 The Fredoka One Project Authors
  (<https://github.com/FredokaOne/Fredoka-One>)
- **Licencia:** SIL Open Font License 1.1
- **Licencia completa incluida en:** `public/fonts/OFL.txt`
- **Archivo:** `public/fonts/fredoka-one-latin-400.woff2` (y `.woff` como
  respaldo), **autohospedada** para que el juego funcione sin red.

## Voz

Los audios de `public/voice/` los genera `scripts/generate-voice.mjs` con el
proveedor que se indique. La procedencia de cada clip, sus costes y las
condiciones de uso del proveedor están en **`docs/VOICE.md`**; conviene
mantenerlos actualizados al cambiar de proveedor.

---

🤖 Generated with Codebuff