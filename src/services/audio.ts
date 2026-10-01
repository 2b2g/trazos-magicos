/* Servicio de audio (FDD §19): TTS configurable + efectos.
   El TTS es un proveedor intercambiable: mañana puede ser MP3
   grabado (keys = claves del catálogo PHRASES) sin tocar el juego. */

export interface VoiceProvider {
  speak(text: string): void;
  cancel(): void;
}

/* ---------- proveedor Web Speech API (con guardas Android 5) ---------- */

class TtsProvider implements VoiceProvider {
  private synth: any = null;
  private voice: any = null;
  private enabled = true;

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

  private pickVoice(): void {
    if (!this.synth) return;
    var voices = this.synth.getVoices ? this.synth.getVoices() : [];
    var best: any = null;
    for (var i = 0; i < voices.length; i++) {
      var lang = voices[i].lang || "";
      if (lang.toLowerCase().indexOf("es") === 0) {
        best = voices[i];
        if (lang.toLowerCase().indexOf("es-es") === 0 || lang.toLowerCase().indexOf("es_419") === 0) break;
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

  speak(text: string): void {
    if (!this.enabled || !this.synth || !text) return;
    try {
      this.synth.cancel();
      var u = new (window as any).SpeechSynthesisUtterance(text);
      u.lang = this.voice ? this.voice.lang : "es-ES";
      if (this.voice) u.voice = this.voice;
      u.rate = 0.92; // más lento para pequeños
      u.pitch = 1.12; // algo más agudo, amable
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

/**
 * Fachada única del audio del juego (FDD §19).
 *
 * - `say()`  → instrucciones y ánimo por voz (TTS es, configurable).
 * - `sfx.*`  → efectos procedurales WebAudio (sin ficheros: compatible
 *              offline y sin descargas extra).
 *
 * Para sustituir TTS por locución grabada basta con implementar
 * VoiceProvider y asignarlo a `audio.tts` — el resto del juego no cambia.
 */
export class AudioService {
  public tts = new TtsProvider();
  public sfx = new Sfx();

  /** Voz hablada (instrucciones, ánimo). Silencioso si voz está apagada. */
  say(text: string): void {
    this.tts.speak(text);
  }

  stopVoice(): void {
    this.tts.cancel();
  }

  setVoiceEnabled(on: boolean): void {
    this.tts.setEnabled(on);
  }

  setSfxEnabled(on: boolean): void {
    this.sfx.setEnabled(on);
  }
}

export const audio = new AudioService();
