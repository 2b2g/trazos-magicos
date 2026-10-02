/* Genera la tabla `ARTWORK` de `src/ui/artwork.ts` desde los SVG de
   **Fluent Emoji Flat** (Microsoft, MIT).

   Por qué este pack y no otro: el juego necesita dibujos que se vean
   **igual en todas las tablets**, incluidos los objetivos antiguos. Los
   emoji de U+1F900+ salen como cuadro vacío en Android 5 (su fuente llega
   a Unicode 6) y en Safari 9 (se quedó en 2015), así que van dibujados.
   Entre los packs libres que los cubren enteros, Fluent gana en los tres
   ejes: licencia **MIT** (sin atribución obligatoria, a diferencia de
   Twemoji CC BY 4.0), **11,4 kB gzip** para los 16 (Noto pesa 29,5 kB) y
   un estilo plano de pegatina que encaja con el resto de la app. Además
   no usa gradientes ni filtros: son `<path fill>` planos, que es
   justo lo que necesita `createElementNS`.

   Uso:
     node scripts/build-artwork.mjs              # descarga de Iconify
     node scripts/build-artwork.mjs --offline    # usa la caché local

   La descarga va contra Iconify (api.iconify.design), que sirve los SVG
   originales de https://github.com/microsoft/fluentui-emoji. La caché
   queda en `.design/art-src/` (gitignored) para poder repetir la
   generación sin red. */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";

const OFFLINE = process.argv.includes("--offline");
const CACHE = ".design/art-src";
const API = "https://api.iconify.design/fluent-emoji-flat";

/** emoji -> nombre del icono en Fluent, para qué se usa y de dónde sale. */
const ORDEN = [
  // avatares: los ocho van en vectores porque salen **en fila** y, si uno
  // fuera emoji del sistema, se vería distinto de sus vecinos
  ["🦊", "fox", "avatar: zorro"],
  ["🐼", "panda", "avatar: panda"],
  ["🐸", "frog", "avatar: rana"],
  ["🦁", "lion", "avatar: león"],
  ["🐧", "penguin", "avatar: pingüino"],
  ["🦄", "unicorn", "avatar: unicornio"],
  ["🐯", "tiger", "avatar: tigre"],
  ["🐨", "koala", "avatar: koala"],
  // significados de letras: los que no existen en Android 5 / Safari 9
  ["🪁", "kite", "K: cometa"],
  ["🧊", "ice", "I: hielo"],
  ["🥛", "glass-of-milk", "Y: vaso de leche"],
  ["🤖", "robot", "R: robot"],
  ["🦒", "giraffe", "J: jirafa"],
  ["🧀", "cheese-wedge", "Q: queso"],
  // palabras post-MVP (datos sin usar todavía)
  ["🦋", "butterfly", "mariposa"],
  ["🧡", "orange-heart", "corazón naranja"],
  ["🦓", "zebra", "cebra"],
];

/**
 * Redondea la geometría de un `d` de SVG a un decimal.
 *
 * El arte se ve a 128 px dentro de una caja de como mucho 15vmin, así que
 * 0,05 unidades son ~0,2 px en pantalla: redondear ahorra casi un 40 %
 * del gzip del bundle sin que se note. Pero **redondear una `d` no es
 * hacer replace de números**, y dos trampas rompen el dibujo en silencio:
 *
 * 1. **Un número puede empezar por punto, y ese punto hace también de
 *    separador del anterior.** `-1.538.961` son **dos** números (`-1.538`
 *    y `.961`). Si `.961` se escribe `1` a secas, la cadena pasa a ser
 *    `-1.51`: un número distinto, y la figura se deforma (se le cortaban
 *    las orejas al zorro y la cabeza a la jirafa).
 *
 * 2. **Los flags de arco no son números.** En `A rx ry rot large-arc sweep
 *    x y`, los dos flags se leen como un **único carácter** `0` o `1`.
 *    Escribirlos `0.0` hace el token inválido y **el navegador descarta la
 *    ruta entera sin avisar**: el animal se veía en trozos sueltos.
 *
 * Por eso se tokeniza la ruta, se cuenta la posición de cada argumento
 * y solo se redondean los que de verdad son medidas.
 */

/** Argumentos de cada comando de path. `A`/`a` llevan los flags en 3 y 4. */
const ARGS = {
  m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2,
  a: 7, z: 0,
};

/** Índices (0-based) de los argumentos que son flags de arco, no medidas. */
const FLAGS = { a: [3, 4], A: [3, 4] };

