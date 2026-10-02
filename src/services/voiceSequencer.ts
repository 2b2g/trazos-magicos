/* Cola de locuciones: garantiza que NINGUNA frase se corte.

   El problema real (hasta v0.6.0): cada `sayAll` cancelaba lo que
   estuviera sonando para "dar paso" a la frase nueva. Resultado: la
   instrucción se partía a media palabra ("Mírame. Yo lo hago a—")
   justo cuando el niño tenía que entenderla. Para un peque de 3–6
   años la voz ES la instrucción: una frase partida no comunica nada.

   Regla de oro: **la locución que ya está sonando siempre termina**.
   Lo que llega mientras tanto espera en cola y suena después, en
   orden. El tope de cola (`maxPending`) evita que un niño que toca
   todo muy rápido acumule medio minuto de voz: los avisos más viejos
   se descartan sin cortar el actual (los nuevos son los relevantes),
   y su `onDone` se dispara igual para no dejar colgado a quien lo
   esperaba.

   `cancel()` es la única interrupción legítima: salir de pantalla o
   silenciar el juego.

   Es lógica pura y testeable (sin DOM ni Audio): el proveedor real
   entra como `play` desde `services/audio.ts`. */

export interface VoiceJob {
  texts: string[];
  onDone: (() => void) | null;
}

/** Milisegundos de holgura por carácter del perro guardián.
    Un clip real dura ~90 ms por carácter; 130 ms + 6 s de margen solo
    salta si el proveedor nunca avisa de que terminó (WebView roto). */
var WATCHDOG_MS_PER_CHAR = 130;
var WATCHDOG_MS_BASE = 6000;

export class VoiceSequencer {
  /** Habla estas frases y llama a `done` al terminar (o al fallar). */
  private play: (texts: string[], done: () => void) => void;
  /** Locuciones que pueden esperar en cola antes de empezar a descartar. */
  private maxPending: number;
  private queue: VoiceJob[] = [];
  private current: VoiceJob | null = null;
  private watchdog: any = null;

  constructor(play: (texts: string[], done: () => void) => void, maxPending?: number) {
    this.play = play;
    this.maxPending = maxPending === undefined ? 2 : maxPending;
  }

  /** ¿Hay una locución sonando ahora mismo? */
  get busy(): boolean {
    return this.current !== null;
  }

  /** Frases esperando turno (sin contar la que suena). */
  get waiting(): number {
    return this.queue.length;
  }

  /**
   * Añade una locución a la cola.
   * @param onDone terminó de sonar (nunca se corta por otra locución).
   */
  enqueue(texts: string[], onDone?: () => void): void {
    if (!texts || !texts.length) {
      if (onDone) onDone();
      return;
    }
    this.queue.push({ texts: texts.slice(), onDone: onDone || null });
    // Tope: fuera lo más viejo sin sonar (jamás lo que está sonando).
    while (this.queue.length > this.maxPending) {
      var dropped = this.queue.shift();
      if (dropped && dropped.onDone) dropped.onDone();
    }
    if (!this.current) this.pump();
  }

  /** Arranca la siguiente locución de la cola. */
  private pump(): void {
    var job = this.queue.shift();
    if (!job) return;
    var self = this;
    this.current = job;
    var finished = false;
    var finish = function (): void {
      if (finished) return;
      finished = true;
      // Si mientras sonaba llegó un `cancel()`, la locución ya no cuenta:
      // ni encadena flujos ni arranca la siguiente.
      if (self.current !== job) return;
      if (self.watchdog !== null) {
        clearTimeout(self.watchdog);
        self.watchdog = null;
      }
      self.current = null;
      if (job.onDone) job.onDone();
      self.pump();
    };

    // Perro guardián: si el proveedor nunca avisa (TTS sin `onend` en
    // algún WebView), el juego no se queda mudo para siempre. Holgado
    // a propósito: nunca debe cortar una locución lenta de verdad.
    var chars = 0;
    for (var i = 0; i < job.texts.length; i++) chars += job.texts[i].length;
    this.watchdog = setTimeout(finish, WATCHDOG_MS_BASE + chars * WATCHDOG_MS_PER_CHAR);

    this.play(job.texts, finish);
  }

  /**
   * Interrumpe la locución en curso y vacía la cola (salir de pantalla
   * o silenciar). Los `onDone` pendientes no se llaman: quien cancela
   * ya no espera esa locución.
   */
  cancel(): void {
    if (this.watchdog !== null) {
      clearTimeout(this.watchdog);
      this.watchdog = null;
    }
    this.queue = [];
    this.current = null;
  }
}
