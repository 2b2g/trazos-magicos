/* Espera del PRIMER GESTO del niño (política de autoplay).

   El problema que resuelve (v0.8.1): antes de que el niño toque nada,
   los navegadores de escritorio y Android **rechazan** `play()`. El
   saludo de la pantalla de perfiles se pedía 400 ms después de arrancar,
   sin gesto previo, así que el `Audio` pregrabado se caía al respaldo de
   la Web Speech API: se oía la **voz del sistema** (en muchos Mac,
   masculina) en lugar de **Paulina**.

   Por eso el saludo ya no se pide al arrancar, sino **en el primer
   toque**: `audio.sayOnFirstGesture(...)` desbloquea el audio y pide la
   locución dentro del mismo gesto, que es cuando el navegador la deja
   sonar.

   Es lógica pura: recibe el objeto al que enganchar los escuchas
   (`window` en el juego, un doble en los tests), así que no necesita
   DOM para probarse. Los escuchas van en fase **capture** para ganar
   siempre al resto de manejadores de la pantalla. */

/** Escucha de gesto: recibe el evento original del navegador. */
export type GestureListener = (ev?: any) => void;

/** Objeto mínimo al que se enganchan los escuchas (`window`). */
export interface GestureTarget {
  addEventListener(type: string, fn: GestureListener, capture?: boolean): void;
  removeEventListener(type: string, fn: GestureListener, capture?: boolean): void;
}

/** Gestos que cuentan como "el niño ya tocó la pantalla". */
export const GESTURE_EVENTS: string[] = ["touchstart", "mousedown", "keydown"];

/**
 * Un solo disparo: al primer gesto llama al callback exactamente una
 * vez y se desengancha. Como mucho hay **una** espera viva a la vez
 * (es la pantalla de entrada del juego); un `arm()` nuevo sustituye a la
 * anterior, que se queda sin decir.
 */
export class FirstGestureGate {
  private target: GestureTarget | null;
  private waiting: GestureListener | null = null;
  private listener: GestureListener | null = null;

  /**
   * @param target objeto con `addEventListener`/`removeEventListener`
   *   (`window` en el juego). `null` en entornos sin DOM (tests de la
   *   cola de voz): la espera simplemente no se arma.
   */
  constructor(target?: GestureTarget | null) {
    this.target = target || null;
  }

  /** ¿Está esperando al primer gesto del niño? */
  get armed(): boolean {
    return this.listener !== null;
  }

  /**
   * Empieza a esperar el primer gesto.
   * @param onGesture se llama (una sola vez) con el evento original, ya
   *   con los escuchas desenganchados.
   */
  arm(onGesture: GestureListener): void {
    if (!this.target || !this.target.addEventListener) return;
    this.cancel(); // una espera viva y solo una
    var self = this;
    this.waiting = onGesture;
    this.listener = function (ev?: any): void {
      var cb = self.waiting;
      self.cancel();
      if (cb) cb(ev);
    };
    for (var i = 0; i < GESTURE_EVENTS.length; i++) {
      this.target.addEventListener(GESTURE_EVENTS[i], this.listener, true);
    }
  }

  /**
   * Olvida la espera (el niño ya no está en esa pantalla, o ya se dijo).
   * El callback pendiente no llega a ejecutarse nunca.
   */
  cancel(): void {
    if (this.listener && this.target && this.target.removeEventListener) {
      for (var i = 0; i < GESTURE_EVENTS.length; i++) {
        this.target.removeEventListener(GESTURE_EVENTS[i], this.listener, true);
      }
    }
    this.listener = null;
    this.waiting = null;
  }
}
