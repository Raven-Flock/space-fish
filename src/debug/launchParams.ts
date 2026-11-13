// QA launch flags shipped in live 69cf5be. R1 adds ?chapter=N&marker=M,
// ?seg-log=1, ?stop= and ?upgrades= here (AAA Phase 0.5); not in R0.
const PHASES = ["rescue", "base", "shooter", "stealth"];

/** ?phase=<name> starts that chapter; ?qa=1 starts the Rim without the intro. */
export function readLaunchPhase(search: string): string | null {
  const q = new URLSearchParams(search);
  const phase = q.get("phase");
  if (phase && PHASES.includes(phase)) return phase;
  if (q.get("qa") === "1") return "stealth";
  return null;
}
