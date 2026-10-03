/* Fichas de categoría: los cuatro iconos del mapa.

   Qué son: las cuatro fases del juego (trazos, figuras, letras,
   números) dibujadas como una **ficha de color**, la manera en que el
   niño distingue una categoría de otra antes de saber leer. Antes eran
   cuatro emoji sueltos (✏️ 🔷 🔤 🔢) y eso tenía dos problemas:

   1. **No representaban la categoría.** 🔤 (el abecedario) y 🔷 (el
      diamante) son el mismo tipo de dibujo: un cuadrado azul. El niño
      no tenía forma de saber qué iba a encontrar detrás de cada uno.
   2. **Dependían de la fuente del dispositivo**, que es justo lo que
      este juego no se puede permitir (ver `ui/icons.ts`): en Android 5
      un emoji moderno sale como cuadro vacío.

   Cómo se han diseñado: a partir del diseño de referencia de las
   cuatro fichas, reproducido **con el estilo del juego** (colores
   planos, sin degradados ni brillos) y **sin ninguna letra ni número**:
   en la app no hay texto, así que un icono con una «A» dentro le
   pediría al niño saber algo que todavía no sabe. Por eso LETRAS es
   un cuaderno con lápiz (escribir) y NÚMEROS son tres manzanas (contar
   sin leer la cifra).

   Estilo: rejilla de 32, fichas de 29 con el borde de 1,8 (el grosor
   del trazo de la app) y figuras rellenas de color plano. El contorno
   del mismo color que el relleno, con `stroke-linejoin: round`, es lo
   que redondea las puntas de la estrella y del triángulo sin tener que
   escribir un path con curvas.

   Un detalle que costó un rato: el lápiz y el cuaderno se dibujan
   **horizontales** y se giran con `rotate(ángulo centro)`. Por eso el
   centro de giro va en la propia figura (`tf`) y no como dato suelto:
   composing dos transformaciones seguidas (`rotate(...) translate(...)`)
   gira también la traslación, y el lápiz se va de la ficha sin que
   ningún error lo delate.

   Los nodos se crean con `createElementNS` y cada figura se escribe
   como dato (nada de `innerHTML` en SVG: Safari 9 lo ignora), así que
   el módulo es ES5 puro y testeable, como los demás de `ui/`. */

var SVG_NS = "http://www.w3.org/2000/svg";

/** Una figura de la ficha: trazo (`path`), círculo o rectángulo. */
export interface CatShape {
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
  /** Relleno plano (`#rrggbb`, o `none` en los trazos). */
  fill: string;
  /** Contorno. Solo se usa del mismo color que el relleno, para
      redondear las esquinas vivas (punta de la estrella, del triángulo,
      del lápiz) sin tener que escribir un path con curvas. */
  stroke?: string;
  /** Grosor del contorno; por defecto 0 (sin contorno). */
  sw?: number;
  /** Guiones del trazo, para el trazo discontinuo de «trazos». */
  dash?: string;
  /** `transform` tal cual, para girar una figura sobre un punto. */
  tf?: string;
}

/** Lado de la rejilla de cada ficha. */
export var CAT_SIZE = 32;

/* --- la base: común a las cuatro fichas --------------------------------
   Misma silueta y mismo grosor de borde, para que la fila del mapa se
   lea como cuatro fichas de la misma serie. Los colores son los del
   diseño de referencia. */
function ficha(fondo: string, borde: string): CatShape {
  return { t: "rect", x: 1.5, y: 1.5, w: 29, h: 29, rx: 7.6, fill: fondo, stroke: borde, sw: 1.8 };
}

/** Redondea a dos decimales. Las coordenadas del lápiz y de la
    manzana salen de una fórmula (`16 + medio * 0.38`), y sin redondear
    el `d` arrastra decimales de más que ocupan bundle. Dos decimales
    son de sobra: la ficha se ve en 128 px como mucho, y un píxel de la
    rejilla de 32 es medio punto más. */
function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** El lápiz, horizontal y con la punta a la izquierda, listo para
    girar. Es el mismo lápiz en las dos fichas que lo usan: en «trazos»
    es lo que dibuja el trazo y en «letras» lo que escribe. Se pinta
    aquí en vez de en el `data` porque sale de una fórmula, no de un
    dibujo a ojo: `largo` es la longitud del cuerpo, `medio` la mitad
    de su grosor, y todo lo demás (punta, grafito, virola, goma) sale
    de ahí. Girar el lápiz entero es una sola `transform` por figura. */
