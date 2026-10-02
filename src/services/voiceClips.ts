/* Proveedor de voz con AUDIOS PREGRABADOS.
   (Arquitectura del FDD §19: el TTS es sustituible sin tocar el juego.)

   Por qué: la voz del sistema (Web Speech) suena robótica y cambia
   según la tableta del niño —en Android 5 de gama baja es penosa—.
   Con clips grabados la voz es la misma, buena y cálida en todos los
   dispositivos, y sigue sonando **sin conexión** porque los MP3 viajan
   con el juego (`public/voice/`).

   Cómo: cada frase tiene un id determinista (`services/voiceId.ts`);
   si TODAS las frases de una locución tienen clip, se reproducen en
   cola con pausas naturales; si falta una sola, se cae al TTS para esa
   locución (nunca se mezcla a medias). */

import { VOICE_MANIFEST, VoiceManifest } from "../content/voiceManifest";
import { voiceId } from "./voiceId";
import { VoiceProvider } from "./voiceTypes";

export class ClipVoiceProvider implements VoiceProvider {
  /** Carpeta de los clips, relativa al `index.html`. */
  private base = "./voice/";
  private manifest: VoiceManifest = VOICE_MANIFEST;
  private index: Record<string, boolean> = {};
  private audio: HTMLAudioElement | null = null;
  private queue: string[] = [];
  private enabled = true;
  private rate = 1;
  private started = false;

  /** Si un clip no puede sonar (autoplay bloqueado, fichero roto),
      el servicio de audio reintenta estas frases con TTS. */
  public onFallback: ((texts: string[]) => void) | null = null;

  constructor() {
    for (var i = 0; i < this.manifest.ids.length; i++) {
      this.index[this.manifest.ids[i]] = true;
    }
  }

  get available(): boolean {
    return this.manifest.ids.length > 0;
  }

  /** Descripción humana del catálogo cargado (para ajustes y logs). */
  get description(): string {
    return this.available
      ? this.manifest.provider + " · " + this.manifest.voice + " (" + this.manifest.ids.length + " audios)"
      : "voz del sistema";
  }

  /** ¿Hay audio grabado para esta frase exacta? */
  has(text: string): boolean {
    return this.index[voiceId(text)] === true;
  }

  /**
   * Reproduce una locución completa si TODAS sus frases tienen clip.
   * @returns `true` si se hizo cargo (el llamante no debe usar el TTS).
   */
  playAll(texts: string[]): boolean {
    if (!this.enabled || !this.available || !texts.length) return false;
    for (var i = 0; i < texts.length; i++) {
      if (!this.has(texts[i])) return false;
    }
    this.cancel();
    this.queue = texts.slice();
    this.next();
    return true;
  }

  speakAll(texts: string[]): void {
    if (!this.playAll(texts)) {
      if (this.onFallback) this.onFallback(texts);
    }
  }

  private next(): void {
    const text = this.queue.shift();
    if (text === undefined) return;

    var a = this.audio || (this.audio = this.createElement());
    var self = this;
    a.onended = function () {
      self.next();
    };
    a.onerror = function () {
      // El manifiesto prometía el fichero: si falta, se salta el resto.
      self.next();
    };
    a.src = this.base + voiceId(text) + ".mp3";
    try {
      a.playbackRate = this.rate;
    } catch (e) {
      /* navegadores sin playbackRate: se oye a velocidad normal */
    }
    try {
      var p: any = a.play();
      if (p && p.catch) {
        p.catch(function () {
          // Autoplay bloqueado (aún sin gesto del niño): al TTS y a seguir.
          var rest = [text].concat(self.queue);
          self.queue = [];
          if (self.onFallback) self.onFallback(rest);
        });
      }
    } catch (e) {
      var rest2 = [text].concat(this.queue);
      this.queue = [];
      if (this.onFallback) this.onFallback(rest2);
    }
  }

  /**
   * Elemento de audio listo para sonar. Se cuelga del documento una
   * sola vez: los WebViews antiguos (Android 5) son más fiables con el
   * elemento en el DOM, y así es inspeccionable desde las herramientas.
   */
  private createElement(): HTMLAudioElement {
    var a = new Audio();
    a.setAttribute("data-garabati-voz", "1");
    try {
      document.body.appendChild(a);
    } catch (e) {
      /* sin body (tests/SSR): el elemento suelto sigue funcionando */
    }
    return a;
  }

  cancel(): void {
    this.queue = [];
    if (this.audio) {
      try {
        this.audio.pause();
      } catch (e) {
        /* noop */
      }
    }
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on) this.cancel();
  }

  /** Ritmo pausado 🐢: los clips ya se graban reposados, así que aquí
      solo se alargan un poco más (sin cambiar el tono). */
  setSlow(on: boolean): void {
    this.rate = on ? 0.88 : 1;
    if (this.audio) {
      try {
        this.audio.playbackRate = this.rate;
      } catch (e) {
        /* noop */
      }
    }
  }

  /**
   * Desbloquea el elemento `<audio>` en el primer toque del niño
   * (política de autoplay de Chrome/Android): reproduce un silencio
   * de 100 ms con volumen mínimo.
   */
  unlock(): void {
    if (!this.available || this.started) return;
    var self = this;
    try {
      // elemento aparte: el silencio no debe tocar el volumen de la voz
      var primer = new Audio();
      primer.src = this.base + "silencio.mp3";
      primer.volume = 0.01;
      var p: any = primer.play();
      var done = function (): void {
        self.started = true;
      };
      if (p && p.then) {
        p.then(done).catch(function () {
          /* bloqueado: se reintenta en el próximo toque */
        });
      } else {
        // Chromium 37: play() no devuelve promesa; se asume desbloqueado
        done();
      }
    } catch (e) {
      /* noop */
    }
  }
}
