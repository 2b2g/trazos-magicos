import { describe, it, expect, beforeEach } from "vitest";

/* Stub de localStorage ANTES de importar el módulo (el store se
   construye al cargar el módulo). */
function makeFakeStorage(): Storage {
  var data: Record<string, string> = {};
  return {
    getItem: function (k: string) {
      return data.hasOwnProperty(k) ? data[k] : null;
    },
    setItem: function (k: string, v: string) {
      data[k] = String(v);
    },
    removeItem: function (k: string) {
      delete data[k];
    },
    clear: function () {
      data = {};
    },
    key: function (i: number) {
      return Object.keys(data)[i] || null;
    },
    get length() {
      return Object.keys(data).length;
    },
  } as Storage;
}

var fake = makeFakeStorage();
(globalThis as any).window = (globalThis as any).window || {};
(globalThis as any).window.localStorage = fake;

describe("storage", () => {
  beforeEach(() => {
    fake.clear();
  });

  it("crea, lista, obtiene y borra perfiles", async () => {
    var mod = await import("../src/services/storage");
    var store = new mod.ProfileStore();
    var p1 = store.createProfile("Leo", "🦊");
    var p2 = store.createProfile("Mia", "🐼");
    expect(store.listProfiles().length).toBe(2);
    expect(store.getProfile(p1.id)!.name).toBe("Leo");
    store.deleteProfile(p1.id);
    expect(store.listProfiles().length).toBe(1);
    expect(store.getProfile(p1.id)).toBeNull();
    expect(store.getProfile(p2.id)!.avatar).toBe("🐼");
  });

  it("el progreso es monótono: nunca baja, los intentos suman", async () => {
    var mod = await import("../src/services/storage");
    var store = new mod.ProfileStore();
    var p = store.createProfile("Leo", "🦊");
    store.setCurrentProfile(p.id);

    store.recordAttempt("line-vertical", 60, 1, true);
    store.recordAttempt("line-vertical", 40, 1, false); // peor intento no resta
    store.recordAttempt("line-vertical", 95, 3, true);

    var pr = store.progressOf("line-vertical")!;
    expect(pr.bestScore).toBe(95);
    expect(pr.stars).toBe(3);
    expect(pr.attempts).toBe(3);
    expect(pr.completed).toBe(true);
  });

  it("completed queda pegado aunque un intento posterior falle", async () => {
    var mod = await import("../src/services/storage");
    var store = new mod.ProfileStore();
    var p = store.createProfile("Ana", "🐼");
    store.setCurrentProfile(p.id);
    store.recordAttempt("r1", 90, 3, true);
    store.recordAttempt("r1", 10, 1, false);
    expect(store.progressOf("r1")!.completed).toBe(true);
  });

  it("totalStars suma las estrellas de todos los recursos", async () => {
    var mod = await import("../src/services/storage");
    var store = new mod.ProfileStore();
    var p = store.createProfile("Ana", "🐼");
    store.setCurrentProfile(p.id);
    store.recordAttempt("a", 90, 3, true);
    store.recordAttempt("b", 80, 2, true);
    expect(store.totalStars()).toBe(5);
  });

  it("JSON corrupto en localStorage no rompe: devuelve lista vacía", async () => {
    var mod = await import("../src/services/storage");
    fake.setItem("tm.profiles.v1", "{esto no es json");
    var store = new mod.ProfileStore();
    expect(store.listProfiles()).toEqual([]);
    // y sigue siendo usable
    var p = store.createProfile("Nuevo", "🦁");
    expect(store.listProfiles().length).toBe(1);
    expect(store.getProfile(p.id)!.name).toBe("Nuevo");
  });

  it("ajustes: defaults sanos y merge de parciales", async () => {
    var mod = await import("../src/services/storage");
    var s = mod.loadSettings();
    expect(s.voice).toBe(true);
    expect(s.sfx).toBe(true);
    expect(s.voiceSlow).toBe(true); // voz pausada por defecto (peques)
    expect(s.toleranceBoost).toBe(false);
    mod.saveSettings({ voice: false, sfx: false, voiceSlow: true, toleranceBoost: true });
    var s2 = mod.loadSettings();
    expect(s2.voice).toBe(false);
    expect(s2.toleranceBoost).toBe(true);
    // ajustes antiguos guardados sin voiceSlow: el default pausado se conserva
    fake.setItem("tm.settings.v1", JSON.stringify({ voice: true, sfx: true, toleranceBoost: false }));
    var s3 = mod.loadSettings();
    expect(s3.voiceSlow).toBe(true);
  });

  it("sin localStorage disponible el juego sigue (sin persistir)", async () => {
    var mod = await import("../src/services/storage");
    var broken = {
      getItem: function () {
        throw new Error("blocked");
      },
      setItem: function () {
        throw new Error("blocked");
      },
      removeItem: function () {
        throw new Error("blocked");
      },
    };
    (globalThis as any).window.localStorage = broken;
    var store = new mod.ProfileStore();
    expect(store.listProfiles()).toEqual([]);
    expect(store.createProfile("X", "🦊")).toBeTruthy();
    (globalThis as any).window.localStorage = fake; // restaurar
  });
});
