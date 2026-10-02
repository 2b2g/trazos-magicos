import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { ICONS, ICON_NAMES, hasIcon } from "../src/ui/icons";
import { ARTWORK, hasArt } from "../src/ui/artwork";

/* La iconografía del juego obedece dos reglas que este archivo fija:

   1. **El chrome no depende de la fuente del dispositivo.** Botones,
      píldoras y HUD usan SVG (`ui/icons.ts`); nada de emoji, porque en
      Android 5 (Unicode 6) y Safari 9 (2015) los emoji modernos salen
      como cuadro vacío y el mismo botón se ve distinto en cada tableta.
   2. **Ningún emoji que falte en los objetivos antiguos queda sin
      ilustración.** Los emojis de contenido que son de Unicode 8.0 o
      posterior (bloque U+1F900 en adelante) tienen que estar en
      `ui/artwork.ts`; si alguien añade uno nuevo sin arte, el test
      falla en vez de dejar un cuadrado vacío en la tableta del niño. */

const MODERNO_MIN = 0x1f900;
const MODERNO_MAX = 0x1faff;

function fuentesSrc(): Array<{ file: string; text: string }> {
  var out: Array<{ file: string; text: string }> = [];
  var stack = ["src"];
  while (stack.length) {
    var dir = stack.pop() as string;
    var entradas: string[];
    try {
      entradas = readdirSync(dir);
    } catch (e) {
      continue;
    }
    for (var i = 0; i < entradas.length; i++) {
      var ruta = dir + "/" + entradas[i];
      var esDir = false;
      try {
        esDir = statSync(ruta).isDirectory();
      } catch (e) {
        continue;
      }
      if (esDir) {
        stack.push(ruta);
      } else if (entradas[i].indexOf(".ts") > -1) {
        out.push({ file: ruta, text: readFileSync(ruta, "utf8") });
      }
    }
  }
  return out;
}

/** Emoji del bloque "moderno" (U+1F900–U+1FAFF, Emoji 8.0+/2016) que
    salen en el código. Se recorre por puntos de código: son pares
    suplentes y `charAt` los parte por la mitad. */
function emojiDe(text: string): string[] {
  var out: string[] = [];
  for (var i = 0; i < text.length; i++) {
    var cp = text.codePointAt(i) as number;
    if (cp < MODERNO_MIN || cp > MODERNO_MAX) continue;
    out.push(String.fromCodePoint(cp));
    if (cp > 0xffff) i++; // salta el suplente bajo
  }
  return out;
}

describe("iconos del chrome (ui/icons.ts)", () => {
  it("cada icono tiene al menos una figura con geometría", () => {
    for (var nombre of Object.keys(ICONS)) {
      var figuras = ICONS[nombre];
      expect(figuras.length, nombre).toBeGreaterThan(0);
      for (var i = 0; i < figuras.length; i++) {
        var f = figuras[i];
        if (f.t === "path") expect(typeof f.d, nombre).toBe("string");
        else expect(typeof f.r === "number" || typeof f.w === "number", nombre).toBe(true);
      }
    }
  });

  it("ICON_NAMES coincide con las claves (nada de iconos muertos)", () => {
    var claves = Object.keys(ICONS).sort();
    expect(ICON_NAMES.slice().sort()).toEqual(claves);
  });

  it("trae los iconos que la interfaz necesita de verdad", () => {
    // si alguien renombra un icono, la pantalla que lo usa se queda
    // sin dibujo: esta lista lo delata
    for (var necesario of [
      "home", "gear", "arrowLeft", "arrowRight", "refresh", "plus", "check",
      "soundOn", "soundOff", "starFilled", "sparkles", "lock", "sleep",
      "key", "slow", "mic", "grown", "heart", "music", "trash",
    ]) {
      expect(hasIcon(necesario), necesario).toBe(true);
    }
  });

  it("no quedan emoji en los botones: la lista de marcas del chrome es SVG", () => {
    var fuentes = fuentesSrc();
    var Prohibition = 0;
    for (var i = 0; i < fuentes.length; i++) {
      var lineas = fuentes[i].text.split("\n");
      for (var l = 0; l < lineas.length; l++) {
        var linea = lineas[l];
        // `btn__emoji` era el sitio donde vivía el emoji del botón
        if (linea.indexOf("btn__emoji") >= 0 && linea.indexOf("text:") >= 0) {
          expect(linea, fuentes[i].file + ":" + (l + 1)).toBe("sin emoji en btn__emoji");
        }
        if (linea.indexOf('class: "pill__icon", text:') >= 0) {
          expect(linea, fuentes[i].file + ":" + (l + 1)).toBe("sin emoji en pill__icon");
        }
      }
    }
    expect(Prohibition).toBe(0);
  });
});

