/* Iconos SVG de la interfaz (chrome): botones, píldoras y HUD.

   Por qué no emoji: el emoji del botón depende de la fuente del
   dispositivo. En los objetivos del juego (**Android 5** con WebView
   Chromium 37 y **Safari 9**) la fuente de emoji llega como mucho a
   Unicode 6, así que todo lo moderno (U+1F900 en adelante: 🦊 🧊 🤖 🥛 🦒
   🧀 🦋 🧡 🦓 🪁 🦁 🦄) sale como **cuadro vacío**, y el mismo botón se ve
   distinto en cada tableta. Un SVG va con la paleta, con el grosor del
   trazo y con el tamaño de cada botón, y pesa lo mismo en todas partes.

   Estilo: rejilla de 24, trazo **grueso con remates redondos**
   (`.icon` en `styles.css`), el aire que necesita un botón que toca un
   niño de 3 años. Nada de `var()` ni CSS moderno; los nodos se crean
   con `createElementNS` y cada trazo se escribe como dato (nada de
   `innerHTML` en SVG: Safari 9 loIgnora), así que el módulo es ES5
   puro y testeable.

   Los emoji de **contenido** (el significado de cada letra, los objetos
   que se cuentan, los avatares) no se sustituyen por un icono genérico: son
   la imagen del contenido pedagógico. Los que Android 5 no tiene
   (U+1F900+) se dibujan como ilustración en `artwork.ts`. El reparto
   completo está en `docs/ARCHITECTURE.md` §13.1. */

var SVG_NS = "http://www.w3.org/2000/svg";

/** Una figura del icono: trazo (`path`), círculo o rectángulo. */
export interface IconShape {
  /** `path` (obligatorio) | `circle` (cx,cy,r) | `rect` (x,y,w,h,rx). */
  t: "path" | "circle" | "rect";
  d?: string;
  cx?: number;
  cy?: number;
  r?: number;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  rx?: number;
  /** Relleno en vez de contorno (estrellas, corazones). */
  fill?: boolean;
}

/** Cada icono es una lista de figuras sobre la rejilla de 24×24. */
export var ICONS: Record<string, IconShape[]> = {
  /* --- navegación --- */
  home: [
    { t: "path", d: "M3.6 11.4 12 4.2l8.4 7.2V19a1.6 1.6 0 0 1-1.6 1.6H5.2A1.6 1.6 0 0 1 3.6 19z" },
    { t: "path", d: "M9.6 20.6v-5.2h4.8v5.2" },
  ],
  gear: [
    { t: "circle", cx: 12, cy: 12, r: 6.6 },
    { t: "circle", cx: 12, cy: 12, r: 2.6 },
    { t: "path", d: "M12 1.8v2.6M12 19.6v2.6M1.8 12h2.6M19.6 12h2.6" },
    { t: "path", d: "M4.8 4.8l1.8 1.8M17.4 17.4l1.8 1.8M19.2 4.8l-1.8 1.8M6.6 17.4l-1.8 1.8" },
  ],
  arrowLeft: [
    { t: "path", d: "M20 12H4.4" },
    { t: "path", d: "M10.6 5.8 4.4 12l6.2 6.2" },
  ],
  arrowRight: [
    { t: "path", d: "M4 12h15.6" },
    { t: "path", d: "M13.4 5.8 19.6 12l-6.2 6.2" },
  ],
  refresh: [
    { t: "path", d: "M20.2 12a8.2 8.2 0 1 1-2.7-6.1" },
    { t: "path", d: "M20.6 4.4v4.6H16" },
  ],

  /* --- acciones --- */
  plus: [{ t: "path", d: "M12 5.2v13.6M5.2 12h13.6" }],
  check: [{ t: "path", d: "M4.6 12.6 9.6 17.6 19.4 6.8" }],
  smile: [
    { t: "circle", cx: 12, cy: 12, r: 8.4 },
    { t: "path", d: "M8.6 14.2a4.2 4.2 0 0 0 6.8 0" },
    { t: "path", d: "M9 9.4v.6M15 9.4v.6" },
  ],
  key: [
    { t: "circle", cx: 8, cy: 12, r: 3.6 },
    { t: "path", d: "M11.6 12H20M17 12v3M20 12v2.2" },
  ],
  /* En relleno, no en trazo: a 64 px los trazos de la tortuga se
     fundían en un borrón. Silueta de caparazón + cabeza + dos patas. */
  slow: [
    { t: "path", fill: true, d: "M2.8 16.4a8.2 6.6 0 0 1 16.4 0z" },
    { t: "circle", cx: 20.3, cy: 12.4, r: 2.7, fill: true },
    { t: "rect", x: 6.2, y: 16.1, w: 3.4, h: 3.6, rx: 1.3, fill: true },
    { t: "rect", x: 13.6, y: 16.1, w: 3.4, h: 3.6, rx: 1.3, fill: true },
  ],

  /* --- sonido --- */
  soundOn: [
    { t: "path", d: "M4 9.4h3.6L12.4 5v14L7.6 14.6H4z" },
    { t: "path", d: "M15.6 9.4a3.9 3.9 0 0 1 0 5.2M18.4 6.8a7.7 7.7 0 0 1 0 10.4" },
  ],
  soundOff: [
    { t: "path", d: "M3.6 9.4h3.4L11.6 5v14L7 14.6H3.6z" },
    { t: "path", d: "M16.4 10.2l4.6 3.6M21 10.2l-4.6 3.6" },
  ],

  /* --- progreso y estado --- */
  star: [{ t: "path", d: "M12 3.6l2.65 5.5 5.95.82-4.3 4.16 1.03 5.94L12 17.26l-5.33 2.76 1.03-5.94-4.3-4.16 5.95-.82z" }],
  starFilled: [
    {
      t: "path",
      fill: true,
      d: "M12 3.6l2.65 5.5 5.95.82-4.3 4.16 1.03 5.94L12 17.26l-5.33 2.76 1.03-5.94-4.3-4.16 5.95-.82z",
    },
  ],
  sparkles: [
    { t: "path", d: "M11 3l1.85 5.15L18 10l-5.15 1.85L11 17l-1.85-5.15L4 10l5.15-1.85z" },
    { t: "path", d: "M18.4 14.6l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9z" },
    { t: "path", d: "M6.2 14.2l.62 1.66 1.66.62-1.66.62-.62 1.66-.62-1.66-1.66-.62 1.66-.62z" },
  ],
  lock: [
    { t: "rect", x: 4.6, y: 10.2, w: 14.8, h: 10.2, rx: 2.4 },
    { t: "path", d: "M8.2 10.2V7.6a3.8 3.8 0 0 1 7.6 0v2.6M12 14.2v2.4" },
  ],
  sleep: [
    { t: "path", d: "M4.4 7.6h4l-4 4h4M11.6 4.6h5l-5 5h5" },
    { t: "path", d: "M19.4 14.6h3.2l-3.2 3.2h3.2" },
  ],

  /* --- información --- */
  mic: [
    { t: "rect", x: 9.2, y: 3, w: 5.6, h: 10.4, rx: 2.8 },
    { t: "path", d: "M5.8 11.4a6.2 6.2 0 0 0 12.4 0M12 17.6V21" },
  ],
  grown: [
    { t: "circle", cx: 12, cy: 7.4, r: 3.6 },
    { t: "path", d: "M4.8 20.6a7.2 7.2 0 0 1 14.4 0" },
  ],
  heart: [
    { t: "path", fill: true, d: "M12 20.4l-7.3-7a4.1 4.1 0 0 1 5.8-5.8l1.5 1.5 1.5-1.5a4.1 4.1 0 0 1 5.8 5.8z" },
  ],
  music: [
    { t: "path", d: "M9 18V5.4l10-2v12.2" },
    { t: "circle", cx: 6.6, cy: 18, r: 2.6 },
    { t: "circle", cx: 16.6, cy: 15.6, r: 2.6 },
  ],
  trash: [
    { t: "path", d: "M4.4 6.6h15.2" },
    { t: "path", d: "M9.4 6.6V4.4h5.2v2.2" },
    { t: "path", d: "M6.4 6.6l1.2 13a1.6 1.6 0 0 0 1.6 1.5h5.6a1.6 1.6 0 0 0 1.6-1.5l1.2-13" },
    { t: "path", d: "M10.4 10.4v6.8M13.6 10.4v6.8" },
  ],
};

