import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { CATEGORIES, CATEGORY_NAMES, CAT_SIZE, hasCategory, type CatShape } from "../src/ui/categories";
import { PHASES } from "../src/content/families";

/* Las cuatro fichas del mapa (`ui/categories.ts`) tienen que cumplir lo
   mismo que el resto de la iconografía, y además dos cosas que aquí sí
   se pueden comprobar:

   1. **No se salen de la ficha.** El diseño de referencia es un
      cuadrado de color con el dibujo dentro; si una figura se sale, el
      dibujo aparece sobre el fondo del mapa y la categoría pierde el
      color que la identifica. Los lápices y el cuaderno se giran con
      `rotate`, así que el test tiene que **aplicar la rotación**: sin
      ella, el lápiz de «trazos» parecería dentro de la ficha cuando en
      realidad se salía por la esquina (que es lo que pasaba).
   2. **Los `d` no están corruptos.** Un path con un número pegado al
      siguiente (`17.6` + `6.0` → `17.66`) **no da error**: el
      navegador dibuja lo que puede y descarta el resto en silencio, y
      la ficha sale a medio pintar. Se comprueba contando los
      argumentos de cada comando, que es lo único que delata un token
      de más o de menos. */

/** Cuántos valores toma cada comando de path. */
const ARGS: Record<string, number> = {
  m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0,
};

interface Cmd {
  /** El comando, con su caja: `M` mayúscula o `m` minúscula. */
  c: string;
  /** Sus argumentos, ya como números. */
  a: number[];
}

/**
 * Lee un `d` comando a comando, en vez de por números sueltos.
 *
 * No se puede repartir a ojo porque los valores no son todos
 * coordenadas: en `A rx ry rot laf sf x y` solo los dos últimos lo son,
 * y en `h`/`v` hay que sumarlos al punto anterior. Además, un `d` con
 * dos números pegados se lee como un número largo: al contar, un
 * argumento falta y otro sobra, y eso es justo lo que delata este
 * parser. Si algo no cuadra, lanza en vez de adivinar.
 */
function parsear(d: string): Cmd[] {
  var out: Cmd[] = [];
  var cmd = "";
  var i = 0;
  while (i < d.length) {
    var letra = d.charAt(i);
    if (/[a-zA-Z]/.test(letra)) {
      cmd = letra;
      i++;
      continue;
    }
    if (!cmd) throw new Error("el path empieza por un número, sin comando: " + d);
    var n = ARGS[cmd.toLowerCase()];
    if (n === undefined) throw new Error("comando desconocido: " + cmd);
    if (n === 0) throw new Error("comando sin argumentos inesperado: " + cmd);
    var args: number[] = [];
    for (var k = 0; k < n; k++) {
      var m = d.slice(i).match(/^\s*(-?[\d.]+)/);
      if (!m) throw new Error("faltan argumentos de «" + cmd + "» en: " + d);
      args.push(Number(m[1]));
      i += m[0].length;
    }
    out.push({ c: cmd, a: args });
  }
  if (out.length === 0) throw new Error("path vacío: " + d);
  return out;
}

/** Aplica el `rotate(giro centro)` de la figura a un punto. */
function rota(s: CatShape, x: number, y: number): number[] {
  if (!s.tf) return [x, y];
  var m = s.tf.match(/rotate\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s*\)/);
  if (!m) throw new Error("transformada no reconocida en la ficha: " + s.tf);
  var a = (Number(m[1]) * Math.PI) / 180;
  var cx = Number(m[2]);
  var cy = Number(m[3]);
  var dx = x - cx;
  var dy = y - cy;
  return [
    cx + dx * Math.cos(a) - dy * Math.sin(a),
    cy + dx * Math.sin(a) + dy * Math.cos(a),
  ];
}

/**
 * Los puntos que la figura toca de verdad, ya rotados **y con el
 * grosor del trazo**.
 *
 * Solo se anotan los puntos de control y el punto final de cada
 * comando: en una curva o un arco están en la cara exterior o en el
 * interior del trazo, pero ninguno de los dos se sale más allá que
 * ellos, así que para «¿cabe dentro de la ficha?» bastan.
 *
 * El grosor importa desde que las letras y las cifras son trazos con
 * halo blanco: el `d` de la C llegaba hasta 28,2 de 32 y parecía
 * entrar, pero su halo —tres unidades de radio— se salía por la
 * derecha y el test no lo veía, porque solo miraba los puntos. Por eso
 * cada punto se separa la mitad del `stroke-width` en las dos
 * direcciones.
 */
