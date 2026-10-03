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
   planos, sin degradados ni brillos). Las cuatro fichas llevan el
   dibujo que anuncia la fase: el lazo y el lápiz en «trazos», las tres
   formas en «figuras», **A B C** en «letras» y **1 2 3** en «números»,
   cada glifo en un color distinto y con el halo blanco del diseño.

   Sobre las letras y las cifras: «sin letras» era sin **títulos**
   («LETRAS», «NÚMEROS» escritos debajo), no sin glifos. «A B C» y
   «1 2 3» sí son parte del dibujo, y además son la pista visual de
   qué hay detrás de la pestaña. La regla técnica que sí se mantiene es
   otra: **nada de `<text>`**. Las letras van dibujadas como `path`
   trazados, no tipografiadas, porque un `<text>` sale en la tipografía
   del sistema —o en un cuadrado vacío si esa fuente no está— y el
   juego no puede depender de lo que tenga instalado el dispositivo.

   Estilo: rejilla de 32, fichas de 29 con el borde de 1,8 (el grosor
   del trazo de la app) y figuras rellenas de color plano. El contorno
   del mismo color que el relleno, con `stroke-linejoin: round`, es lo
   que redondea las puntas de la estrella y del triángulo sin tener que
   escribir un path con curvas.

   Un detalle que costó un rato: el lápiz se dibuja **horizontal** y se
   gira con `rotate(ángulo centro)`. Por eso el centro de giro va en la
   propia figura (`tf`) y no como dato suelto: composing dos
   transformaciones seguidas (`rotate(...) translate(...)`) gira también
   la traslación, y el lápiz se va de la ficha sin que ningún error lo
   delate.

   Y el otro: los glifos **no se escalan con `transform`**. Se construyen
   con una función que recibe la caja (x, y, alto) y devuelve puntos ya
   en coordenadas de la rejilla, porque el test que comprueba que las
   figuras no se salen de la ficha solo sabe aplicar un `rotate`, y un
   `scale` o un `translate` se le escaparían sin avisar.

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

/* --- los glifos de «letras» y «números» ---------------------------------
   Cada letra y cada cifra es una lista de trazos, y cada trazo una lista
   de puntos de la rejilla de 32. Se dibujan **trazados** (`fill: none` +
   `stroke` de punta y unión redondas), que es lo que da el trazo grueso
   del diseño, y por debajo, **el mismo trazo en blanco y más gordo**:
   ese es el halo blanco de la referencia, que es lo que separa la letra
   del fondo de color. Las dos pasadas van separadas (todos los halos,
   luego todas las letras) para que el halo de una letra no se coma el
   color de la que tiene al lado. */

/** Un trazo: puntos `[x, y]` de la rejilla de 32. */
type Trazo = number[][];

/** El `d` de un trazo: `M` y `L` sobre puntos ya redondeados. */
function dDe(trazo: Trazo): string {
  var d = "";
  for (var i = 0; i < trazo.length; i++) {
    d += (i === 0 ? "M" : "L") + r2(trazo[i][0]) + " " + r2(trazo[i][1]);
  }
  return d;
}

/** Puntos de un arco elíptico, de `a0` a `a1` radianes. Es lo que
    dibuja las curvas de la B, la C, el 2 y el 3: una circunferencia no
    cabe en un path corto sin engordar el bundle. */
