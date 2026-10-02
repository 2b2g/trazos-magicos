/* Catálogo de frases TTS (español). Datos, no código.
   La capa de audio puede sustituir TTS por MP3 usando estas claves. */

export const PHRASES = {
  // --- presentación de recursos
  welcome: "¡Hola! Soy Lapi, tu lápiz mágico. ¿Jugamos?",
  knowLetter: "Esta es la letra",
  knowNumber: "Vamos a dibujar el número",
  watchMe: "Mírame. Yo lo hago así.",
  nowYou: "Ahora hazla tú.",
  startStroke: "Empieza aquí.",
  followArrow: "Sigue la flechita.",

  // --- feedback por resultado
  excellent: "¡Excelente! ¡Lo has construido!",
  veryGood: "¡Muy bien! ¡Qué letra tan bonita!",
  good: "¡Bien hecho!",
  almost: "¡Casi! Inténtalo otra vez.",
  tryAgain: "Otra vez, tú puedes.",
  keepGoing: "¡Sigue así!",

  // --- números y conteo
  countWithMe: "Cuenta conmigo.",
  howMany: "¿Cuántas estrellas hay?",
  findNumber: "Encuentra el número",
  findLetter: "Encuentra la letra",

  // --- recompensas
  unlocked: "Has desbloqueado",
  magicStars: "¡Ganas estrellas mágicas!",

  // --- navegación
  chooseProfile: "¿Quién quiere jugar?",
  chooseActivity: "Elige una actividad.",
  /** Aviso amable al tocar un nodo bloqueado (nunca un regaño). */
  lockedNode: "Primero termina el de antes. ¡Tú puedes!",
  goodbye: "¡Hasta luego! ¡Vuelve pronto!",
} as const;

export type PhraseKey = keyof typeof PHRASES;

/** Palabras de los números para contar en voz alta con TTS. */
export const NUMBER_WORDS: string[] = [
  "cero", "uno", "dos", "tres", "cuatro",
  "cinco", "seis", "siete", "ocho", "nueve", "diez",
];

/** Mensajes de ánimo aleatorios (nunca punitivos, FDD §3 UX). */
export const CHEERS: string[] = [
  "¡Muy bien!",
  "¡Eres genial!",
  "¡Qué bien lo haces!",
  "¡Sigue así, campeón!",
  "¡Fantástico!",
];

export function randomCheer(): string {
  return CHEERS[Math.floor(Math.random() * CHEERS.length)];
}
