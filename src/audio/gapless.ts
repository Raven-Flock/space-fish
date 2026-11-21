// Gapless loop points for decoded music (F-07, Sound SD-09).
// MP3 and AAC files start with encoder priming and end with padding. HTMLAudio `loop`
// wrapped the whole file, gaps and all. Web Audio loops sample-exactly between
// loopStart and loopEnd, so we read the file's own gapless header:
//   MP3: the LAME/Xing tag (encoder delay + padding; decoders add 529 samples of delay)
//   AAC: iTunSMPB (priming, padding, sample count), else the edit list (elst: priming
//        and music length). No metadata: loop the whole buffer, no guessing (Sound).
// Browsers differ on whether decodeAudioData already trims the priming, so the
// decoded length decides which case we are in.
import { AUDIO } from "../content/tuning/audio";

export interface GaplessInfo {
  codec: "mp3" | "aac" | "unknown";
  /** the file's own sample rate (priming/padding are counted in it), or null */
  fileRate: number | null;
  /** samples of priming before the music in an untrimmed decode */
  offset: number;
  /** samples an untrimmed decoder outputs, or null when unknown */
  total: number | null;
  /** samples of actual music, or null when unknown */
  nominal: number | null;
}

const ascii = (b: Uint8Array, i: number, n: number) => String.fromCharCode(...b.subarray(i, i + n));
const u32 = (b: Uint8Array, i: number) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
function find(b: Uint8Array, s: string, from = 0, to = b.length) {
  outer: for (let i = from; i <= Math.min(to, b.length) - s.length; i++) {
    for (let j = 0; j < s.length; j++) if (b[i + j] !== s.charCodeAt(j)) continue outer;
    return i;
  }
  return -1;
}

/** iTunSMPB: " 00000000 PPPPPPPP DDDDDDDD NNNNNNNNNNNNNNNN ..." (hex) */
function smpb(b: Uint8Array) {
  const p = find(b, "iTunSMPB");
  if (p < 0) return null;
  const m = ascii(b, p, 320).match(/([0-9A-Fa-f]{8}) ([0-9A-Fa-f]{8}) ([0-9A-Fa-f]{8}) ([0-9A-Fa-f]{16})/);
  if (!m) return null;
  const priming = parseInt(m[2], 16);
  const padding = parseInt(m[3], 16);
  const nominal = parseInt(m[4], 16);
  return { priming, padding, nominal };
}

function parseMp3(b: Uint8Array): GaplessInfo {
  let i = 0;
  if (ascii(b, 0, 3) === "ID3") {
    i = 10 + ((b[6] << 21) | (b[7] << 14) | (b[8] << 7) | b[9]) + (b[5] & 0x10 ? 10 : 0);
  }
  while (i < b.length - 4 && !(b[i] === 0xff && (b[i + 1] & 0xe0) === 0xe0)) i++;
  const v = (b[i + 1] >> 3) & 3; // 3 MPEG1, 2 MPEG2, 0 MPEG2.5
  const base = [44100, 48000, 32000][(b[i + 2] >> 2) & 3];
  const fileRate = base ? (v === 3 ? base : v === 2 ? base / 2 : base / 4) : null;
  const spf = v === 3 ? 1152 : 576; // Layer III samples per frame
  const tunes = smpb(b);
  if (tunes) {
    return { codec: "mp3", fileRate, offset: tunes.priming, total: tunes.priming + tunes.nominal + tunes.padding, nominal: tunes.nominal };
  }
  let x = find(b, "Xing", i, i + 64);
  if (x < 0) x = find(b, "Info", i, i + 64);
  if (x < 0) return { codec: "mp3", fileRate, offset: 0, total: null, nominal: null };
  const flags = u32(b, x + 4);
  let q = x + 8;
  let frames: number | null = null;
  if (flags & 1) { frames = u32(b, q); q += 4; }
  if (flags & 2) q += 4;
  if (flags & 4) q += 100;
  if (flags & 8) q += 4;
  const enc = ascii(b, q, 4);
  if (frames == null || !/^(LAME|Lavc|Lavf|GOGO|L3.9)/.test(enc)) {
    return { codec: "mp3", fileRate, offset: 0, total: frames == null ? null : frames * spf, nominal: null };
  }
  const delay = (b[q + 21] << 4) | (b[q + 22] >> 4);
  const padding = ((b[q + 22] & 0x0f) << 8) | b[q + 23];
  const total = frames * spf;
  return { codec: "mp3", fileRate, offset: delay + AUDIO.mp3DecoderDelay, total, nominal: total - delay - padding };
}

