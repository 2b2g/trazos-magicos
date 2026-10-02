#!/usr/bin/env node
/* ============================================================
   Generador de la voz de Garabati
   ============================================================
   Pre-renderiza UN MP3 por frase del juego y escribe el manifiesto
   (`src/content/voiceManifest.ts`) para que la app los reproduzca sin
   depender de ningún servicio en tiempo de ejecución.

   Uso:
     npm run voice:lines                      # ver todas las frases e ids
     npm run voice:generate -- --provider macos
     npm run voice:generate -- --provider elevenlabs --voice "SOFIA_ID"
     npm run voice:generate -- --provider openai --voice nova
     npm run voice:audition                   # muestras para elegir voz

   Opciones:
     --provider <macos|elevenlabs|openai|piper>   (por defecto macos)
     --voice <nombre|id>      voz del sistema o id del servicio
     --rate <palabras-min>    macos: ritmo de habla (por defecto 155; ojo:
                              `say` lo cuantiza, ver docs/VOICE.md §5)
     --pitch <factor>         macos/piper: tono (por defecto 1.06 = un
                              semitono arriba de la voz natural: cálido y claro)
     --lang <código>          piper/elevenlabs: idioma (es)
     --model <id>             piper: modelo .onnx | openai: gpt-4o-mini-tts
     --instructions <texto>   openai: estilo de la locución
     --limit <n>              generar solo las n primeras frases (pruebas)
     --concurrency <n>        peticiones en paralelo (APIs, por defecto 3)
     --force                  re-generar aunque el MP3 ya exista
     --dry-run                no llama a nada: muestra el plan
     --prune                  borra MP3 de frases que ya no existen
     --audition               macos: una muestra por voz disponible

   Variables de entorno para los servicios en la nube:
     ELEVENLABS_API_KEY, OPENAI_API_KEY
   ============================================================ */

import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import fs from "node:fs/promises";
import path from "node:path";

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VOICE_DIR = path.join(ROOT, "public", "voice");
const TMP_DIR = path.join(ROOT, ".voice");
const MANIFEST_TS = path.join(ROOT, "src", "content", "voiceManifest.ts");
// voz = habla: mono 22 kHz a 48 kbps suena limpia y pesa ~6 KB por segundo
const MP3_ARGS = ["-ac", "1", "-ar", "22050", "-b:a", "48k"];

/* ---------- argumentos ---------- */

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) out[a.slice(2)] = true;
      else {
        out[a.slice(2)] = next;
        i++;
      }
    } else out._.push(a);
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const has = (k) => args[k] !== undefined && args[k] !== false;
const val = (k, d) => (has(k) ? String(args[k]) : d);

const PROVIDER = val("provider", "macos");
/* Ritmo y tono que suenan los 303 MP3 del repositorio (ver docs/VOICE.md §5):
   155 es el bucket natural de `say` y 1.06 baja ~10 Hz la F0 de Paulina
   (183 → 173 Hz) sin perder energía en la banda de inteligibilidad. */
const RATE = Number(val("rate", 155));
const PITCH = Number(val("pitch", 1.06));
const DEFAULT_VOICE = "Paulina (Español (México))";
const LANG = val("lang", "es");
const CONCURRENCY = Math.max(1, Number(val("concurrency", 3)));
const LIMIT = has("limit") ? Number(args.limit) : 0;

/* ---------- catálogo de frases (compilado con esbuild) ---------- */

async function loadLines() {
  const esbuild = await import("esbuild");
  const outfile = path.join(TMP_DIR, "entry.mjs");
  await fs.mkdir(TMP_DIR, { recursive: true });
  await esbuild.build({
    entryPoints: [path.join(ROOT, "scripts", "voice-entry.ts")],
    outfile,
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node20",
    logLevel: "warning",
  });
  const mod = await import(pathToFileURL(outfile).href + "?t=" + Date.now());
  const lines = mod.collectVoiceLines();
  return lines.map((text) => ({ text, id: mod.voiceId(text) }));
}

/* ---------- utilidades ---------- */

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function sizeKB(bytes) {
  return Math.round(bytes / 1024) + " KB";
}

/** ffmpeg: WAV/AIFF → MP3 mono con tono y volumen normalizados. */
async function toMp3(input, output, { pitch = 1, rate = 22050 } = {}) {
  const filters = [];
  if (pitch !== 1) {
    filters.push(`asetrate=${rate}*${pitch}`, `aresample=${rate}`, `atempo=${1 / pitch}`);
  }
  filters.push("highpass=f=90", "loudnorm=I=-16:TP=-2:LRA=7");
  await run("ffmpeg", [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    input,
    "-af",
    `aformat=sample_rates=${rate},${filters.join(",")}`,
    ...MP3_ARGS,
    output,
  ]);
}

async function ffmpegAvailable() {
  try {
    await run("ffmpeg", ["-version"]);
    return true;
  } catch {
    return false;
  }
}

/* ---------- proveedores ---------- */

