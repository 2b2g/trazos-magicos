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
import { VoiceSequencer } from "./voiceSequencer";
import { FirstGestureGate, GestureTarget } from "./firstGesture";

export type { VoiceProvider };

/** Lo que `AudioService` espera del proveedor de clips (inyectable en
    tests sin DOM). `ClipVoiceProvider` lo cumple tal cual. */
export interface ClipSpeaker extends VoiceProvider {
  /** Descripción humana del catálogo (ajustes y diagnóstico). */
  readonly description: string;
  /** ¿Hay audio grabado para esta frase exacta? */
  has(text: string): boolean;
  /** Reproduce la locución si TODAS sus frases tienen clip. */
  playAll(texts: string[], onDone?: () => void): boolean;
  /** Salvavidas cuando un clip no puede sonar (autoplay, fichero roto). */
  onFallback: ((texts: string[], onDone?: () => void) => void) | null;
  /** Desbloqueo del autoplay en el primer toque del niño. */
  unlock(): void;
}

/* ---------- proveedor Web Speech API (con guardas Android 5) ---------- */

class TtsProvider {
  private synth: any = null;
  private voice: any = null;
  private enabled = true;
  private slow = true; // voz pausada por defecto (para peques)

  constructor() {
    var w: any = typeof window === "undefined" ? {} : window;
    var s = w.speechSynthesis;
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

  speak(text: string, onDone?: () => void): void {
    var done = onDone || null;
    if (!this.enabled || !this.synth || !text) {
      if (done) done();
      return;
    }
    try {
      this.synth.cancel();
      var u = new (window as any).SpeechSynthesisUtterance(text);
      u.lang = this.voice ? this.voice.lang : "es-ES";
      if (this.voice) u.voice = this.voice;
      u.rate = this.slow ? 0.72 : 0.9; // pausado: los peques siguen la voz
      u.pitch = this.slow ? 1.3 : 1.15; // timbre agudo y cálido, "infantil"
      u.volume = 1;
      // aviso de final: es lo que permite encadenar locuciones sin
      // temporizadores a ojo (y sin cortar la frase anterior)
      if (done) {
        var once = function (): void {
          var d = done;
          done = null;
          if (d) d();
        };
        u.onend = once;
        u.onerror = once;
      }
      this.synth.speak(u);
    } catch (e) {
      // sin TTS: el juego sigue funcionando (texto + iconos)
      if (done) done();
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

/** Devolución vacía: "nada que cancelar, nada que esperar". */
function noop(): void {
  /* noop */
}

/* ---------- efectos: WebAudio con desbloqueo táctil + fallback ---------- */

class Sfx {
  private ctx: any = null;
  private enabled = true;

  private ensure(): any {
    if (!this.enabled) return null;
    if (!this.ctx) {
      // sin `window` (tests) no hay contexto: se sigue sin efectos
      var w: any = typeof window === "undefined" ? {} : window;
      var AC = w.AudioContext || w.webkitAudioContext;
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

  speakAll(texts: string[], onDone?: () => void): void {
    if (!texts.length) {
      if (onDone) onDone();
      return;
    }
    // El TTS no tiene pausas: las frases se unen y el punto final de cada
    // una hace de respiro natural.
    this.tts.speak(texts.join(" "), onDone);
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
 *   si existen, voz del sistema como respaldo. **Nunca se cortan**: la
 *   locución que suena termina siempre y las nuevas esperan su turno
 *   (`services/voiceSequencer.ts`). `sayAll(texts, onDone)` permite
 *   encadenar pantallas sin temporizadores.
 * - `stopVoice()` → la única interrupción legítima (salir de pantalla o
 *   silenciar).
 * - `sayOnFirstGesture()` → saludo que espera al primer toque: es la
 *   única forma de que el primer MP3 de la sesión suene con la voz del
 *   juego y no con la del sistema.
 * - `sfx.*` → efectos procedurales WebAudio (sin ficheros: offline y sin
 *   descargas extra).
 */
export class AudioService {
  public tts = new TtsProvider();
  public clips: ClipSpeaker;
  public sfx = new Sfx();
  private systemVoice: VoiceProvider;
  private voiceOn = true;
  private sequencer: VoiceSequencer;
  /** Espera del primer toque del niño (`services/firstGesture.ts`). */
  private gate: FirstGestureGate;
  /** El niño ya tocó alguna vez: el audio está desbloqueado. */
  private unlocked = false;
  /** Cancelación de la espera viva, si la hay. */
  private pendingGesture: (() => void) | null = null;

  /**
   * @param providers proveedores alternativos (tests sin navegador) y
   *   `gestureTarget` (doble de `window` en los tests del saludo).
   */
  constructor(providers?: {
    clips?: ClipSpeaker;
    system?: VoiceProvider;
    gestureTarget?: GestureTarget | null;
  }) {
    this.clips = (providers && providers.clips) || new ClipVoiceProvider();
    this.systemVoice = (providers && providers.system) || new TtsVoiceProvider(this.tts);
    this.gate = new FirstGestureGate(
      (providers && providers.gestureTarget !== undefined
        ? providers.gestureTarget
        : typeof window === "undefined"
          ? null
          : (window as unknown as GestureTarget))
    );

    var self = this;
    // si un clip no puede sonar, la locución continúa con el TTS
    this.clips.onFallback = function (texts, onDone) {
      if (self.voiceOn) self.systemVoice.speakAll(texts, onDone);
      else if (onDone) onDone();
    };

    this.sequencer = new VoiceSequencer(function (texts, done) {
      // clips si TODAS las frases tienen audio; si no, TTS para la locución
      // completa (nunca se mezclan a medias)
      if (self.clips.playAll(texts, done)) return;
      self.systemVoice.speakAll(texts, done);
    });
  }

  /** ¿Qué voz está sonando? ("ElevenLabs · Sofia (214 audios)" o
      "voz del sistema"). Útil para ajustes y diagnóstico. */
  get voiceDescription(): string {
    return this.clips.description;
  }

  /** Una frase corta (ánimo, "¡Muy bien!"). */
  say(text: string, onDone?: () => void): void {
    this.sayAll([text], onDone);
  }

  /**
   * Varias frases seguidas, con pausas naturales entre ellas.
   * Se usan clips si TODAS existen; si no, la voz del sistema locuta
   * la locución completa (nunca mezcla clips y TTS en la misma frase).
   *
   * Si ya hay voz sonando, esta locución **espera a que termine** en
   * vez de cortarla: los peques no entienden una frase a medias.
   *
   * @param onDone terminó de sonar (o no pudo sonar), nunca interrumpida.
   */
  sayAll(texts: string[], onDone?: () => void): void {
    if (!this.voiceOn || !texts.length) {
      if (onDone) onDone();
      return;
    }
    this.sequencer.enqueue(texts, onDone);
  }

  stopVoice(): void {
    this.sequencer.cancel();
    this.clips.cancel();
    this.systemVoice.cancel();
  }

  setVoiceEnabled(on: boolean): void {
    this.voiceOn = on;
    this.clips.setEnabled(on);
    this.systemVoice.setEnabled(on);
    if (!on) {
      this.sequencer.cancel();
      // un saludo en espera no suena con la voz silenciada
      this.pendingGesture = null;
      this.gate.cancel();
    }
  }

  /** ¿El niño ya ha tocado la pantalla? (audio desbloqueado). */
  get hasGesture(): boolean {
    return this.unlocked;
  }

  /**
   * ¿Está la voz activada? (los padres pueden silenciarla). Lo consulta
   * la recompensa para saber si puede pegarse al ritmo de la locución o
   * si tiene que mostrarla ella misma (`activity.ts`).
   */
  get voiceEnabled(): boolean {
    return this.voiceOn;
  }

  /**
   * Locución que **espera al primer toque del niño** (política de
   * autoplay). Pedirla antes de tiempo no sirve de nada: el navegador
   * rechaza el MP3 y la frase cae a la voz del sistema —la primera
   * locución de la sesión sonaba con otra voz que la del juego—.
   *
   * Al primer gesto se desbloquea el audio y la frase se dice en el
   * mismo gesto (con el clip de Paulina). Si el niño ya había tocado
   * antes, se dice al instante.
   *
   * @param onGesture chance que la pantalla hace al niño: si devuelve
   *   `false` (p. ej. porque ese toque ya elegía jugador), el saludo se
   *   omite; si no, la frase se dice.
   * @returns cancelar la espera (la pantalla cambió antes del gesto).
   */
  sayOnFirstGesture(
    text: string,
    onGesture?: (ev?: any) => boolean,
    onDone?: () => void
  ): () => void {
    var self = this;
    if (!this.voiceOn) {
      if (onDone) onDone();
      return noop;
    }
    if (this.unlocked) {
      this.say(text, onDone);
      return noop;
    }
    var cancel: () => void = function (): void {
      if (self.pendingGesture !== cancel) return; // otra espera manda
      self.pendingGesture = null;
      self.gate.cancel();
    };
    this.pendingGesture = cancel;
    this.gate.arm(function (ev?: any): void {
      if (self.pendingGesture !== cancel) return;
      self.pendingGesture = null;
      self.unlock();
      // ¿el niño ya está tocando algo que hace algo? entonces no saluda
      if (onGesture && onGesture(ev) === false) return;
      self.say(text, onDone);
    });
    return cancel;
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
    this.unlocked = true;
    this.sfx.unlock();
    this.clips.unlock();
  }
}

export const audio = new AudioService();
