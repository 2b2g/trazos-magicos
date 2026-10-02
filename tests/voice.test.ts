import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { voiceId, slugify } from "../src/services/voiceId";
import { collectVoiceLines } from "../src/services/voiceLines";
import { VOICE_MANIFEST } from "../src/content/voiceManifest";
import { PHRASES } from "../src/content/phrases";

/* La voz pregrabada es un contrato entre tres piezas: el catálogo de
   frases (qué dice el juego), el manifiesto (qué audios existen) y los
   MP3 en `public/voice/`. Si alguna se desincroniza, el niño oye la
   voz robótica del sistema sin que nadie se entere: estos tests lo
   detectan antes. */

function read(path: string): string {
  return readFileSync(new URL("../" + path, import.meta.url), "utf8");
}

function voiceFiles(): string[] {
  const dir = new URL("../public/voice/", import.meta.url);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".mp3"));
}

describe("ids de audio", () => {
  it("son deterministas y estables entre ejecuciones", () => {
    const a = voiceId("¡Muy bien!");
    expect(a).toBe(voiceId("¡Muy bien!"));
    expect(a).toMatch(/^muy-bien-[0-9a-f]{8}$/);
  });

  it("distinguen frases parecidas y son seguros como nombre de fichero", () => {
    expect(voiceId("uno, dos")).not.toBe(voiceId("uno, dos, tres"));
    const id = voiceId('¿Cuántas estrellas hay? ¡Sube "arriba" / abajo!');
    expect(id).toMatch(/^[a-z0-9-]+-[0-9a-f]{8}$/);
    expect(slugify("ÁÉÍÓÚ Ñ¡¿!")).toBe("aeiou-n");
  });

  it("recortan slugs largos pero mantienen el hash único", () => {
    const long = voiceId(new Array(40).join("palabra "));
    expect(long.length).toBeLessThan(60);
    expect(long).toMatch(/-[0-9a-f]{8}$/);
  });
});

describe("catálogo de frases habladas", () => {
  it("incluye el catálogo fijo, el contenido y las composiciones", () => {
    const lines = collectVoiceLines();
    expect(lines.length).toBeGreaterThan(200);
    expect(lines).toContain(PHRASES.chooseProfile);
    expect(lines).toContain("A de Avión");
    expect(lines).toContain("3 estrellas");
    expect(lines).toContain("uno, dos, tres");
    expect(lines).toContain("La letra A");
  });

  it("no repite frases y no deja huecos raros", () => {
    const lines = collectVoiceLines();
    expect(new Set(lines).size).toBe(lines.length);
    for (const l of lines) {
      expect(l.trim()).toBe(l);
      expect(l.length).toBeGreaterThan(1);
      expect(l.indexOf("  ")).toBe(-1);
    }
  });
});

describe("manifiesto de audios generados", () => {
  it("solo anuncia clips que existen en public/voice", () => {
    const files = new Set(voiceFiles().map((f) => f.replace(/\.mp3$/, "")));
    for (const id of VOICE_MANIFEST.ids) {
      expect(files.has(id)).toBe(true);
    }
  });

  it("no deja frases sin audio: el juego suena igual en todas las tabletas", () => {
    const announced = new Set(VOICE_MANIFEST.ids);
    const missing = collectVoiceLines().filter((l) => !announced.has(voiceId(l)));
    expect(missing).toEqual([]);
  });

  it("no deja audios huérfanos (frases que ya no existen)", () => {
    const ids = new Set(collectVoiceLines().map((l) => voiceId(l)));
    const orphans = VOICE_MANIFEST.ids.filter((id) => !ids.has(id));
    expect(orphans).toEqual([]);
  });

  it("no hay frases habladas escritas a mano fuera del catálogo", () => {
    // Una frase literal en una pantalla no tiene audio: caería al TTS
    // robótico sin que nadie lo note. Debe salir de PHRASES o del contenido.
    const screens = [
      "src/screens/map.ts",
      "src/screens/activity.ts",
      "src/screens/profiles.ts",
      "src/screens/settings.ts",
      "src/main.ts",
    ];
    const lines = collectVoiceLines();
    const literals: string[] = [];
    for (const file of screens) {
      const source = read(file);
      const re = /\.(?:say|speak)\(\s*"([^"]+)"/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(source))) literals.push(m[1]);
    }
    expect(literals.filter((t) => lines.indexOf(t) === -1)).toEqual([]);
  });

  it("el proveedor de clips acepta frases con audio y rechaza el resto", async () => {
    const { ClipVoiceProvider } = await import("../src/services/voiceClips");
    const provider = new ClipVoiceProvider();
    const lines = collectVoiceLines();
    expect(provider.available).toBe(true);
    expect(provider.has(lines[0])).toBe(true);
    // sin audio no se hace cargo: la locución sigue por TTS
    expect(provider.playAll(["frase que no existe en el catálogo"])).toBe(false);
    expect(provider.playAll([lines[0], "frase inventada"])).toBe(false);
  });

  it("el manifiesto está generado por la herramienta, no a mano", () => {
    const source = read("src/content/voiceManifest.ts");
    expect(source).toContain("GENERADO por");
    expect(source).toContain("voiceId(texto)");
  });
});