function lapiz(tf: string, largo: number, medio: number): CatShape[] {
  var punta = 5;
  var hierro = punta + medio * 2.2; // donde acaba la madera
  var fin = hierro + largo; // donde acaba el cuerpo
  var virola = medio * 0.85;
  var gomaL = medio * 1.1;
  var y0 = 16 - medio;
  var y1 = 16 + medio;
  var grafito = punta + medio * 1.2;
  var sombra = 16 + medio * 0.38;
  return [
    { t: "path", d: "M" + punta + " 16 " + r2(hierro) + " " + y0 + " " + r2(hierro) + " " + y1 + "Z", fill: "#ffd98a", tf: tf },
    { t: "path", d: "M" + punta + " 16 " + r2(grafito) + " " + r2(16 - medio * 0.6) + " " + r2(grafito) + " " + r2(16 + medio * 0.6) + "Z", fill: "#3a3350", tf: tf },
    { t: "path", d: "M" + r2(hierro) + " " + y0 + " " + r2(fin - virola) + " " + y0 + " " + r2(fin - virola) + " " + y1 + " " + r2(hierro) + " " + y1 + "Z", fill: "#ffc53d", tf: tf },
    { t: "path", d: "M" + r2(hierro) + " " + r2(sombra) + " " + r2(fin - virola) + " " + r2(sombra) + " " + r2(fin - virola) + " " + y1 + " " + r2(hierro) + " " + y1 + "Z", fill: "#f0a92c", tf: tf },
    { t: "rect", x: r2(fin - virola), y: y0, w: r2(virola), h: medio * 2, rx: r2(virola * 0.36), fill: "#d8dde5", tf: tf },
    { t: "rect", x: r2(fin), y: y0, w: r2(gomaL), h: medio * 2, rx: r2(gomaL / 2), fill: "#f4626b", tf: tf },
  ];
}

/** Cada categoría es una lista de figuras sobre la rejilla de 32×32. */
export var CATEGORIES: Record<string, CatShape[]> = {
  /* TRAZOS — azul: el lazo discontinuo que hay que hacer sin levantar el
     dedo y el lápiz que lo dibuja. El guion es lo que enseña la fase,
     por eso el trazo va a guiones y no pintado. */
  trazos: [ficha("#2f95e8", "#17559b")].concat(
    // el lazo, arriba a la izquierda, con el hueco mirando al lápiz
    [
      {
        t: "path",
        d: "M12.4 16.8A5.6 5.6 0 1 1 16 12.5",
        fill: "none",
        stroke: "#ffffff",
        sw: 2.1,
        dash: "3.2 2.8",
      },
    ],
    // y el lápiz en diagonal, de abajo-izquierda a arriba-derecha
    lapiz("rotate(-45 19 20)", 11.5, 2.6)
  ),

  /* FIGURAS — verde: círculo, estrella y triángulo, los tres motivos de
     los nodos de la fase B. Va el triángulo delante porque es el nodo
     «casita» el que la familia toca primero. */
  figuras: [
    ficha("#7ec62e", "#4a8f14"),
    { t: "circle", cx: 10.5, cy: 10.6, r: 4.7, fill: "#f0483f" },
    {
      t: "path",
      d: "M21.5 5.6 22.7 9 26.3 9.2 23.5 11.4 24.4 14.8 21.5 12.9 18.6 14.8 19.5 11.4 16.7 9.2 20.3 9Z",
      fill: "#ffd23f",
      stroke: "#ffd23f",
      sw: 1.5,
    },
    { t: "path", d: "M16.3 15.6 12 27.2 20.6 27.2Z", fill: "#2f95e8", stroke: "#2f95e8", sw: 2.6 },
  ],

  /* LETRAS — morado: un cuaderno abierto con el lápiz escribiendo en él.
     Sin «A», sin «B», sin «C»: el niño del perfil aún no lee, así que la
     ficha habla de lo que **va a hacer** (escribir), no de lo que va a
     ver. */
  letras: [ficha("#9b4fd4", "#6a2a9e")].concat(
    [
      // las dos hojas, abiertas por el lomo del centro
      { t: "path", d: "M3.6 15.2C7.8 12.9 12.6 13.4 15.6 16v11.4c-3-2.6-7.8-2.1-12-0.6Z", fill: "#ffffff" },
      { t: "path", d: "M28.4 15.2c-4.2-2.3-9-1.8-12 0.8v11.4c3-2.6 7.8-2.1 12-0.6Z", fill: "#ffffff" },
      // lomo y canto de las hojas, en morado oscuro
      { t: "path", d: "M15.6 16v11.4l1-0.8V16.8Z", fill: "#5d2688" },
      { t: "path", d: "M3.6 26.8c4.2-1.5 9-1.5 12 0.2 3-1.7 7.8-1.7 12-0.2v1.3c-4.2-1.5-9-1.5-12 0.2-3-1.7-7.8-1.7-12 0.2Z", fill: "#5d2688" },
    ],
    // el lápiz, atravesando el cuaderno en diagonal
    lapiz("rotate(-38 12.5 16)", 8, 2.1)
  ),

  /* NÚMEROS — naranja: tres manzanas. La fase cuenta hasta el 9, pero
     una ficha con «1 2 3» dentro es una cifra que el niño todavía no
     sabe leer; tres manzanas son tres de verdad, y se pueden contar con
     el dedo. */
  numeros: [ficha("#ff9a1f", "#c96a00")].concat(
    manzana(16.2, 11.6, 4.6),
    manzana(9.8, 22.6, 4.6),
    manzana(22.6, 22.6, 4.6)
  ),
};

