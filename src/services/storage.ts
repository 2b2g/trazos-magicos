/* Persistencia local multi-perfil (localStorage). Sin servidor, sin
   cuentas, sin datos personales: solo nombre, avatar y progreso. */

const KEY_PROFILES = "tm.profiles.v1";
const KEY_CURRENT = "tm.currentProfile.v1";
const KEY_SETTINGS = "tm.settings.v1";

export interface ResourceProgress {
  bestScore: number; // 0..100
  stars: number; // 1..3
  attempts: number;
  completed: boolean;
}

export interface Profile {
  id: string;
  name: string;
  avatar: string; // emoji
  createdAt: number;
  progress: Record<string, ResourceProgress>;
}

export interface Settings {
  voice: boolean;
  sfx: boolean;
  voiceSlow: boolean; // 🐢 voz pausada + timbre agudo (para peques)
  toleranceBoost: boolean; // modo accesible: corredor más ancho
}

export const DEFAULT_SETTINGS: Settings = {
  voice: true,
  sfx: true,
  voiceSlow: true,
  toleranceBoost: false,
};

export const AVATARS: string[] = ["🦊", "🐼", "🐸", "🦁", "🐧", "🦄", "🐯", "🐨"];

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    return fallback;
  }
}

function store(): Storage | null {
  try {
    var s = window.localStorage;
    var probe = "tm.probe";
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch (e) {
    return null; // modo incógnito / storage bloqueado
  }
}

/**
 * Acceso a perfiles y progreso sobre localStorage.
 *
 * Garantías:
 * - Nunca lanza: si el almacenamiento está bloqueado o corrupto, el
 *   juego sigue funcionando en memoria.
 * - El progreso es monótono: bestScore y stars solo suben, `completed`
 *   nunca se revierte (FDD UX: sin castigo).
 */
export class ProfileStore {
  private storage: Storage | null;

  constructor() {
    this.storage = store();
  }

  /** Todos los perfiles guardados (lista vacía si no hay storage). */
  listProfiles(): Profile[] {
    if (!this.storage) return [];
    return safeParse<Profile[]>(this.storage.getItem(KEY_PROFILES), []);
  }

  private saveProfiles(profiles: Profile[]): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(KEY_PROFILES, JSON.stringify(profiles));
    } catch (e) {
      /* almacenamiento lleno: se ignora, el juego sigue */
    }
  }

  currentProfileId(): string | null {
    if (!this.storage) return null;
    return this.storage.getItem(KEY_CURRENT);
  }

  setCurrentProfile(id: string | null): void {
    if (!this.storage) return;
    if (id === null) this.storage.removeItem(KEY_CURRENT);
    else this.storage.setItem(KEY_CURRENT, id);
  }

  getProfile(id: string): Profile | null {
    var list = this.listProfiles();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  createProfile(name: string, avatar: string): Profile {
    var profile: Profile = {
      id: "p" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36),
      name: name || "Amigo",
      avatar: avatar || AVATARS[0],
      createdAt: Date.now(),
      progress: {},
    };
    var list = this.listProfiles();
    list.push(profile);
    this.saveProfiles(list);
    return profile;
  }

  deleteProfile(id: string): void {
    var list = this.listProfiles();
    var out: Profile[] = [];
    for (var i = 0; i < list.length; i++) if (list[i].id !== id) out.push(list[i]);
    this.saveProfiles(out);
    if (this.currentProfileId() === id) this.setCurrentProfile(null);
  }

  /**
   * Registra el resultado de una actividad en el perfil actual.
   * bestScore/stars toman el máximo histórico; attempts acumula;
   * `completed` es pegajoso (un fallo posterior no lo revierte).
   */
  recordAttempt(resourceId: string, score: number, stars: number, passed: boolean): void {
    var id = this.currentProfileId();
    if (!id) return;
    var list = this.listProfiles();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id !== id) continue;
      var p = list[i];
      var prev = p.progress[resourceId];
      p.progress[resourceId] = {
        bestScore: Math.max(prev ? prev.bestScore : 0, score),
        stars: Math.max(prev ? prev.stars : 0, stars),
        attempts: (prev ? prev.attempts : 0) + 1,
        completed: (prev && prev.completed) || passed,
      };
      this.saveProfiles(list);
      return;
    }
  }

  /** Progreso del perfil actual en un recurso (null si aún no jugó). */
  progressOf(resourceId: string): ResourceProgress | null {
    var id = this.currentProfileId();
    if (!id) return null;
    var p = this.getProfile(id);
    return p ? p.progress[resourceId] || null : null;
  }

  /** Estrellas totales del perfil actual. */
  totalStars(): number {
    var id = this.currentProfileId();
    if (!id) return 0;
    var p = this.getProfile(id);
    if (!p) return 0;
    var total = 0;
    for (var k in p.progress) {
      if (p.progress.hasOwnProperty(k)) total += p.progress[k].stars;
    }
    return total;
  }
}

/** Carga ajustes globales con defaults seguros si faltan o están corruptos. */
export function loadSettings(): Settings {
  var s = store();
  if (!s) return { ...DEFAULT_SETTINGS };
  return { ...DEFAULT_SETTINGS, ...safeParse<Partial<Settings>>(s.getItem(KEY_SETTINGS), {}) };
}

/** Persiste ajustes globales (no-op silencioso sin storage). */
export function saveSettings(s: Settings): void {
  var st = store();
  if (!st) return;
  try {
    st.setItem(KEY_SETTINGS, JSON.stringify(s));
  } catch (e) {
    /* noop */
  }
}

export const profiles = new ProfileStore();