function puntosDe(s: CatShape): number[] {
  var pts: number[] = [];
  var medio = (s.sw || 0) / 2;
  function anota(x: number, y: number): void {
    var p = rota(s, x, y);
    if (medio === 0) {
      pts.push(p[0], p[1]);
      return;
    }
    // el trazo engorda hacia los cuatro lados, no solo hacia el final
    pts.push(p[0] - medio, p[1] - medio);
    pts.push(p[0] + medio, p[1] + medio);
  }

  if (s.t === "circle") {
    // las cuatro esquinas de su caja: peor caso, pero siempre dentro
    var cx = s.cx as number;
    var cy = s.cy as number;
    var r = s.r as number;
    anota(cx - r, cy - r);
    anota(cx + r, cy + r);
    return pts;
  }
  if (s.t === "rect") {
    var rx = s.x as number;
    var ry = s.y as number;
    var rw = s.w as number;
    var rh = s.h as number;
    anota(rx, ry);
    anota(rx + rw, ry + rh);
    return pts;
  }

  var cmds = parsear(s.d || "");
  var x = 0;
  var y = 0;
  var inicioX = 0;
  var inicioY = 0;
  for (var i = 0; i < cmds.length; i++) {
    var cmd = cmds[i];
    var minus = cmd.c === cmd.c.toLowerCase();
    var low = cmd.c.toLowerCase();
    var px: number;
    var py: number;
    if (low === "h") {
      px = minus ? x + cmd.a[0] : cmd.a[0];
      py = y;
    } else if (low === "v") {
      px = x;
      py = minus ? y + cmd.a[0] : cmd.a[0];
    } else {
      // el punto final son los dos últimos argumentos
      var k = cmd.a.length - 2;
      px = minus ? x + cmd.a[k] : cmd.a[k];
      py = minus ? y + cmd.a[k + 1] : cmd.a[k + 1];
      /* Los puntos de control intermedios también los toca el trazo,
         pero en un arco los argumentos NO son coordenadas: son
         `rx ry giro laf sf x y`, y solo los dos últimos lo son. El
         bucle se salta el arco entero, que se mide con su extremo y
         su caja de radio, más abajo.

         Anotar `rx`, `ry` y los dos flags como si fueran puntos era
         un error del propio test que el grosor del trazo ha
         destapado: daba (0, 1) en el lazo de «trazos», y con el
         halo la figura se salía por la izquierda cuando el dibujo
         estaba perfectamente dentro. */
      if (low !== "a") {
        for (var c = 0; c + 1 < cmd.a.length; c += 2) {
          anota(minus ? x + cmd.a[c] : cmd.a[c], minus ? y + cmd.a[c + 1] : cmd.a[c + 1]);
        }
      }
      if (low === "a") {
        /* El arco se curva **entre** sus extremos, así que marcando solo
           el punto final no se ve el vuelo: con `A 14 14` los dos
           extremos caben de sobra en la ficha y el arco se sale por
           arriba. Se marca la caja del radio alrededor del extremo;
           es un límite bastante que puede sobrar, pero nunca
           falta. */
        var r = cmd.a[0];
        anota(px - r, py - r);
        anota(px + r, py + r);
      }
      /* (el radio se toma tal cual: SVG lo estrecha si los dos extremos
         están más lejos, nunca lo ensancha, así que el arco real nunca
         sobresale de esta caja) */
    }
    anota(px, py);
    x = px;
    y = py;
    if (low === "m") {
      inicioX = px;
      inicioY = py;
    }
    if (low === "z") {
      x = inicioX;
      y = inicioY;
    }
  }
  return pts;
}

/* La ficha de color: un rectángulo de 29 con las esquinas muy
   redondeadas. El dibujo tiene que caber **dentro de ella**, no solo
   dentro de la rejilla de 32: el halo blanco de las letras se salía
   hasta 30,75 y la ficha acaba en 30,5, así que el blanco se comía
   el borde y entraba en la esquina redondeada sin que el test de la
   rejilla (que tolerate hasta 32,5) dijera nada. */
const FICHA = { x: 1.5, y: 1.5, w: 29, h: 29, rx: 7.6 };