describe("arte de contenido (ui/artwork.ts)", () => {
  it("cada ilustración tiene caja y rutas con relleno", () => {
    for (var emoji of Object.keys(ARTWORK)) {
      var a = ARTWORK[emoji];
      expect(a.viewBox, emoji).toMatch(/^0 0 \d+ \d+$/);
      expect(a.paths.length, emoji).toBeGreaterThan(0);
      for (var i = 0; i < a.paths.length; i++) {
        expect(a.paths[i].fill, emoji).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(a.paths[i].d.length, emoji).toBeGreaterThan(4);
      }
    }
  });

  /* Este es el test que habría cazado el bug de la tabla de arte.
     Un `d` mal formado **no da error**: el navegador dibuja lo que
     puede y descarta el resto en silencio, así que los animales salían
     como trozos sueltos sin que nada fallara. Los dos fallos eran:
       · los flags de arco (`A rx ry rot laf sf x y`) escritos como
         `0.0`: el parser los lee como un único carácter `0`/`1`, así que
         `0.0` es un token inválido y **descarta la ruta entera**;
       `0.0` es un token inválido y **descarta la ruta entera**;
       · números pegados sin separador (`17.6` + `6.0` → `17.66`): la
         figura se deforma o se aplasta.
     Aquí se comprueba la geometría en sí, sin necesidad de un navegador. */
  it("la geometría no está corrupta: sin flags de arco con decimales", () => {
    for (var emoji of Object.keys(ARTWORK)) {
      var rutas = ARTWORK[emoji].paths;
      for (var i = 0; i < rutas.length; i++) {
        var d = rutas[i].d;
        // todo comando de arco: rx ry rot (laf) (sf) x y
        var arcos = d.match(/[Aa][^AaZz]*/g) || [];
        for (var a = 0; a < arcos.length; a++) {
          var args = arcos[a].slice(1).trim().split(/[\s,]+/).filter(Boolean);
          if (args.length !== 7) continue; // arco incompleto, no es de 7
          var laf = args[3];
          var sf = args[4];
          expect(laf, emoji + " arco " + a + " large-arc-flag").toMatch(/^[01]$/);
          expect(sf, emoji + " arco " + a + " sweep-flag").toMatch(/^[01]$/);
        }
      }
    }
  });

  it("los números de la geometría van separados (no se funden al redondear)", () => {
    for (var emoji of Object.keys(ARTWORK)) {
      var rutas = ARTWORK[emoji].paths;
      for (var i = 0; i < rutas.length; i++) {
        var d = rutas[i].d;
        // tras un número en decimal no puede venir otro dígito: sería un
        // número distinto del que se quiso (`17.66` en vez de `17.6 6.0`)
        var pegados = d.match(/\d\.\d+\d/g) || [];
        expect(
          pegados,
          emoji + ": números pegados sin separador (" + pegados.join(", ") + ")"
        ).toHaveLength(0);
      }
    }
  });

  it("las ilustraciones no están aplastadas: la figura se extiende", () => {
    /* Una figura sana llega cerca del borde de su caja. Con los números
       fundidos al redondear, las coordenadas se encogían y los animales
       salían como una franja de 2–3 px de alto en el centro: por eso el
       umbral es la mitad de la caja y no un porcentaje exacto, que
       dependería de cada dibujo (el panda de Fluent, por ejemplo, solo
       ocupa 22 de 32 porque tiene la cabeza más ancha que el cuerpo). */
    for (var emoji of Object.keys(ARTWORK)) {
      var vb = ARTWORK[emoji].viewBox.split(/\s+/).map(Number);
      var caja = vb[2];
      var alcance = 0;
      var rutas = ARTWORK[emoji].paths;
      for (var i = 0; i < rutas.length; i++) {
        var numeros = (rutas[i].d.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
        for (var n = 0; n < numeros.length; n++) {
          // distancia al origen: un punto (x,y) está a hypot(x,y)
          if (Math.abs(numeros[n]) > alcance) alcance = Math.abs(numeros[n]);
        }
      }
      expect(
        alcance,
        emoji + ": la figura no llega ni a la mitad de la caja (se ha aplastado)"
      ).toBeGreaterThan(caja * 0.5);
    }
  });

  it("cubre los emojis que en Android 5 saldrían como cuadro vacío", () => {
    var fuentes = fuentesSrc();
    var modernas: Record<string, string[]> = {};
    for (var i = 0; i < fuentes.length; i++) {
      var emojis = emojiDe(fuentes[i].text);
      for (var e = 0; e < emojis.length; e++) {
        if (!modernas[emojis[e]]) modernas[emojis[e]] = [];
        modernas[emojis[e]].push(fuentes[i].file);
      }
    }
    var encontrados = Object.keys(modernas);
    expect(encontrados.length, "emoji modernos en src/").toBeGreaterThan(0);
    for (var m = 0; m < encontrados.length; m++) {
      expect(
        hasArt(encontrados[m]),
        "sin ilustración: " + encontrados[m] + " en " + modernas[encontrados[m]].join(", ")
      ).toBe(true);
    }
  });
});