/* Locución por PASOS (la recompensa de `screens/activity.ts`).

   Cada paso dice una frase y, al terminarla, ejecuta lo que tenga que
   hacer: enseñar la siguiente estrella del conteo. El motivo es
   pedagógico y de diseño: **lo que se ve va pegado a lo que se oye**,
   así que "uno", "dos", "tres" y la estrella que aparece con cada
   palabra son lo mismo. Antes las estrellas salían con un escalón fijo
   de 0,28 s mientras la voz tardaba ~0,78 s por número, así que el
   conteo de la pantalla sacaba tres veces de ventaja a la locución.

   Dos garantías que ya daba la cola de voz y aquí se respetan:
   - **nada se pisa**: cada paso espera a que termine el anterior (la
     cola nunca corta una locución en curso);
   - **se corta sola**: si el niño se va o silencia el juego, la cadena
     para (`isAlive`) y no aparece ninguna estrella a destiempo.

   Es lógica pura: recibe el "locutor" (en el juego, `AudioService`), así
   que se prueba sin DOM ni audio reales. */

export interface VoiceStep {
  /** Frase del catálogo que dice este paso. */
  text: string;
  /** Qué muestra al terminar la frase (opcional). */
  then?: () => void;
}

/** Lo mínimo que necesita este encadenador (lo cumple `AudioService`). */
export interface VoiceSpeaker {
  sayAll(texts: string[], onDone?: () => void): void;
}

export interface VoiceStepsOptions {
  /** Mientras devuelva `false`, la cadena se detiene (el niño se fue). */
  isAlive?: () => boolean;
  /** Se llama cuando termina el último paso. */
  onEnd?: () => void;
}

/**
 * Dice los pasos en orden: el siguiente arranca solo cuando el
 * anterior ha terminado de sonar, y ejecuta su acción al terminar.
 * Los pasos vacíos se saltan sin romper la cadena.
 */
export function playVoiceSteps(
  speaker: VoiceSpeaker,
  steps: VoiceStep[],
  options?: VoiceStepsOptions
): void {
  var opts = options || {};
  var i = 0;
  if (!speaker || !steps || !steps.length) {
    if (opts.onEnd) opts.onEnd();
    return;
  }

  function next(): void {
    if (opts.isAlive && !opts.isAlive()) return;
    // se saltan frases vacías (una letra sin palabra de significado)
    while (i < steps.length && !(steps[i] && steps[i].text)) i++;
    if (i >= steps.length) {
      if (opts.onEnd) opts.onEnd();
      return;
    }
    var step = steps[i++];
    speaker.sayAll([step.text], function () {
      if (opts.isAlive && !opts.isAlive()) return;
      if (step.then) step.then();
      next();
    });
  }

  next();
}