function redondear(d, decimales = 1) {
  let salida = "";
  let i = 0;
  let cmd = "";    // letra del comando que se está leyendo
  let indice = 0;  // posición del argumento dentro del grupo

  while (i < d.length) {
    const ch = d[i];

    if (/[a-zA-Z]/.test(ch)) {
      salida += ch;
      cmd = ch;
      indice = 0;
      i++;
      continue;
    }

    // separador (espacio, coma, tabulador, salto de línea)
    if (/[\s,]/.test(ch)) {
      i++;
      continue;
    }

    const m = /^[-+]?(\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/.exec(d.slice(i));
    if (!m) {
      // carácter inesperado: se copia tal cual para no perder geometría
      salida += ch;
      i++;
      continue;
    }

    /* **Un espacio antes de cada número** siempre que el carácter anterior
       no sea una letra de comando ni un separador.

       El SVG separa números con espacio, con coma o implícitamente
       (`.5-3` son `0.5` y `-3`; `17.658` son `17` y `.658`). Al redondear,
       esos separadores implícitos dejan de ser distinguibles y dos
       números se funden en uno: `17.6` y `6.0` pegados son `17.66`, y la
       figura se aplasta. Con un espacio explícito la separación ya no
       depende de la puntuación, que es justo lo que el redondeo no
       controla. */
    const anterior = salida.charAt(salida.length - 1);
    if (anterior && !/[a-zA-Z\s]/.test(anterior)) salida += " ";

    if ((FLAGS[cmd] || []).includes(indice)) {
      /* Los dos flags de arco no son medidas: se leen como un único
         carácter `0` o `1`. Escribirlos `0.0` hace el token inválido y el
         navegador **descarta la ruta entera sin avisar**. */
      salida += m[0];
    } else {
      const r = Number(parseFloat(m[0]).toFixed(decimales));
      salida += (r === 0 ? (0).toFixed(decimales) : r.toFixed(decimales));
    }

    i += m[0].length;
    indice++;
    // el grupo se cierra al llenar los argumentos; el siguiente lo repite
    const nArgs = ARGS[cmd.toLowerCase()];
    if (nArgs !== undefined && indice >= nArgs) indice = 0;
  }
  return salida;
}

function puntosCodepoints(s) {
  return Array.from(s)
    .map((c) => c.codePointAt(0).toString(16).toUpperCase().padStart(4, "0"))
    .join("-");
}

/** `#abc` → `#aabbcc`: una sola forma de escribir el color. */
function color6(hex) {
  if (hex.length === 4) {
    return "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }
  return hex.toLowerCase();
}

/** Descarga (o lee de la caché) el SVG de un icono de Fluent. */
async function obtener(slug) {
  const cacheado = `${CACHE}/${slug}.svg`;
  if (existsSync(cacheado)) return readFileSync(cacheado, "utf8");
  if (OFFLINE) throw new Error(`${slug}: no está en ${CACHE} y --offline está activo`);
  const res = await fetch(`${API}/${slug}.svg`);
  if (!res.ok) throw new Error(`${slug}: Iconify devolvió ${res.status}`);
  const svg = await res.text();
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(cacheado, svg);
  return svg;
}

/**
 * Convierte el SVG a `{viewBox, paths:[{fill, d}]}`.
 *
 * Fluent envuelve los trazados en `<g fill="none">` y usa `fill` por
 * ruta, así que se leen los `<path>` con su `fill` propio; los que no lo
 * traen heredan `none` y son invisibles, se descartan. También hay
 * `<g>` que groupes con atributos de relleno, que se ignoran: en este set
 * no hay grupos con color propio.
 */
function convertir(svg, slug) {
  const viewBox = /viewBox="([^"]+)"/.exec(svg)[1];
  const paths = [];
  const re = /<path\b([^>]*)\/?>/g;
  let m;
  while ((m = re.exec(svg))) {
    const attrs = m[1];
    const fill = /\bfill="([^"]+)"/.exec(attrs);
    const d = /\bd="([^"]+)"/.exec(attrs);
    if (!fill || !d) continue;
    if (fill[1] === "none") continue;
    paths.push({ fill: color6(fill[1]), d: redondear(d[1]) });
  }
  if (!paths.length) throw new Error(`${slug}: no encontré <path fill="…" d="…">`);
  return { viewBox, paths };
}

const salida = [];
let total = 0;
for (const [emoji, slug, nombre] of ORDEN) {
  const svg = await obtener(slug);
  const { viewBox, paths } = convertir(svg, slug);
  total += paths.length;
  salida.push(
    `  /* ${emoji} ${nombre} (U+${puntosCodepoints(emoji)}) */\n` +
      `  "${emoji}": {\n    viewBox: "${viewBox}",\n    paths: [\n` +
      paths.map((p) => `      { fill: "${p.fill}", d: "${p.d}" },`).join("\n") +
      `\n    ],\n  },`,
  );
  process.stderr.write(`${emoji} ${slug}: ${paths.length} paths\n`);
}
process.stdout.write(salida.join("\n") + "\n");
process.stderr.write(`total: ${ORDEN.length} dibujos, ${total} trazados\n`);