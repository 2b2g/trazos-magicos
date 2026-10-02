/* Servicio de audio (FDD §19): voz + efectos.

   DOS PROVEEDORES DE VOZ, en este orden:
   1. **Audios pregrabados** (`voiceClips.ts`): voz buena e igual en
      todas las tabletas, empaquetada con el juego y offline.
   2. **Voz del sistema** (TTS Web Speech) como respaldo: si falta un
      clip o el navegador no deja sonar el audio, se locuta aquí.

   El niño nunca se queda sin voz: si no hay audios generados el juego
   se comporta exactamente como antes.

   Para sustituir el TTS por locución grabada basta con implementar
   `VoiceProvider` (ver `services/voiceTypes.ts`) y registrarlo aquí. */

import { VoiceProvider } from "./voiceTypes";
import { ClipVoiceProvider } from "./voiceClips";

export type { VoiceProvider };

/* ---------- proveedor Web Speech API (con guardas Android 5) ---------- */

class TtsProvider {
  private synth: any = null;
  private voice: any = null;
  private enabled = true;
  private slow = true; // voz pausada por defecto (para peques)

  constructor() {
    var s = (window as any).speechSynthesis;
    if (s) {
      this.synth = s;
      this.pickVoice();
      // En algunos WebViews las voces cargan tarde.
      var self = this;
      s.onvoiceschanged = function () {
        self.pickVoice();
      };
      setTimeout(function () {
        self.pickVoice();
      }, 600);
    }
  }

  /* Pistas de nombre para preferir voces "infantiles" si el sistema
     las trae (algunos Android/Chrome incluyen voz de niño). */
  private static CHILD_HINTS: string[] = ["niñ", "nino", "kid", "child", "junior", "infantil"];

  private pickVoice(): void {
    if (!this.synth) return;
    var voices = this.synth.getVoices ? this.synth.getVoices() : [];
    var best: any = null;
    var bestScore = -1;
    for (var i = 0; i < voices.length; i++) {
      var v = voices[i];
      var lang = (v.lang || "").toLowerCase();
      if (lang.indexOf("es") !== 0) continue;
      var name = (v.name || "").toLowerCase();
      var score = 1; // base: cualquier es-*
      if (lang.indexOf("es-es") === 0 || lang.indexOf("es_419") === 0 || lang.indexOf("es-419") === 0) score += 2;
      for (var h = 0; h < TtsProvider.CHILD_HINTS.length; h++) {
        if (name.indexOf(TtsProvider.CHILD_HINTS[h]) >= 0) {
          score += 4;
          break;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        best = v;
      }
    }
    this.voice = best;
  }

  get available(): boolean {
    return !!this.synth;
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on) this.cancel();
  }

  /** Ritmo pausado on/off (ajuste 🐢 de la puerta parental). */
  setSlow(on: boolean): void {
    this.slow = on;
  }

  speak(text: string): void {
    if (!this.enabled || !this.synth || !text) return;
    try {
      this.synth.cancel();
      var u = new (window as any).SpeechSynthesisUtterance(text);
      u.lang = this.voice ? this.voice.lang : "es-ES";
      if (this.voice) u.voice = this.voice;
      u.rate = this.slow ? 0.72 : 0.9; // pausado: los peques siguen la voz
      u.pitch = this.slow ? 1.3 : 1.15; // timbre agudo y cálido, "infantil"
      u.volume = 1;
      this.synth.speak(u);
    } catch (e) {
      /* sin TTS: el juego sigue funcionando (texto + iconos) */
    }
  }

  cancel(): void {
    try {
      if (this.synth) this.synth.cancel();
    } catch (e) {
      /* noop */
    }
  }
}

/* ---------- efectos: WebAudio con desbloqueo táctil + fallback ---------- */

class Sfx {
  private ctx: any = null;
  private enabled = true;