function arco(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n: number): Trazo {
  var p: Trazo = [];
  for (var i = 0; i <= n; i++) {
    var a = a0 + ((a1 - a0) * i) / n;
    p.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return p;
}

/** Las dos pasadas de un glifo: halo blanco y letra de color. */
function glifo(trazos: Trazo[], color: string, grosor: number): CatShape[] {
  var out: CatShape[] = [];
  for (var pasada = 0; pasada < 2; pasada++) {
    for (var i = 0; i < trazos.length; i++) {
      out.push({
        t: "path",
        d: dDe(trazos[i]),
        fill: "none",
        stroke: pasada === 0 ? "#ffffff" : color,
        sw: pasada === 0 ? grosor + 2.4 : grosor,
      });
    }
  }
  return out;
}

/** Los seis glifos, cada uno en su caja. `y` es el borde superior y `h`
    la altura de caja (de A a Z): la anchura sale de la altura, como en
    la tipografía. */
function glifoA(x: number, y: number, h: number): Trazo[] {
  var w = h * 0.92;
  return [
    [[x + w * 0.06, y + h], [x + w * 0.5, y], [x + w * 0.94, y + h]],
    [[x + w * 0.22, y + h * 0.69], [x + w * 0.78, y + h * 0.69]],
  ];
}

function glifoB(x: number, y: number, h: number): Trazo[] {
  var w = h * 0.8;
  return [
    [[x + w * 0.13, y], [x + w * 0.13, y + h]],
    arco(x + w * 0.13, y + h * 0.25, w * 0.8, h * 0.25, -Math.PI / 2, Math.PI / 2, 10),
    arco(x + w * 0.13, y + h * 0.75, w * 0.92, h * 0.25, -Math.PI / 2, Math.PI / 2, 10),
  ];
}

function glifoC(x: number, y: number, h: number): Trazo[] {
  var w = h * 0.86;
  return [arco(x + w * 0.48, y + h * 0.5, w * 0.48, h * 0.48, 0.82, Math.PI * 2 - 0.82, 18)];
}

/** El 1 del juego lleva palito y base (ver `lettersPhaseC`), así que
    aquí también: es el mismo glifo que el niño va a trazar. */
function glifo1(x: number, y: number, h: number): Trazo[] {
  var w = h * 0.68;
  return [
    [[x + w * 0.24, y + h * 0.2], [x + w * 0.52, y]],
    [[x + w * 0.52, y], [x + w * 0.52, y + h]],
    [[x + w * 0.06, y + h], [x + w * 0.94, y + h]],
  ];
}

function glifo2(x: number, y: number, h: number): Trazo[] {
  var w = h * 0.86;
  var cabeza = arco(x + w * 0.48, y + h * 0.27, w * 0.44, h * 0.27, Math.PI, Math.PI * 2 + 0.55, 14);
  var punta = cabeza[cabeza.length - 1];
  return [
    cabeza,
    /* De la punta del arco, la bajada a la izquierda y la base, en un
       solo trazo: es el ángulo del pie del 2. La base se queda corta a
       propósito —si llega hasta el borde derecho se pasa por debajo
       del 3 y la ficha se lee «12 3» en vez de «1 2 3». */
    [punta, [x + w * 0.12, y + h * 0.93], [x + w * 0.78, y + h * 0.93]],
  ];
}

function glifo3(x: number, y: number, h: number): Trazo[] {
  var w = h * 0.9;
  return [
    arco(x + w * 0.24, y + h * 0.25, w * 0.7, h * 0.25, -Math.PI / 2, Math.PI / 2, 10),
    arco(x + w * 0.24, y + h * 0.75, w * 0.78, h * 0.25, -Math.PI / 2, Math.PI / 2, 10),
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

  /* LETRAS — morado: A, B y C, cada una en un color, escalonadas como en
     la referencia (A abajo a la izquierda, B arriba en el centro, C abajo
     a la derecha). El escalonado no es decorativo: en una fila de tres
     glifos del mismo tamaño y a la misma altura, a 24 px el niño vería
     «tres rayas Parecidas» en vez de tres letras. */
  letras: [ficha("#9b4fd4", "#6a2a9e")]
    .concat(glifo(glifoA(5.6, 14.4, 10.4), "#ffc53d", 3.1))
    .concat(glifo(glifoB(12.0, 4.4, 10.4), "#3aa0e8", 3.1))
    .concat(glifo(glifoC(17.8, 14.6, 10.4), "#7ec62e", 3.1)),

  /* NÚMEROS — naranja: 1, 2 y 3, con el mismo escalonado y los mismos
     colores que las letras, para que se lean como la misma serie. El 1
     lleva palito y base porque el del juego los lleva. */
  numeros: [ficha("#ff9a1f", "#c96a00")]
    .concat(glifo(glifo1(5.2, 10.6, 13.8), "#3aa0e8", 3.1))
    .concat(glifo(glifo2(13.0, 4.4, 10.2), "#7ec62e", 3.1))
    .concat(glifo(glifo3(16.8, 15.4, 10.4), "#a86ee0", 3.1)),
};

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