const providers = {
  /** Voces del sistema macOS: gratis, local y sin cuentas.
      Ideal para prototipar; revisa licencias antes de publicar. */
  async macos({ text, id }) {
    const voice = val("voice", DEFAULT_VOICE);
    const aiff = path.join(TMP_DIR, id + ".aiff");
    const out = path.join(VOICE_DIR, id + ".mp3");
    await run("say", ["-v", voice, "-r", String(RATE), "-o", aiff, text]);
    await toMp3(aiff, out, { pitch: PITCH });
    await fs.rm(aiff, { force: true });
  },

  /** ElevenLabs: las voces infantiles más expresivas del mercado.
      Multilingüe v2 mantiene el acento español y la calidez. */
  async elevenlabs({ text, id }) {
    const key = process.env.ELEVENLABS_API_KEY;
    if (!key) throw new Error("falta ELEVENLABS_API_KEY");
    const voiceId = val("voice", "EXAVITQu4vr4xnSDxMaL"); // Sarah (por defecto)
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_96`,
      {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          model_id: val("model", "eleven_multilingual_v2"),
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.8,
            style: 0.45,
            use_speaker_boost: true,
          },
        }),
      }
    );
    if (!res.ok) throw new Error(`elevenlabs ${res.status}: ${(await res.text()).slice(0, 160)}`);
    await fs.writeFile(path.join(VOICE_DIR, id + ".mp3"), Buffer.from(await res.arrayBuffer()));
  },

  /** OpenAI: baratísimo y con instrucciones de estilo ("voz de maestra
      de infantil, cálida y pausada"). */
  async openai({ text, id }) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("falta OPENAI_API_KEY");
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: val("model", "gpt-4o-mini-tts"),
        voice: val("voice", "nova"),
        input: text,
        response_format: "mp3",
        instructions: val(
          "instructions",
          "Habla en español como una maestra de infantil muy cariñosa: cálida, alegre y pausada, con articulación clara para niños de 3 a 6 años."
        ),
      }),
    });
    if (!res.ok) throw new Error(`openai ${res.status}: ${(await res.text()).slice(0, 160)}`);
    await fs.writeFile(path.join(VOICE_DIR, id + ".mp3"), Buffer.from(await res.arrayBuffer()));
  },

  /** Piper: 100 % offline y libre (modelos MIT/CC). Requiere instalar
      `piper` y descargar un modelo es_*.onnx. */
  async piper({ text, id }) {
    const model = val("model", "");
    if (!model) throw new Error("piper necesita --model /ruta/voz.onnx");
    const wav = path.join(TMP_DIR, id + ".wav");
    await new Promise((resolve, reject) => {
      const p = spawn("piper", ["--model", model, "--output_file", wav], { stdio: ["pipe", "ignore", "pipe"] });
      p.on("error", reject);
      p.on("close", (code) =>
        code === 0 ? resolve() : reject(new Error("piper terminó con código " + code))
      );
      p.stdin.end(text);
    });
    await toMp3(wav, path.join(VOICE_DIR, id + ".mp3"), { pitch: PITCH });
    await fs.rm(wav, { force: true });
  },
};

/* ---------- silencio de desbloqueo ---------- */

async function ensureSilence() {
  const out = path.join(VOICE_DIR, "silencio.mp3");
  if (await exists(out)) return;
  await run("ffmpeg", [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-f",
    "lavfi",
    "-i",
    "anullsrc=r=22050:cl=mono",
    "-t",
    "0.15",
    "-ac",
    "1",
    "-ar",
    "22050",
    "-b:a",
    "32k",
    out,
  ]);
  console.log("· creado public/voice/silencio.mp3 (desbloqueo de audio)");
}

/* ---------- manifiesto ---------- */

async function writeManifest(voiced) {
  const voice = val("voice", DEFAULT_VOICE);
  const body = `/* Manifiesto de audios pregrabados (GENERADO por
   \`npm run voice:generate\`; no editar a mano).

   Mientras \`ids\` esté vacío el juego usa la voz del sistema (TTS) y
   todo funciona igual. En cuanto haya clips, cada frase con audio se
   reproduce desde \`voice/<id>.mp3\` y el resto cae al TTS.

   Formato: id = voiceId(texto) → ver \`services/voiceId.ts\`. */

export interface VoiceManifest {
  /** Servicio o herramienta con el que se generaron los audios. */
  provider: string;
  /** Voz usada (nombre del sistema o id del servicio). */
  voice: string;
  /** Ids de los clips presentes en \`public/voice/\`. */
  ids: string[];
}

export const VOICE_MANIFEST: VoiceManifest = {
  provider: ${JSON.stringify(PROVIDER)},
  voice: ${JSON.stringify(voice)},
  ids: [
${voiced.map((id) => "    " + JSON.stringify(id) + ",").join("\n")}
  ],
};
`;
  await fs.writeFile(MANIFEST_TS, body, "utf8");
}

/* ---------- audiciones ---------- */

async function audition() {
  const sample = "¡Hola! Soy Lapi, tu lápiz mágico. ¿Jugamos? Dibujar es jugar.";
  const { stdout } = await run("say", ["-v", "?"]);
  const voices = [];
  for (const line of stdout.split("\n")) {
    const m = line.match(/^(.*?)\s+(es_ES|es_MX|es_AR|es_US)\s/);
    if (m) voices.push({ name: m[1].trim(), lang: m[2] });
  }
  const dir = path.join(TMP_DIR, "auditions");
  await fs.mkdir(dir, { recursive: true });
  for (const v of voices) {
    const safe = v.name.replace(/[^\w]+/g, "_");
    const aiff = path.join(dir, safe + ".aiff");
    const out = path.join(dir, safe + ".mp3");
    try {
      await run("say", ["-v", v.name, "-r", String(RATE), "-o", aiff, sample]);
      await toMp3(aiff, out, { pitch: PITCH });
      await fs.rm(aiff, { force: true });
      console.log(`· ${v.lang}  ${v.name}  →  ${path.relative(ROOT, out)}`);
    } catch (e) {
      console.log(`· ${v.name}: no disponible (${e.message.split("\n")[0]})`);
    }
  }
  console.log("\nEscucha las muestras en .voice/auditions y elige con --voice \"<nombre>\".");
}

/* ---------- principal ---------- */

function printPlan(selected) {
  for (const l of selected) console.log(`  ${l.id}  ←  ${l.text}`);
}

async function main() {
  const lines = await loadLines();
  const selected = LIMIT ? lines.slice(0, LIMIT) : lines;
  console.log(`Garabati · ${lines.length} frases en el catálogo (${selected.length} en esta pasada)`);

  if (has("lines")) {
    printPlan(selected);
    return;
  }
  if (has("audition")) return audition();
  if (has("dry-run")) {
    printPlan(selected);
    console.log(
      "\n--dry-run: no se llama a ningún proveedor." +
        ((await ffmpegAvailable()) ? "" : "  (aviso: ffmpeg no está disponible)")
    );
    return;
  }

  if (!(await ffmpegAvailable()) && PROVIDER !== "elevenlabs" && PROVIDER !== "openai") {
    throw new Error("este proveedor necesita ffmpeg en el PATH");
  }
  const generate = providers[PROVIDER];
  if (!generate) throw new Error("proveedor desconocido: " + PROVIDER);

  await fs.mkdir(VOICE_DIR, { recursive: true });
  await ensureSilence();

  const voiced = [];
  const failed = [];
  let skipped = 0;
  let bytes = 0;

  const queue = selected.slice();
  async function worker() {
    while (queue.length) {
      const item = queue.shift();
      if (!item) return;
      const file = path.join(VOICE_DIR, item.id + ".mp3");
      if (!has("force") && (await exists(file))) {
        skipped++;
        voiced.push(item.id);
        continue;
      }
      let lastError = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await generate(item);
          lastError = null;
          break;
        } catch (e) {
          lastError = e;
          if (PROVIDER === "macos" || PROVIDER === "piper") break; // local: no reintentar
          await new Promise((r) => setTimeout(r, 600 * attempt));
        }
      }
      if (lastError) {
        failed.push({ text: item.text, error: lastError.message.split("\n")[0] });
        console.log(`  ✗ ${item.text}\n    ${lastError.message.split("\n")[0]}`);
        continue;
      }
      voiced.push(item.id);
      bytes += (await fs.stat(file)).size;
      console.log(`  ✓ ${item.text}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // integridad: solo se anuncian clips que existen de verdad
  const present = [];
  for (const id of voiced) {
    if (await exists(path.join(VOICE_DIR, id + ".mp3"))) present.push(id);
  }
  present.sort();
  await writeManifest(present);

  if (has("prune")) {
    const known = new Set(present.concat(["silencio"]));
    const files = await fs.readdir(VOICE_DIR);
    let removed = 0;
    for (const f of files) {
      if (!f.endsWith(".mp3")) continue;
      if (!known.has(f.replace(/\.mp3$/, ""))) {
        await fs.rm(path.join(VOICE_DIR, f));
        removed++;
      }
    }
    if (removed) console.log(`· ${removed} MP3 huérfanos borrados`);
  }

  console.log(
    `\nListo: ${present.length}/${lines.length} frases con audio ` +
      `(${skipped} ya existían, ${sizeKB(bytes)} nuevos) · proveedor ${PROVIDER} · voz ${val("voice", DEFAULT_VOICE)} ` +
      `· rate ${RATE} · pitch ${PITCH}`
  );
  if (present.length < lines.length) {
    console.log(
      `Quedan ${lines.length - present.length} frases sin audio: suenan con la voz del sistema (respaldo).`
    );
  }
  if (failed.length) {
    console.log(`${failed.length} fallos — vuelve a lanzar el comando para reintentarlos.`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