  private ensure(): any {
    if (!this.enabled) return null;
    if (!this.ctx) {
      var AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      try {
        this.ctx = new AC();
      } catch (e) {
        return null;
      }
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  unlock(): void {
    this.ensure();
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
  }

  private tone(freq: number, dur: number, type: string, when: number, gain: number): void {
    var ctx = this.ensure();
    if (!ctx) return;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    g.gain.setValueAtTime(gain, ctx.currentTime + when);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + when + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(ctx.currentTime + when);
    osc.stop(ctx.currentTime + when + dur + 0.02);
  }

  strokeDone(): void {
    this.tone(660, 0.12, "sine", 0, 0.18);
    this.tone(880, 0.14, "sine", 0.09, 0.16);
  }

  success(): void {
    var notes = [523.25, 659.25, 783.99, 1046.5];
    for (var i = 0; i < notes.length; i++) {
      this.tone(notes[i], 0.22, "triangle", i * 0.11, 0.2);
    }
  }

  retry(): void {
    this.tone(392, 0.16, "sine", 0, 0.14);
    this.tone(440, 0.2, "sine", 0.14, 0.14);
  }

  tap(): void {
    this.tone(520, 0.06, "sine", 0, 0.12);
  }

  unlockPrize(): void {
    var notes = [659.25, 783.99, 987.77, 1318.5, 1568];
    for (var i = 0; i < notes.length; i++) {
      this.tone(notes[i], 0.3, "triangle", i * 0.09, 0.18);
    }
  }
}

/* ---------- fachada única ---------- */

class TtsVoiceProvider implements VoiceProvider {
  private tts: TtsProvider;

  constructor(tts: TtsProvider) {
    this.tts = tts;
  }

  get available(): boolean {
    return this.tts.available;
  }

  speakAll(texts: string[]): void {
    if (!texts.length) return;
    // El TTS no tiene pausas: las frases se unen y el punto final de cada
    // una hace de respiro natural.
    this.tts.speak(texts.join(" "));
  }

  cancel(): void {
    this.tts.cancel();
  }

  setEnabled(on: boolean): void {
    this.tts.setEnabled(on);
  }

  setSlow(on: boolean): void {
    this.tts.setSlow(on);
  }
}

/**
 * Fachada única del audio del juego (FDD §19).
 *
 * - `say()` / `sayAll()` → instrucciones y ánimo por voz: clips buenos
 *   si existen, voz del sistema como respaldo.
 * - `sfx.*` → efectos procedurales WebAudio (sin ficheros: offline y sin
 *   descargas extra).
 */
export class AudioService {
  public tts = new TtsProvider();
  public clips = new ClipVoiceProvider();
  public sfx = new Sfx();
  private systemVoice = new TtsVoiceProvider(this.tts);
  private voiceOn = true;

  constructor() {
    var self = this;
    // si un clip no puede sonar, la locución continúa con el TTS
    this.clips.onFallback = function (texts) {
      if (self.voiceOn) self.systemVoice.speakAll(texts);
    };
  }

  /** ¿Qué voz está sonando? ("ElevenLabs · Sofia (214 audios)" o
      "voz del sistema"). Útil para ajustes y diagnóstico. */
  get voiceDescription(): string {
    return this.clips.description;
  }

  /** Una frase corta (ánimo, "¡Muy bien!"). */
  say(text: string): void {
    this.sayAll([text]);
  }

  /**
   * Varias frases seguidas, con pausas naturales entre ellas.
   * Se usan clips si TODAS existen; si no, la voz del sistema locuta
   * la locución completa (nunca mezcla clips y TTS en la misma frase).
   */
  sayAll(texts: string[]): void {
    if (!this.voiceOn || !texts.length) return;
    this.clips.cancel();
    this.systemVoice.cancel();
    if (this.clips.playAll(texts)) return;
    this.systemVoice.speakAll(texts);
  }

  stopVoice(): void {
    this.clips.cancel();
    this.systemVoice.cancel();
  }

  setVoiceEnabled(on: boolean): void {
    this.voiceOn = on;
    this.clips.setEnabled(on);
    this.systemVoice.setEnabled(on);
  }

  /** Voz pausada para peques (ajuste 🐢, activada por defecto):
      los clips se graban reposados y aquí se alargan un poco más. */
  setSlowVoice(on: boolean): void {
    this.clips.setSlow(on);
    this.systemVoice.setSlow(on);
  }

  setSfxEnabled(on: boolean): void {
    this.sfx.setEnabled(on);
  }

  /** Desbloqueo de audio en el primer toque (autoplay de Chrome). */
  unlock(): void {
    this.sfx.unlock();
    this.clips.unlock();
  }
}

export const audio = new AudioService();