/** Nombre de todos los iconos (para tests y documentación). */
export var ICON_NAMES: string[] = [
  "home", "gear", "arrowLeft", "arrowRight", "refresh",
  "plus", "check", "smile", "key", "slow",
  "soundOn", "soundOff",
  "star", "starFilled", "sparkles", "lock", "sleep",
  "mic", "grown", "heart", "music", "trash",
];

function shapeEl(s: IconShape): SVGElement {
  var node: SVGElement;
  if (s.t === "circle") {
    node = document.createElementNS(SVG_NS, "circle") as SVGElement;
    node.setAttribute("cx", String(s.cx));
    node.setAttribute("cy", String(s.cy));
    node.setAttribute("r", String(s.r));
  } else if (s.t === "rect") {
    node = document.createElementNS(SVG_NS, "rect") as SVGElement;
    node.setAttribute("x", String(s.x));
    node.setAttribute("y", String(s.y));
    node.setAttribute("width", String(s.w));
    node.setAttribute("height", String(s.h));
    node.setAttribute("rx", String(s.rx));
  } else {
    node = document.createElementNS(SVG_NS, "path") as SVGElement;
    node.setAttribute("d", s.d || "");
  }
  if (s.fill) node.setAttribute("class", "icon__fill");
  return node;
}

/**
 * Crea un icono listo para insertar.
 *
 * @param name clave de `ICONS`
 * @param className clases del `<svg>` (por defecto `icon`)
 * @returns `<svg>` decorativo (`aria-hidden`): el texto o el
 *   `aria-label` del botón sigue siendo lo que se lee.
 */
export function iconEl(name: string, className?: string): SVGElement {
  var svg = document.createElementNS(SVG_NS, "svg") as SVGElement;
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("class", className || "icon");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  var shapes = ICONS[name];
  if (!shapes) return svg;
  for (var i = 0; i < shapes.length; i++) svg.appendChild(shapeEl(shapes[i]));
  return svg;
}

/** ¿Hay icono con ese nombre? (los tests lo usan). */
export function hasIcon(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(ICONS, name);
}