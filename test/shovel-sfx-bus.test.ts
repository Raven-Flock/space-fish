// F-07 x PR #10 v0.3: the shovel SFX files play as decoded buffers on the SFX bus
// (no HTMLAudio, no .volume), round-robin a -> b -> c, +/-3% detune via playbackRate.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { AudioDirector } from "../src/audio/AudioDirector";
import { parseGapless } from "../src/audio/gapless";
import { REPO_ROOT } from "./helpers/liveOracle";
import { SHOVEL_SFX } from "../src/content/tuning/sfx";
import { installEnv, type Env } from "./helpers/fakeEnv";

const flush = async () => {
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
};
let env: Env | null = null;
afterEach(() => { env?.restore(); env = null; });
const starts = (kind: string) =>
  env!.audio.lines!.filter((l) => l.startsWith(`buf.start(sfx/shovel-${kind}-`)).map((l) => l.slice(`buf.start(sfx/shovel-${kind}-`.length, `buf.start(sfx/shovel-${kind}-`.length + 1));

describe("shovel SFX on the SFX bus (decoded buffers)", () => {
  it("round-robin with no immediate repeat, detune within +/-3%, nothing via HTMLAudio", async () => {
    env = installEnv({ seed: 3 });
    const a: any = new AudioDirector();
    a.unlock();
    for (let i = 0; i < 7; i++) { a.swing(); await flush(); } // cues are >= 0.55 s apart in play
    for (let i = 0; i < 4; i++) { a.tonk(); await flush(); }
    const sw = starts("swing");
    expect(sw).toEqual(["a", "b", "c", "a", "b", "c", "a"]);
    expect(starts("tonk")).toEqual(["a", "b", "c", "a"]);
    const rates = env.audio.lines!.filter((l) => l.startsWith("buf.start(sfx/")).map((l) => +(l.match(/rate=([\d.]+)/)?.[1] ?? 1));
    expect(rates.length).toBe(11);
    for (const r of rates) expect(Math.abs(r - 1)).toBeLessThanOrEqual(SHOVEL_SFX.detune + 1e-12);
    expect(env.audio.lines!.some((l) => l.startsWith("new Audio(") || l.startsWith("play("))).toBe(false);
  });
  it("nothing plays or loads before audio is unlocked", async () => {
    env = installEnv({ seed: 1 });
    const fetched: string[] = [];
    const f = (globalThis as any).fetch;
    (globalThis as any).fetch = (u: string) => { fetched.push(u); return f(u); };
    const a: any = new AudioDirector();
    a.swing();
    a.tonk();
    await flush();
    expect(fetched.filter((u) => u.startsWith("sfx/"))).toEqual([]);
    expect(env.audio.lines!.some((l) => l.includes("sfx/"))).toBe(false);
  });
  it("a cue whose buffer is ready more than 100 ms after it was asked for is dropped (QA-PR11-v0.1); 50 ms late still plays", async () => {
    env = installEnv({ seed: 3 });
    const a: any = new AudioDirector();
    a.unlock();
    await flush(); // primed at unlock
    expect(SHOVEL_SFX.lateSkipMs).toBe(100);
    const clock = { t: 0 };
    (globalThis as any).performance = { now: () => clock.t };
    let late = 0;
    const load = a.loadSfx.bind(a);
    a.loadSfx = (u: string) => load(u).then((d: any) => { clock.t = late; return d; });
    const n = () => env!.audio.lines!.filter((l) => l.startsWith("buf.start(sfx/")).length;
    clock.t = 0; late = 150; a.swing(); await flush();
    expect(n()).toBe(0);
    clock.t = 0; late = 50; a.swing(); await flush();
    expect(n()).toBe(1);
    clock.t = 0; late = 0; a.tonk(); await flush();
    expect(n()).toBe(2);
  });
  it("the six m4a files carry an edit list: 1024 priming samples at 48 kHz, lengths read from the file", () => {
    const want: Record<string, number> = { "swing-a": 9600, "swing-b": 10560, "swing-c": 8880, "tonk-a": 14400, "tonk-b": 15360, "tonk-c": 13440 };
    for (const [n, len] of Object.entries(want)) {
      const i = parseGapless(new Uint8Array(readFileSync(join(REPO_ROOT, "sfx", `shovel-${n}.m4a`))));
      expect([i.codec, i.fileRate, i.offset, i.nominal], n).toEqual(["aac", 48000, 1024, len]);
    }
  });
});