/** box timescale (mvhd/mdhd share the layout): version 0 at +16, version 1 at +24 */
const timescale = (b: Uint8Array, p: number) => (p < 0 ? 0 : u32(b, p + (b[p + 4] === 1 ? 24 : 16)));

function parseAac(b: Uint8Array): GaplessInfo {
  const fileRate = timescale(b, find(b, "mdhd")) || null;
  // frames in the track (stsz sample_count) x 1024 samples per AAC frame
  const z = find(b, "stsz");
  const total = z >= 0 ? u32(b, z + 12) * 1024 : null;
  const tunes = smpb(b);
  if (tunes) {
    return { codec: "aac", fileRate, offset: tunes.priming, total: tunes.priming + tunes.nominal + tunes.padding, nominal: tunes.nominal };
  }
  // edit list (ffmpeg/Apple): media_time = priming, segment_duration = music length
  const e = find(b, "elst");
  const movie = timescale(b, find(b, "mvhd"));
  if (e >= 0 && fileRate && movie) {
    const v1 = b[e + 4] === 1;
    const n = u32(b, e + 8);
    for (let k = 0, q = e + 12; k < n; k++, q += v1 ? 20 : 12) {
      const dur = v1 ? u32(b, q) * 2 ** 32 + u32(b, q + 4) : u32(b, q);
      const media = v1 ? u32(b, q + 8) * 2 ** 32 + u32(b, q + 12) : u32(b, q + 4) | 0;
      if (media < 0 || media === 0xffffffff) continue; // empty edit
      return { codec: "aac", fileRate, offset: media, total, nominal: Math.round((dur * fileRate) / movie) };
    }
  }
  return { codec: "aac", fileRate, offset: 0, total, nominal: null };
}

export function parseGapless(bytes: ArrayBuffer | Uint8Array): GaplessInfo {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (b.length >= 12 && ascii(b, 4, 4) === "ftyp") return parseAac(b);
  if (ascii(b, 0, 3) === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return parseMp3(b);
  return { codec: "unknown", fileRate: null, offset: 0, total: null, nominal: null };
}

/**
 * Loop points in seconds of the *decoded* buffer (Sound, Nov 18):
 * loopStart = end of the priming, loopEnd = end of the real music (the encoder's end
 * padding left out). Never trim twice: the decoded length says which decode we got.
 * - fully trimmed (length = the music: frames x samples-per-frame - delay - padding for
 *   MP3, the edit-list or iTunSMPB length for AAC): loopStart 0, loopEnd = buffer end;
 * - untrimmed (length = every frame): skip the priming, stop at the end of the music;
 * - start trimmed only (the padding kept): 0 to the end of the music.
 * With no gapless metadata: 0 to the buffer end, no guessing.
 */
export function loopPoints(info: GaplessInfo, bufferSec: number) {
  const rate = info.fileRate;
  if (!rate || info.nominal == null) return { loopStart: 0, loopEnd: bufferSec };
  const got = bufferSec * rate;
  let start = 0;
  let end = bufferSec;
  let best = Math.abs(got - info.nominal);
  if (info.total != null) {
    const untrimmed = Math.abs(got - info.total);
    const startOnly = Math.abs(got - (info.total - info.offset));
    if (untrimmed < best && untrimmed <= startOnly) {
      start = info.offset / rate;
      end = (info.offset + info.nominal) / rate;
    } else if (startOnly < best) {
      end = info.nominal / rate;
    }
  }
  const loopStart = Math.min(start, bufferSec);
  return { loopStart, loopEnd: Math.min(bufferSec, Math.max(loopStart, end)) };
}
