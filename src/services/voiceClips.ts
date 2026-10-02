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
  /** Final de la locución en curso (lo llama `next()` al vaciar la cola). */
  private done: (() => void) | null = null;
  /** ¿Hay una locución en curso? (evita avisos dobles de `onerror`). */
  private inLocution = false;

  /** Si un clip no puede sonar (autoplay bloqueado, fichero roto),
      el servicio de audio reintenta estas frases con TTS y avisa del
      final de la locución (`onDone`) para que la cola siga. */
  public onFallback: ((texts: string[], onDone?: () => void) => void) | null = null;

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
   * @param onDone termina de sonar la última frase (o el TTS de respaldo).
   * @returns `true` si se hizo cargo (el llamante no debe usar el TTS).
   */
  playAll(texts: string[], onDone?: () => void): boolean {
    if (!this.enabled || !this.available || !texts.length) return false;
    for (var i = 0; i < texts.length; i++) {
      if (!this.has(texts[i])) return false;
    }
    this.cancel();
    this.queue = texts.slice();
    this.done = onDone || null;
    this.inLocution = true;
    this.next();
    return true;
  }

  speakAll(texts: string[], onDone?: () => void): void {
    if (!this.playAll(texts, onDone)) {
      if (this.onFallback) this.onFallback(texts, onDone);
      else if (onDone) onDone();
    }
  }

  /** Termina la locución en curso (una sola vez). */
  private finish(): void {
    if (!this.inLocution) return;
    this.inLocution = false;
    var done = this.done;
    this.done = null;
    if (done) done();
  }

  /**
   * Un clip no pudo sonar (autoplay bloqueado, fichero roto): las
   * frases que quedan —incluida la actual— pasan al TTS de respaldo,
   * que avisará del final. Así el niño nunca se queda sin voz a medias.
   */
  private handOff(text: string): void {
    if (!this.inLocution) return; // aviso repetido: ya se salvó
    this.inLocution = false;
    var rest = [text].concat(this.queue);
    this.queue = [];
    var done = this.done;
    this.done = null;
    if (this.onFallback) this.onFallback(rest, done || undefined);
    else if (done) done();
  }

  private next(): void {
    const text = this.queue.shift();
    if (text === undefined) {
      // cola vacía: la locución completa terminó de sonar
      this.finish();
      return;
    }

    var a = this.audio || (this.audio = this.createElement());
    var self = this;
    a.onended = function () {
      self.next();
    };
    a.onerror = function () {
      // El manifiesto prometía el fichero: se intenta salvar con TTS.
      self.handOff(text);
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
          self.handOff(text);
        });
      }
    } catch (e) {
      this.handOff(text);
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
    this.inLocution = false;
    this.done = null;
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