/** ¿Cae el punto dentro de la ficha de color, esquinas redondeadas
    incluidas? Zona central: basta con estar en el rectángulo. Esquina:
    el punto tiene que caer dentro del círculo de radio `rx`. */
function dentroDeFicha(x: number, y: number): boolean {
  var x2 = FICHA.x + FICHA.w;
  var y2 = FICHA.y + FICHA.h;
  if (x < FICHA.x || x > x2 || y < FICHA.y || y > y2) return false;
  var izq = FICHA.x + FICHA.rx;
  var der = x2 - FICHA.rx;
  var arr = FICHA.y + FICHA.rx;
  var aba = y2 - FICHA.rx;
  if (x >= izq && x <= der) return true;
  if (y >= arr && y <= aba) return true;
  var cx = x < izq ? izq : der;
  var cy = y < arr ? arr : aba;
  var dx = x - cx;
  var dy = y - cy;
  return dx * dx + dy * dy <= FICHA.rx * FICHA.rx;
}

describe("fichas de categoría (ui/categorias.ts)", () => {
  it("cada ficha tiene figuras con relleno y geometría", () => {
    for (var id of Object.keys(CATEGORIES)) {
      var figuras = CATEGORIES[id];
      expect(figuras.length, id).toBeGreaterThan(3);
      for (var i = 0; i < figuras.length; i++) {
        var f = figuras[i];
        // `none` está permitido: es el trazo discontinuo de «trazos»
        expect(f.fill, id).toMatch(/^(none|#[0-9A-Fa-f]{6})$/);
        if (f.t === "path") expect(typeof f.d, id).toBe("string");
        else expect(typeof f.r === "number" || typeof f.w === "number", id).toBe(true);
      }
    }
  });

  it("CATEGORY_NAMES coincide con las claves (nada de fichas muertas)", () => {
    expect(CATEGORY_NAMES.slice().sort()).toEqual(Object.keys(CATEGORIES).sort());
  });

  it("trae las cuatro categorías que el mapa necesita de verdad", () => {
    // si alguien renombra una ficha, la fase se queda sin dibujo
    for (var necesario of ["trazos", "figuras", "letras", "numeros"]) {
      expect(hasCategory(necesario), necesario).toBe(true);
    }
  });

  it("las cuatro fases del mapa apuntan a una ficha que existe", () => {
    expect(PHASES.length).toBe(4);
    for (var i = 0; i < PHASES.length; i++) {
      expect(hasCategory(PHASES[i].cat), PHASES[i].name).toBe(true);
    }
  });

  it("las fases ya no dependen de un emoji de categoría", () => {
    /* Era ✏️ 🔷 🔤 🔢. 🔤 (el abecedario) y 🔷 (el diamante) son el mismo
       tipo de dibujo, así que no decían nada de la fase, y además el
       emoji dependía de la fuente del dispositivo. Que la clave se
       llame `cat` y no `emoji` lo hace delatar si alguien lo
       reintroduce. */
    for (var i = 0; i < PHASES.length; i++) {
      expect(Object.prototype.hasOwnProperty.call(PHASES[i], "emoji"), PHASES[i].name).toBe(false);
    }
  });

  it("ninguna ficha usa <text> ni innerHTML: las letras van dibujadas", () => {
    /* Las fichas **sí** llevan letras y cifras dibujadas —A B C y
       1 2 3 son parte del dibujo y la pista de qué hay detrás de cada
       pestaña—, así que la regla ya no es «sin letras» sino «sin
       tipografía».

       Y hay una razón técnica de peso: un `<text>` sale en la fuente
       del sistema, y en un dispositivo sin esa fuente sale un cuadrado
       vacío. El juego no puede depender de lo que tenga instalado
       quien lo abre (ver `ui/icons.ts`). Por eso las seis letras van
       trazadas con `path`: se ven igual en todas partes.

       Lo que no se puede comprobar mirando el dibujo (una «A» a mano y
       una de tipografía son las dos figuras del SVG) sí se comprueba
       por la vía: que en el módulo no haya un `createElementNS` de
       texto ni un `innerHTML`, que Safari 9 ignora dentro de un SVG. */
    var fuente = readFileSync("src/ui/categories.ts", "utf8");
    // fuera los comentarios: aquí se explica que no hay texto, y el
    // propio comentario contiene la palabra
    var codigo = fuente
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .split("\n")
      .map(function (l) { return l.replace(/\/\/.*$/, ""); })
      .join("\n");
    expect(codigo, "las fichas no dibujan texto").not.toMatch(/text|innerHTML/);
  });

  it("cada categoría tiene su propio color (el color es la señal)", () => {
    /* Si dos fichas compartieran fondo, el niño las confundiría: por
       encima del dibujo, lo que dice «aquí se trazan» es el color. */
    var fondos: Record<string, string> = {};
    for (var id of Object.keys(CATEGORIES)) {
      var base = CATEGORIES[id][0];
      expect(base.t, id + ": la primera figura es la ficha").toBe("rect");
      expect(base.fill, id).not.toMatch(/^none$/);
      expect(fondos[base.fill], "dos fichas con el mismo fondo: " + base.fill).toBeUndefined();
      fondos[base.fill] = id;
    }
    expect(Object.keys(fondos).length).toBe(4);
  });

  /* Los dos fallos silenciosos que ya mordieron en `artwork.ts`:
     los flags de arco escritos como `0.0` (el parser los lee como un
     único carácter `0`/`1`, así que el token es inválido y **se
     descarta la ruta entera**) y los números pegados al redondear. */
  it("la geometría no está corrupta: sin flags de arco con decimales", () => {
    for (var id of Object.keys(CATEGORIES)) {
      var figuras = CATEGORIES[id];
      for (var i = 0; i < figuras.length; i++) {
        var d = figuras[i].d as string;
        if (!d) continue;
        var arcos = d.match(/[Aa][^AaZz]*/g) || [];
        for (var a = 0; a < arcos.length; a++) {
          var args = arcos[a].slice(1).trim().split(/[\s,]+/).filter(Boolean);
          if (args.length !== 7) continue; // arco incompleto, no es de 7
          expect(args[3], id + " arco " + a + " large-arc-flag").toMatch(/^[01]$/);
          expect(args[4], id + " arco " + a + " sweep-flag").toMatch(/^[01]$/);
        }
      }
    }
  });

  it("todos los comandos se llevan sus argumentos (nada de números pegados)", () => {
    /* Este es el test que habría cazado el `17.6` + `6.0` pegados. Al
       leerlos como un solo número, al comando le sobra un argumento y
       al siguiente le falta: eso es lo que se comprueba, no una forma
       del texto (que daría falsos positivos con cualquier coordenada
       de dos decimales, como `10.72`). */
    for (var id of Object.keys(CATEGORIES)) {
      var figuras = CATEGORIES[id];
      for (var i = 0; i < figuras.length; i++) {
        var f = figuras[i];
        if (f.t !== "path") continue;
        var cmds: Cmd[] = [];
        try {
          cmds = parsear(f.d || "");
        } catch (e) {
          expect(String(e), id + " figura " + i).toBe("path bien formado");
        }
        expect(cmds.length, id + " figura " + i).toBeGreaterThan(0);
        for (var c = 0; c < cmds.length; c++) {
          expect(
            cmds[c].a.length,
            id + " figura " + i + ": «" + cmds[c].c + "» con " + cmds[c].a.length + " argumentos"
          ).toBe(ARGS[cmds[c].c.toLowerCase()]);
        }
      }
    }
  });

  it("las figuras no se salen de la ficha (con la rotación y el grosor aplicados)", () => {
    /* El borde de la ficha llega hasta 31,4 de 32 (el rectángulo acaba
       en 30,5 y su trazo de 1,8 sobresale medio punto por lado), así
       que el límite es la propia rejilla con medio punto de margen.
       Las figuras se miden con su `stroke-width` ya sumado, que es lo
       que hacía falta para que el halo blanco de las letras y las
       cifras no pudiera salirse sin que nadie se enterase. */
    for (var id of Object.keys(CATEGORIES)) {
      var figuras = CATEGORIES[id];
      for (var i = 0; i < figuras.length; i++) {
        var pts = puntosDe(figuras[i]);
        expect(pts.length, id + " figura " + i + " sin puntos").toBeGreaterThan(0);
        for (var p = 0; p < pts.length; p += 2) {
          var donde =
            id + " figura " + i + ": (" + pts[p].toFixed(2) + ", " + pts[p + 1].toFixed(2) + ")";
          expect(pts[p], donde + " se sale por la derecha").toBeLessThanOrEqual(CAT_SIZE + 0.5);
          expect(pts[p], donde + " se sale por la izquierda").toBeGreaterThanOrEqual(-0.5);
          expect(pts[p + 1], donde + " se sale por abajo").toBeLessThanOrEqual(CAT_SIZE + 0.5);
          expect(pts[p + 1], donde + " se sale por arriba").toBeGreaterThanOrEqual(-0.5);
        }
      }
    }
  });

  it("el dibujo cabe dentro de la ficha de color, esquinas incluidas", () => {
    /* La primera figura ES la ficha (el rectángulo de color), así que
       lo que se comprueba es el resto: que ninguna figura, halo
       incluido, se salga del cuadrado ni se meta en la esquina
       redondeada. Sin esto, el halo blanco de una letra puede comerse
       el borde de la ficha y seguir pareciendo «dentro» a simple
       vista. */
    for (var id of Object.keys(CATEGORIES)) {
      var figuras = CATEGORIES[id];
      for (var i = 1; i < figuras.length; i++) {
        var pts = puntosDe(figuras[i]);
        for (var p = 0; p < pts.length; p += 2) {
          expect(
            dentroDeFicha(pts[p], pts[p + 1]),
            id + " figura " + i + ": (" + pts[p].toFixed(2) + ", " + pts[p + 1].toFixed(2) +
              ") se sale de la ficha de color"
          ).toBe(true);
        }
      }
    }
  });

  it("cada glifo de letras y números va trazado y con su halo", () => {
    /* Las seis letras y cifras del diseño de referencia —A B C y
       1 2 3— son las que le dicen al niño qué hay detrás de la
       pestaña. Dos cosas tienen que cumplirse y ninguna se ve
       mirando la pantalla:

       1. **Van trazadas, no rellenas ni tipografiadas.** Un glifo es un
          `path` con `fill: none` y un `stroke` de color: es lo que da
          el trazo grueso del diseño, y es además lo que lo hace
          independiente de las fuentes del dispositivo.
       2. **Cada una tiene su halo blanco**, el mismo `d` con más
          grosor. El halo es lo que las separa del fondo de color y lo
          que las separa entre sí, así que un glifo sin halo no es el
          mismo dibujo: es otro dibujo. */
    for (var id of ["letras", "numeros"]) {
      var figuras = CATEGORIES[id].slice(1); // sin la ficha de fondo
      var glifos = figuras.filter(function (f) { return f.fill === "none" && f.stroke === "#ffffff"; });
      expect(glifos.length, id + ": halos").toBeGreaterThanOrEqual(6);

      for (var i = 0; i < figuras.length; i++) {
        var f = figuras[i];
        if (f.stroke === "#ffffff") continue; // es un halo, ya comprobado
        expect(f.fill, id + " figura " + i + ": el glifo va trazado").toBe("none");
        expect(typeof f.stroke, id + " figura " + i + ": el glifo va de color").toBe("string");

        var gemelos = figuras.filter(function (o) { return o.d === f.d && o.stroke === "#ffffff"; });
        expect(
          gemelos.length,
          id + " figura " + i + ": este glifo se ha quedado sin halo"
        ).toBeGreaterThan(0);
        expect(
          gemelos[0].sw as number,
          id + " figura " + i + ": el halo tiene que ser más gordo que la letra"
        ).toBeGreaterThan(f.sw as number);
        /* Y de verdad de sobra, no «un pelo»: con el halo apenas un
           poco más gordo los glifos se limpian pero siguen siendo legibles
           sobre el color, y eso no lo cazaría el test de que no se salen
           de la ficha (un trazo más fino no se sale nunca). Dos unidades
           es lo que separa una letra y la de al lado en el diseño. */
        expect(
          (gemelos[0].sw as number) - (f.sw as number),
          id + " figura " + i + ": el halo es demasiado fino"
        ).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("el dibujo de la ficha llena la rejilla (no sale un cuadrado vacío)", () => {
    for (var id of Object.keys(CATEGORIES)) {
      var figuras = CATEGORIES[id];
      var alcance = 0;
      for (var i = 0; i < figuras.length; i++) {
        var pts = puntosDe(figuras[i]);
        for (var p = 0; p < pts.length; p++) {
          var lejos = Math.abs(pts[p]);
          if (lejos > alcance) alcance = lejos;
        }
      }
      // el fondo de la ficha llega a 30,5 de 32; el dibujo, a la mitad
      expect(alcance, id + ": la ficha se ha quedado vacía").toBeGreaterThan(CAT_SIZE * 0.5);
    }
  });
});