/** Una manzana: cuerpo, rabito y hoja. Se usa tres veces, así que vive
    en una función en vez de repetida: cada figura se dibuja, no se
    referencia con `<use>`, que no es fiable en los navegadores viejos. */
function manzana(cx: number, cy: number, r: number): CatShape[] {
  return [
    { t: "path", d: "M" + cx + " " + r2(cy - r + 0.6) + "v-2.8h1.6v2.8Z", fill: "#7a4a2b" },
    { t: "circle", cx: r2(cx + 1.9), cy: r2(cy - r - 1.6), r: 1.5, fill: "#3f9c2f" },
    { t: "circle", cx: cx, cy: cy, r: r, fill: "#ef3f3f" },
    { t: "circle", cx: r2(cx - r * 0.34), cy: r2(cy - r * 0.36), r: r2(r * 0.26), fill: "#ff8a80" },
  ];
}

/** Nombre de todas las categorías (para tests y documentación). */
export var CATEGORY_NAMES: string[] = ["trazos", "figuras", "letras", "numeros"];

function shapeEl(s: CatShape): SVGElement {
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
  node.setAttribute("fill", s.fill);
  if (s.sw) {
    node.setAttribute("stroke", s.stroke || s.fill);
    node.setAttribute("stroke-width", String(s.sw));
    node.setAttribute("stroke-linejoin", "round");
    node.setAttribute("stroke-linecap", "round");
  }
  if (s.dash) node.setAttribute("stroke-dasharray", s.dash);
  if (s.tf) node.setAttribute("transform", s.tf);
  return node;
}

/**
 * Crea la ficha de una categoría, lista para insertar.
 *
 * @param id clave de `CATEGORIES` (`trazos`, `figuras`, `letras`, `numeros`)
 * @param className clases del `<svg>` (por defecto `cat`)
 * @returns `<svg>` decorativo (`aria-hidden`): lo que se lee sigue
 *   siendo el `aria-label` del botón, con el nombre de la fase.
 */
export function categoryEl(id: string, className?: string): SVGElement {
  var svg = document.createElementNS(SVG_NS, "svg") as SVGElement;
  svg.setAttribute("viewBox", "0 0 " + CAT_SIZE + " " + CAT_SIZE);
  svg.setAttribute("class", className || "cat");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  var shapes = CATEGORIES[id];
  if (!shapes) return svg;
  for (var i = 0; i < shapes.length; i++) svg.appendChild(shapeEl(shapes[i]));
  return svg;
}

/** ¿Hay ficha con ese nombre? (los tests lo usan). */
export function hasCategory(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(CATEGORIES, id);
}
