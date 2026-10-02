import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { BRAND } from "../src/content/brand";

/* El renombrado de producto toca muchos ficheros: estos tests
   impiden que se quede a medias o se desincronice. */

function read(path: string): string {
  return readFileSync(new URL("../" + path, import.meta.url), "utf8");
}

describe("identidad de Garabati", () => {
  it("el manifest PWA usa el nombre de marca", () => {
    var manifest = JSON.parse(read("public/manifest.webmanifest"));
    expect(manifest.name).toBe(BRAND.name);
    expect(manifest.short_name).toBe(BRAND.name);
  });

  it("el título del documento y la descripción usan la marca", () => {
    var html = read("index.html");
    expect(html).toContain("<title>" + BRAND.name + "</title>");
    expect(html).toContain(BRAND.name + " —");
  });

  it("el paquete y la imagen Docker se llaman garabati", () => {
    var pkg = JSON.parse(read("package.json"));
    expect(pkg.name).toBe(BRAND.name.toLowerCase());
    expect(pkg.description).toContain(BRAND.name);
    expect(read("docker-compose.yml")).toContain("image: garabati:latest");
  });

  it("la caché del service worker lleva el nombre nuevo", () => {
    expect(read("public/sw.js")).toContain("garabati-v2");
  });

  it("no queda ninguna mención al nombre antiguo en la app", () => {
    var files = [
      "index.html",
      "public/manifest.webmanifest",
      "public/sw.js",
      "src/main.ts",
      "src/screens/profiles.ts",
      "src/screens/map.ts",
      "src/screens/activity.ts",
      "src/screens/settings.ts",
    ];
    for (var i = 0; i < files.length; i++) {
      var text = read(files[i]);
      expect(text.indexOf("Trazos Mágicos")).toBe(-1);
      expect(text.indexOf("trazos-magicos")).toBe(-1);
    }
  });
});
